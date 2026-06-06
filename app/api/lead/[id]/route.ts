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
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as UpdatePayload;

  const data: Record<string, unknown> = {};
  let statusCrmChange: { de: string; para: string } | null = null;

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
    // Se mudar statusCrm, precisamos ler o anterior para registrar atividade
    if (data.statusCrm) {
      const atual = await prisma.lead.findUnique({
        where: { id },
        select: { statusCrm: true },
      });
      if (atual && atual.statusCrm !== data.statusCrm) {
        statusCrmChange = { de: atual.statusCrm, para: String(data.statusCrm) };
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
