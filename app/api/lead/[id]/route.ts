import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_CRM_VALID = new Set([
  "novo",
  "contatado",
  "reuniao",
  "proposta",
  "fechado",
]);

interface UpdatePayload {
  statusCrm?: string;
  proximoContato?: string | null;
  site?: string | null;
}

function normalizarUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  try {
    const u = new URL(v);
    if (!u.hostname || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as UpdatePayload;

  const data: Record<string, unknown> = {};
  let statusCrmChange: { de: string; para: string } | null = null;
  let siteChange: { de: string | null; para: string | null } | null = null;

  if ("site" in body) {
    if (body.site === null || body.site === "") {
      // Remover site cadastrado -> volta para sem_site
      data.site = null;
      data.statusQual = "sem_site";
      data.psiScore = null;
      data.psiLcpMs = null;
      data.psiInpMs = null;
      data.psiClsScore = null;
      data.hasHttps = null;
      data.hasMobileVp = null;
      data.safeMalware = null;
      data.ultimoErro = null;
      data.score = 75;
      data.qualifiedAt = null;
    } else if (typeof body.site === "string") {
      const url = normalizarUrl(body.site);
      if (!url) {
        return NextResponse.json(
          { error: "URL invalida (use http:// ou https://)" },
          { status: 400 },
        );
      }
      data.site = url;
      // Reseta qualificacao para que o worker re-analise
      data.statusQual = "pendente";
      data.psiScore = null;
      data.psiLcpMs = null;
      data.psiInpMs = null;
      data.psiClsScore = null;
      data.hasHttps = null;
      data.hasMobileVp = null;
      data.safeMalware = null;
      data.ultimoErro = null;
      data.score = 0;
      data.qualifiedAt = null;
    } else {
      return NextResponse.json(
        { error: "site invalido" },
        { status: 400 },
      );
    }
  }

  if (body.statusCrm) {
    if (!STATUS_CRM_VALID.has(body.statusCrm)) {
      return NextResponse.json(
        { error: "statusCrm invalido" },
        { status: 400 },
      );
    }
    data.statusCrm = body.statusCrm;
  }

  if ("proximoContato" in body) {
    if (body.proximoContato === null || body.proximoContato === "") {
      data.proximoContato = null;
    } else {
      const dt = new Date(body.proximoContato as string);
      if (Number.isNaN(dt.getTime())) {
        return NextResponse.json(
          { error: "proximoContato invalido" },
          { status: 400 },
        );
      }
      data.proximoContato = dt;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
  }

  try {
    // Se mudar statusCrm ou site, precisamos ler o anterior para registrar atividade
    if (data.statusCrm || "site" in data) {
      const atual = await prisma.lead.findUnique({
        where: { id },
        select: { statusCrm: true, site: true },
      });
      if (atual) {
        if (data.statusCrm && atual.statusCrm !== data.statusCrm) {
          statusCrmChange = {
            de: atual.statusCrm,
            para: String(data.statusCrm),
          };
        }
        if ("site" in data && atual.site !== data.site) {
          siteChange = {
            de: atual.site,
            para: (data.site as string | null) ?? null,
          };
        }
      }
    }

    const lead = await prisma.lead.update({ where: { id }, data });

    if (statusCrmChange) {
      await prisma.leadAtividade.create({
        data: {
          leadId: id,
          tipo: "status_crm_changed",
          descricao: `Status CRM: ${statusCrmChange.de} -> ${statusCrmChange.para}`,
        },
      });
    }

    if (siteChange) {
      const desc = siteChange.para
        ? siteChange.de
          ? `Site atualizado: ${siteChange.de} -> ${siteChange.para} (re-qualificacao agendada)`
          : `Site cadastrado manualmente: ${siteChange.para} (qualificacao agendada)`
        : `Site removido (era ${siteChange.de ?? "—"})`;
      await prisma.leadAtividade.create({
        data: {
          leadId: id,
          tipo: "site_alterado",
          descricao: desc,
        },
      });
    }

    return NextResponse.json({ lead });
  } catch (e) {
    // P2025 = "Record to update not found"
    const code = (e as { code?: string }).code;
    const status = code === "P2025" ? 404 : 500;
    return NextResponse.json(
      { error: (e as Error).message },
      { status },
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notas: { orderBy: { criadaEm: "desc" } },
      atividades: { orderBy: { criadaEm: "desc" }, take: 50 },
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "nao encontrado" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}
