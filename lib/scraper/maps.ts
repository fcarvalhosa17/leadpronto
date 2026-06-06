import { chromium, type Browser, type Page } from "playwright";
import type { LatLng, ScrapedPlace } from "../types";
import { haversineKm } from "../haversine";

interface ScrapeOptions {
  nicho: string;
  centro: LatLng;
  raioKm: number;
  /** Maximo de cards a coletar antes de parar o scroll. Default 80. */
  maxCards?: number;
  /** Timeout total da operacao em ms. Default 120000. */
  timeoutMs?: number;
  /** Se true, abre janela visivel (debug). */
  headful?: boolean;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function randomDelay(min = 800, max = 2000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function buildSearchUrl(nicho: string, centro: LatLng): string {
  const q = encodeURIComponent(nicho);
  // hl=pt-BR forca lingua portuguesa, gl=BR forca regiao Brasil
  return `https://www.google.com/maps/search/${q}/@${centro.lat},${centro.lng},14z?hl=pt-BR&gl=BR`;
}

/**
 * Aceita banner de consentimento de cookies do Google se aparecer.
 * Em maps.google.com pt-BR o botao costuma ter o texto "Aceitar tudo" ou
 * "Rejeitar tudo". Aceitar para nao bloquear o feed.
 */
async function dismissConsent(page: Page): Promise<void> {
  try {
    const button = page
      .locator("button")
      .filter({ hasText: /aceitar tudo|rejeitar tudo|accept all|reject all/i })
      .first();
    await button.click({ timeout: 4000 });
    await randomDelay(500, 1200);
  } catch {
    // sem banner, segue
  }
}

/**
 * Faz scroll no painel lateral de resultados ate atingir maxCards ou o
 * indicador de fim ("Voce chegou ao fim da lista").
 */
async function scrollFeed(
  page: Page,
  maxCards: number,
  startedAt: number,
  timeoutMs: number,
): Promise<void> {
  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 30000 });

  let prevCount = 0;
  let stagnant = 0;
  const maxStagnantRounds = 4;

  while (Date.now() - startedAt < timeoutMs) {
    const count = await page.locator(`${feedSelector} > div > a[href*="/maps/place/"]`).count();
    if (count >= maxCards) return;

    // verifica indicador de fim
    const endVisible = await page
      .locator("text=/voce chegou ao fim|you've reached the end/i")
      .first()
      .isVisible()
      .catch(() => false);
    if (endVisible) return;

    if (count === prevCount) {
      stagnant++;
      if (stagnant >= maxStagnantRounds) return;
    } else {
      stagnant = 0;
      prevCount = count;
    }

    await page.evaluate((sel) => {
      const feed = document.querySelector(sel);
      if (feed) feed.scrollBy(0, feed.clientHeight * 0.9);
    }, feedSelector);

    await randomDelay(900, 1700);
  }
}

/**
 * Extrai dados de todos os cards atualmente no feed.
 * Os campos vem do markup do card de listagem (rapido, sem clicar em cada um).
 * Site/telefone podem nao estar no card — quando ausentes, ficam undefined.
 */
async function extractCards(page: Page): Promise<ScrapedPlace[]> {
  return page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (!feed) return [];

    const cards = Array.from(
      feed.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]'),
    );

    const seen = new Set<string>();
    const out: Array<{
      placeId: string;
      nome: string;
      categoria?: string;
      endereco?: string;
      telefone?: string;
      site?: string;
      lat?: number;
      lng?: number;
    }> = [];

    for (const a of cards) {
      const href = a.getAttribute("href") || "";
      // place_id (ou cid) vem na URL como !19sChIJ... ou apos !1s
      const placeIdMatch = href.match(/!1s([^!]+)/);
      const placeId = placeIdMatch ? placeIdMatch[1] : href.split("?")[0];
      if (seen.has(placeId)) continue;
      seen.add(placeId);

      // lat/lng aparecem em !3d<lat>!4d<lng>
      const latMatch = href.match(/!3d(-?\d+\.\d+)/);
      const lngMatch = href.match(/!4d(-?\d+\.\d+)/);
      const lat = latMatch ? Number(latMatch[1]) : undefined;
      const lng = lngMatch ? Number(lngMatch[1]) : undefined;

      const nome = a.getAttribute("aria-label")?.trim() || "";
      if (!nome) continue;

      // o card container costuma ser o parent do anchor
      const card = a.closest("div");
      const cardText = card?.textContent || "";

      // categoria/endereco/telefone aparecem em divs aria-hidden ao redor
      // Padrao tipico no card: linhas separadas, telefone com (xx)
      const phoneMatch = cardText.match(
        /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/,
      );
      const telefone = phoneMatch ? phoneMatch[0].trim() : undefined;

      // site: dentro do card costuma haver um link externo com role=link
      // alem do anchor principal do maps
      let site: string | undefined;
      const links = card?.querySelectorAll<HTMLAnchorElement>("a[href]");
      if (links) {
        for (const l of links) {
          const h = l.getAttribute("href") || "";
          if (
            h.startsWith("http") &&
            !h.includes("google.com") &&
            !h.includes("/maps/")
          ) {
            site = h;
            break;
          }
        }
      }

      // categoria + endereco aparecem em spans dentro do card
      // estrategia: pegar primeiros 2 spans nao-vazios depois do nome
      const spans = Array.from(
        card?.querySelectorAll<HTMLElement>("span") || [],
      )
        .map((s) => (s.textContent || "").trim())
        .filter(Boolean);

      let categoria: string | undefined;
      let endereco: string | undefined;
      for (const txt of spans) {
        if (txt === nome) continue;
        if (txt.includes("·") || txt.includes("•")) {
          // linha "Categoria · Endereco" ou "Avaliacao · N reviews"
          const parts = txt.split(/\s*[·•]\s*/);
          if (!categoria && parts[0] && parts[0].length < 60) {
            categoria = parts[0];
          }
          if (!endereco && parts[1] && parts[1].length > 5) {
            endereco = parts[1];
          }
        } else if (!categoria && txt.length < 50 && !/^\d/.test(txt)) {
          categoria = txt;
        } else if (
          !endereco &&
          (txt.includes(",") || /\d/.test(txt)) &&
          txt.length > 8
        ) {
          endereco = txt;
        }
        if (categoria && endereco) break;
      }

      out.push({
        placeId,
        nome,
        categoria,
        endereco,
        telefone,
        site,
        lat,
        lng,
      });
    }

    return out;
  });
}

/**
 * Scraping principal. Retorna places ja filtrados por raio (haversine) e
 * deduplicados por placeId.
 */
export async function scrapeMaps(
  options: ScrapeOptions,
): Promise<ScrapedPlace[]> {
  const {
    nicho,
    centro,
    raioKm,
    maxCards = 80,
    timeoutMs = 120_000,
    headful = false,
  } = options;

  const startedAt = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: !headful,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: "pt-BR",
      viewport: { width: 1366, height: 900 },
      timezoneId: "America/Sao_Paulo",
    });

    const page = await context.newPage();

    const url = buildSearchUrl(nicho, centro);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

    await dismissConsent(page);
    await randomDelay(1200, 2200);

    await scrollFeed(page, maxCards, startedAt, timeoutMs);
    const raw = await extractCards(page);

    // Filtro por raio (haversine) quando temos lat/lng
    const filtered: ScrapedPlace[] = [];
    const seen = new Set<string>();
    for (const p of raw) {
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);

      let dist: number | undefined;
      if (p.lat != null && p.lng != null) {
        dist = haversineKm(centro, { lat: p.lat, lng: p.lng });
        if (dist > raioKm) continue;
      }

      filtered.push(p);
    }

    return filtered;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
