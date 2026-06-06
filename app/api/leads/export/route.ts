import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Escapa um campo para CSV RFC 4180: envolve em aspas se tem ", , ou \n
// e duplica aspas internas.
function csvField(value: unknown): string {
  if (value == null) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "boolean") {
    s = value ? "sim" : "nao";
  } else {
    s = String(value);
  }
  if (/[",\n;]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADERS = [
  "Empresa",
  "Categoria",
  "Site",
  "Telefone",
  "Endereco",
  "Distancia (km)",
  "Score",
  "Status Qual",
  "Status CRM",
  "Rating",
  "Reviews",
  "Instagram",
  "Facebook",
  "Proximo Contato",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const buscaId = searchParams.get("buscaId");
  const statusQual = searchParams.get("statusQual");
  const statusCrm = searchParams.get("statusCrm");
  const minScore = searchParams.get("minScore");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (buscaId) where.buscaId = buscaId;
  if (statusQual) where.statusQual = statusQual;
  if (statusCrm) where.statusCrm = statusCrm;
  if (minScore) where.score = { gte: Number(minScore) };
  if (q) {
    where.OR = [
      { nome: { contains: q } },
      { categoria: { contains: q } },
      { endereco: { contains: q } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 5000,
  });

  const lines: string[] = [HEADERS.join(",")];
  for (const l of leads) {
    lines.push(
      [
        csvField(l.nome),
        csvField(l.categoria),
        csvField(l.site),
        csvField(l.telefone),
        csvField(l.endereco),
        csvField(l.distanciaKm != null ? l.distanciaKm.toFixed(2) : ""),
        csvField(l.score),
        csvField(l.statusQual),
        csvField(l.statusCrm),
        csvField(l.rating != null ? l.rating.toFixed(1) : ""),
        csvField(l.totalReviews ?? ""),
        csvField(l.instagram ?? ""),
        csvField(l.facebook ?? ""),
        csvField(l.proximoContato),
      ].join(","),
    );
  }

  // BOM UTF-8 para Excel abrir com acentos corretos
  const body = "﻿" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `leadpronto-leads-${stamp}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
