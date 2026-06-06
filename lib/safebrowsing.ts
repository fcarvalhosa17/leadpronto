const SB_URL =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY || "";

export interface SafeBrowsingResult {
  /** true se a URL foi marcada como ameaca */
  threat: boolean;
  /** Tipo da ameaca quando houver (MALWARE, SOCIAL_ENGINEERING, etc.) */
  threatType?: string;
}

/**
 * Consulta Safe Browsing v4 para uma URL.
 * Retorna { threat: false } quando sem match.
 */
export async function checkSafeBrowsing(
  url: string,
): Promise<SafeBrowsingResult> {
  if (!API_KEY) {
    throw new Error("GOOGLE_SAFE_BROWSING_API_KEY ausente no .env.local");
  }

  const body = {
    client: { clientId: "leadpronto", clientVersion: "0.1.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${SB_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Safe Browsing HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      matches?: Array<{ threatType: string }>;
    };

    if (data.matches && data.matches.length > 0) {
      return { threat: true, threatType: data.matches[0].threatType };
    }
    return { threat: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Heuristica leve: testa HTTPS e procura por <meta name="viewport"> indicando
 * site adaptado para mobile. Usa fetch direto (sem Playwright).
 */
export interface SiteProbe {
  hasHttps: boolean;
  hasMobileVp: boolean;
  ok: boolean;
  finalUrl: string;
}

export async function probeSite(url: string): Promise<SiteProbe> {
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      },
    });

    const finalUrl = res.url || target;
    const hasHttps = finalUrl.startsWith("https://");

    const ct = res.headers.get("content-type") || "";
    let hasMobileVp = false;
    if (ct.includes("text/html")) {
      // Le no maximo 64 KB pra detectar a tag
      const reader = res.body?.getReader();
      if (reader) {
        let received = 0;
        let html = "";
        const decoder = new TextDecoder();
        while (received < 65_536) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          received += value.length;
          if (/<meta[^>]+name=["']viewport["']/i.test(html)) {
            hasMobileVp = true;
            break;
          }
        }
        await reader.cancel().catch(() => undefined);
      }
    }

    return { hasHttps, hasMobileVp, ok: res.ok, finalUrl };
  } catch {
    return { hasHttps: false, hasMobileVp: false, ok: false, finalUrl: target };
  } finally {
    clearTimeout(timer);
  }
}
