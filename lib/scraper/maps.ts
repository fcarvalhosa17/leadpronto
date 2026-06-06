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
  /**
   * Quantos places terao detalhe aberto para extrair instagram/facebook/claimed.
   * 0 desliga o enriquecimento. Default 0 para nao impactar o tempo total.
   * Cada place adiciona ~3-5s.
   */
  enrichDetailsCount?: number;
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
      rating?: number;
      totalReviews?: number;
      horario?: string;
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

      // Rating + totalReviews: o Google usa aria-label tipo
      // "4,2 estrelas 87 avaliacoes" ou "4.2 stars 87 reviews". Tambem pode
      // aparecer como texto "4,2 (87)" dentro de um span.
      let rating: number | undefined;
      let totalReviews: number | undefined;

      const ratedEl = card?.querySelector('[aria-label*="estrela" i], [aria-label*="star" i]');
      const ratedAria = ratedEl?.getAttribute("aria-label") || "";
      if (ratedAria) {
        // aceita "4,2" ou "4.2"
        const rMatch = ratedAria.match(/(\d+[.,]\d+)/);
        if (rMatch) rating = Number(rMatch[1].replace(",", "."));
        // numero de reviews: primeiro inteiro depois do rating
        const reviewsMatch = ratedAria.match(/(\d{1,3}(?:[\.,]\d{3})*)\s*(?:avalia|review)/i);
        if (reviewsMatch) {
          totalReviews = Number(reviewsMatch[1].replace(/[\.,]/g, ""));
        }
      }

      // Fallback: padrao "4,2(87)" ou "4.2 (87)" no texto do card
      if (rating == null) {
        const txtMatch = cardText.match(/(\d+[.,]\d)\s*[\(\s]?\((\d+(?:\.\d{3})*)\)/);
        if (txtMatch) {
          rating = Number(txtMatch[1].replace(",", "."));
          totalReviews = Number(txtMatch[2].replace(/\./g, ""));
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
      let horario: string | undefined;
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

        // horario: texto contendo "Aberto"/"Fechado"/"Abre as"/"Fecha as"
        if (
          !horario &&
          /aberto|fechado|abre|fecha|24\s*horas|open|closes|opens/i.test(txt) &&
          txt.length < 80
        ) {
          horario = txt;
        }

        if (categoria && endereco && horario) break;
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
        rating,
        totalReviews,
        horario,
      });
    }

    return out;
  });
}

/**
 * Opcionalmente abre o detalhe de cada place no painel lateral para extrair
 * links de Instagram/Facebook e badge "Reivindicado". Trabalha em best-effort:
 * qualquer falha por place e silenciada e o place segue sem o enriquecimento.
 *
 * Para nao explodir o tempo total, limita-se a `maxPlaces` aberturas (ordem
 * = primeiros do feed) e tem timeout curto por place.
 */
async function enrichWithPlaceDetails(
  page: Page,
  places: ScrapedPlace[],
  maxPlaces: number,
): Promise<void> {
  const toEnrich = places.slice(0, maxPlaces);
  for (const place of toEnrich) {
    try {
      // Localiza o card no feed pelo placeId (substring no href)
      const cardLink = page
        .locator(`a[href*="${place.placeId}"]`)
        .first();
      const visible = await cardLink.isVisible().catch(() => false);
      if (!visible) continue;

      await cardLink.click({ timeout: 4000 });

      // Espera o painel de detalhe carregar (botoes Diretrizes/Site/Telefone)
      const detail = page.locator('div[role="main"]').last();
      await detail
        .waitFor({ state: "visible", timeout: 6000 })
        .catch(() => undefined);
      await randomDelay(500, 900);

      const enrichment = await page.evaluate(() => {
        const root = document.querySelector('div[role="main"]');
        if (!root) return null;
        const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
        let instagram: string | undefined;
        let facebook: string | undefined;
        for (const l of links) {
          const h = l.getAttribute("href") || "";
          if (!instagram && /instagram\.com/i.test(h)) instagram = h;
          if (!facebook && /facebook\.com/i.test(h)) facebook = h;
          if (instagram && facebook) break;
        }
        const text = (root.textContent || "").toLowerCase();
        const claimed =
          text.includes("proprietario verificou") ||
          text.includes("reivindicad") ||
          text.includes("verified by owner");
        return { instagram, facebook, claimed };
      });

      if (enrichment) {
        place.instagram = enrichment.instagram;
        place.facebook = enrichment.facebook;
        place.claimed = enrichment.claimed;
      }

      // Volta para o feed
      const backBtn = page
        .locator('button[aria-label*="Voltar" i], button[aria-label*="Back" i]')
        .first();
      await backBtn.click({ timeout: 2000 }).catch(() => undefined);
      await randomDelay(400, 800);
    } catch {
      // best-effort
    }
  }
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
    enrichDetailsCount = 0,
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

    // Enriquecimento opcional (abrir detalhe de cada place)
    if (enrichDetailsCount > 0) {
      const remainingMs = timeoutMs - (Date.now() - startedAt);
      if (remainingMs > 10_000) {
        await enrichWithPlaceDetails(page, raw, enrichDetailsCount);
      }
    }

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
