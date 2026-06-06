/**
 * Worker de qualificacao.
 *
 * Loop infinito:
 *  1. busca leads com statusQual = 'pendente' (limite por lote)
 *  2. para cada um, em serie (concorrencia 1-2): probe HTTPS+viewport,
 *     PSI mobile, Safe Browsing
 *  3. calcula score (lib/scoring) e marca statusQual = 'analisado' ou 'erro'
 *  4. delay entre lotes
 *
 * Executa fora do Next: npm run worker
 */
import { prisma } from "../lib/db";
import { runPsi } from "../lib/psi";
import { checkSafeBrowsing, probeSite } from "../lib/safebrowsing";
import { computeScore } from "../lib/scoring";

// ---- carrega .env.local manualmente (sem dotenv para nao adicionar dep) ----
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    if (process.env[k]) continue;
    let v = vRaw.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}
loadEnvLocal();

const BATCH_SIZE = 5;
const CONCURRENCY = 2;
const BATCH_DELAY_MS = 4_000;
const EMPTY_QUEUE_DELAY_MS = 8_000;

async function qualifyOne(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;
  if (!lead.site) {
    // Defensivo: leads sem site deveriam ja estar como sem_site
    await prisma.lead.update({
      where: { id: lead.id },
      data: { statusQual: "sem_site", score: 75, qualifiedAt: new Date() },
    });
    return;
  }

  const url = lead.site;
  console.log(`[worker] qualificando lead=${lead.id} site=${url}`);

  let hasHttps: boolean | null = null;
  let hasMobileVp: boolean | null = null;
  let psiScore: number | null = null;
  let psiLcp: number | null = null;
  let psiInp: number | null = null;
  let psiCls: number | null = null;
  let safeThreat = false;
  let erros: string[] = [];
  let probeOk = false;
  let psiOk = false;
  let safeOk = false;

  // probe basico — probeSite nao lanca (retorna { ok: false } em falha)
  try {
    const probe = await probeSite(url);
    hasHttps = probe.hasHttps;
    hasMobileVp = probe.hasMobileVp;
    probeOk = probe.ok;
    if (!probe.ok) erros.push("probe: site nao respondeu");
  } catch (e) {
    erros.push(`probe: ${(e as Error).message}`);
  }

  // PSI
  try {
    const psi = await runPsi(url);
    psiScore = psi.score;
    psiLcp = psi.lcpMs;
    psiInp = psi.inpMs;
    psiCls = psi.cls;
    psiOk = psi.ok;
  } catch (e) {
    erros.push(`psi: ${(e as Error).message}`);
  }

  // Safe Browsing
  try {
    const sb = await checkSafeBrowsing(url);
    safeThreat = sb.threat;
    safeOk = true;
  } catch (e) {
    erros.push(`safe: ${(e as Error).message}`);
  }

  // Erro real = nenhum sinal pode ser coletado
  const allFailed = !probeOk && !psiOk && !safeOk;

  const score = computeScore({
    psiScore,
    hasHttps,
    hasMobileVp,
    safeThreat,
    hasError: allFailed,
  });

  const status = allFailed ? "erro" : "analisado";

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      hasHttps,
      hasMobileVp,
      psiScore,
      psiLcpMs: psiLcp,
      psiInpMs: psiInp,
      psiClsScore: psiCls,
      safeMalware: safeThreat,
      score,
      statusQual: status,
      ultimoErro: erros.length ? erros.join(" | ") : null,
      qualifiedAt: new Date(),
    },
  });

  console.log(
    `[worker] -> lead=${lead.id} status=${status} score=${score} psi=${psiScore} https=${hasHttps} mobile=${hasMobileVp} threat=${safeThreat}`,
  );
}

async function processBatch(): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { statusQual: "pendente" },
    take: BATCH_SIZE,
    orderBy: { createdAt: "asc" },
  });

  if (leads.length === 0) return 0;

  // processa em chunks de CONCURRENCY
  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((l) => qualifyOne(l.id)));
  }

  return leads.length;
}

async function main() {
  console.log("[worker] iniciando loop");
  let stopping = false;
  process.on("SIGINT", () => {
    console.log("[worker] SIGINT recebido, finalizando...");
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });

  while (!stopping) {
    try {
      const processed = await processBatch();
      if (processed === 0) {
        await new Promise((r) => setTimeout(r, EMPTY_QUEUE_DELAY_MS));
      } else {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    } catch (e) {
      console.error("[worker] erro no loop:", e);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }

  await prisma.$disconnect();
  console.log("[worker] encerrado");
}

main();
