import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista leads com filtros simples por querystring:
//  ?buscaId=...&statusQual=...&statusCrm=...&minScore=...&q=...
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
    take: 500,
  });

  return NextResponse.json({ leads });
}
