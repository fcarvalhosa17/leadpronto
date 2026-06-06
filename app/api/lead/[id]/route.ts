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
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as UpdatePayload;

  const data: Record<string, unknown> = {};
  if (body.statusCrm) {
    if (!STATUS_CRM_VALID.has(body.statusCrm)) {
      return NextResponse.json(
        { error: "statusCrm invalido" },
        { status: 400 },
      );
    }
    data.statusCrm = body.statusCrm;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json({ lead });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 404 },
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "nao encontrado" }, { status: 404 });
  }
  return NextResponse.json({ lead });
}
