import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotaPayload {
  texto?: unknown;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });
  }

  const notas = await prisma.leadNota.findMany({
    where: { leadId: id },
    orderBy: { criadaEm: "desc" },
  });
  return NextResponse.json({ notas });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as NotaPayload;

  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json(
      { error: "texto obrigatorio" },
      { status: 400 },
    );
  }
  if (texto.length > 2000) {
    return NextResponse.json(
      { error: "texto muito longo (max 2000)" },
      { status: 400 },
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });
  }

  const nota = await prisma.leadNota.create({
    data: { leadId: id, texto },
  });

  await prisma.leadAtividade.create({
    data: {
      leadId: id,
      tipo: "nota_adicionada",
      descricao: texto.length > 80 ? `${texto.slice(0, 80)}...` : texto,
    },
  });

  return NextResponse.json({ nota }, { status: 201 });
}
