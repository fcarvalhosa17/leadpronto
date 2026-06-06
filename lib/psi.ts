const PSI_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const API_KEY = process.env.GOOGLE_PSI_API_KEY || "";

export interface PsiResult {
  /** Score 0-100 do Lighthouse Performance */
  score: number | null;
  /** Largest Contentful Paint em ms */
  lcpMs: number | null;
  /** Interaction to Next Paint em ms (CrUX, pode ser nulo) */
  inpMs: number | null;
  /** Cumulative Layout Shift */
  cls: number | null;
  /** True se conseguiu carregar (https valido) */
  ok: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Chama PageSpeed Insights (estrategia mobile).
 * Faz retry com backoff em 429 / 5xx.
 */
export async function runPsi(url: string): Promise<PsiResult> {
  if (!API_KEY) {
    throw new Error("GOOGLE_PSI_API_KEY ausente no .env.local");
  }

  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
    key: API_KEY,
  });

  const fullUrl = `${PSI_URL}?${params.toString()}`;
  const maxAttempts = 3;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60_000);
      const res = await fetch(fullUrl, { signal: ctrl.signal });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        const backoff = 2_000 * 2 ** (attempt - 1); // 2s, 4s, 8s
        await sleep(backoff);
        lastErr = new Error(`PSI HTTP ${res.status}`);
        continue;
      }

      if (!res.ok) {
        // 400/403 etc — quase sempre site nao acessivel
        return { ok: false, score: null, lcpMs: null, inpMs: null, cls: null };
      }

      const data = (await res.json()) as PsiPayload;
      return extract(data);
    } catch (e) {
      lastErr = e as Error;
      const backoff = 2_000 * 2 ** (attempt - 1);
      await sleep(backoff);
    }
  }

  throw lastErr || new Error("PSI falhou");
}

interface PsiPayload {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } };
    audits?: {
      "largest-contentful-paint"?: { numericValue?: number };
      "cumulative-layout-shift"?: { numericValue?: number };
    };
  };
  loadingExperience?: {
    metrics?: {
      INTERACTION_TO_NEXT_PAINT?: { percentile?: number };
      EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT?: { percentile?: number };
    };
  };
}

function extract(data: PsiPayload): PsiResult {
  const perfScore = data.lighthouseResult?.categories?.performance?.score;
  const lcp = data.lighthouseResult?.audits?.["largest-contentful-paint"]
    ?.numericValue;
  const cls = data.lighthouseResult?.audits?.["cumulative-layout-shift"]
    ?.numericValue;

  const inpMetric =
    data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT ||
    data.loadingExperience?.metrics?.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT;

  return {
    ok: true,
    score: perfScore != null ? Math.round(perfScore * 100) : null,
    lcpMs: lcp != null ? Math.round(lcp) : null,
    cls: cls != null ? Number(cls.toFixed(3)) : null,
    inpMs: inpMetric?.percentile != null ? inpMetric.percentile : null,
  };
}
