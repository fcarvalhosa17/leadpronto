import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/geocode";
import { scrapeMaps } from "@/lib/scraper/maps";
import { haversineKm } from "@/lib/haversine";

// Necessario porque Playwright nao roda no Edge runtime
export const runtime = "nodejs";
// API e dinamica por natureza (escreve no DB)
export const dynamic = "force-dynamic";

interface BuscaPayload {
  nicho?: unknown;
  regiao?: unknown;
  raioKm?: unknown;
}

function validatePayload(body: BuscaPayload): {
  nicho: string;
  regiao: string;
  raioKm: number;
} {
  const nicho = typeof body.nicho === "string" ? body.nicho.trim() : "";
  const regiao = typeof body.regiao === "string" ? body.regiao.trim() : "";
  const raioKm =
    typeof body.raioKm === "number"
      ? body.raioKm
      : Number((body.raioKm as string) ?? NaN);

  if (!nicho) throw new Error("nicho obrigatorio");
  if (!regiao) throw new Error("regiao obrigatoria");
  if (!Number.isFinite(raioKm) || raioKm <= 0 || raioKm > 50) {
    throw new Error("raioKm deve ser entre 1 e 50");
  }

  return { nicho, regiao, raioKm: Math.round(raioKm) };
}

export async function POST(req: Request) {
  let payload;
  try {
    const body = (await req.json()) as BuscaPayload;
    payload = validatePayload(body);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }

  const { nicho, regiao, raioKm } = payload;

  try {
    // 1. Geocoding
    const centro = await geocode(regiao);

    // 2. Scraping
    const places = await scrapeMaps({
      nicho,
      centro,
      raioKm,
      maxCards: 80,
      timeoutMs: 180_000,
      // abre detalhe dos 10 primeiros para enriquecer com redes sociais e claimed
      enrichDetailsCount: 10,
    });

    // 3. Cria registro da busca
    const busca = await prisma.busca.create({
      data: {
        nicho,
        regiao,
        raioKm,
        lat: centro.lat,
        lng: centro.lng,
        totalLeads: places.length,
      },
    });

    // 4. Upsert dos leads
    // Sem site -> status_qual = sem_site, score = 75 (regra da spec)
    const leadOps = places.map((p) => {
      const distanciaKm =
        p.lat != null && p.lng != null
          ? haversineKm(centro, { lat: p.lat, lng: p.lng })
          : null;

      const semSite = !p.site || p.site.trim() === "";

      return prisma.lead.upsert({
        where: { placeId: p.placeId },
        create: {
          placeId: p.placeId,
          buscaId: busca.id,
          nome: p.nome,
          categoria: p.categoria,
          endereco: p.endereco,
          telefone: p.telefone,
          site: p.site,
          lat: p.lat,
          lng: p.lng,
          distanciaKm,
          rating: p.rating,
          totalReviews: p.totalReviews,
          horario: p.horario,
          instagram: p.instagram,
          facebook: p.facebook,
          claimed: p.claimed,
          statusQual: semSite ? "sem_site" : "pendente",
          score: semSite ? 75 : 0,
          qualifiedAt: semSite ? new Date() : null,
        },
        update: {
          // Reassocia a busca corrente mas preserva qualificacao previa
          buscaId: busca.id,
          nome: p.nome,
          categoria: p.categoria ?? undefined,
          endereco: p.endereco ?? undefined,
          telefone: p.telefone ?? undefined,
          site: p.site ?? undefined,
          lat: p.lat ?? undefined,
          lng: p.lng ?? undefined,
          distanciaKm: distanciaKm ?? undefined,
          rating: p.rating ?? undefined,
          totalReviews: p.totalReviews ?? undefined,
          horario: p.horario ?? undefined,
          instagram: p.instagram ?? undefined,
          facebook: p.facebook ?? undefined,
          claimed: p.claimed ?? undefined,
        },
      });
    });

    const leads = await prisma.$transaction(leadOps);

    return NextResponse.json({
      buscaId: busca.id,
      totalLeads: leads.length,
      leads,
    });
  } catch (e) {
    console.error("[/api/busca] erro:", e);
    return NextResponse.json(
      { error: (e as Error).message || "Erro interno" },
      { status: 500 },
    );
  }
}

// GET retorna ultimas buscas (para a UI mostrar historico se quiser)
export async function GET() {
  const buscas = await prisma.busca.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ buscas });
}
