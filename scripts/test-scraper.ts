/**
 * Smoke test do scraper. Roda direto:
 *   npm run test:scraper
 *
 * Argumentos opcionais:
 *   npm run test:scraper -- "academia" "Vila Mariana, Sao Paulo" 3
 */
import { geocode } from "../lib/geocode";
import { scrapeMaps } from "../lib/scraper/maps";
import { haversineKm } from "../lib/haversine";

async function main() {
  const [, , nicho = "academia", regiao = "Vila Mariana, Sao Paulo", raioRaw = "3"] =
    process.argv;
  const raioKm = Number(raioRaw);

  console.log(`[1/3] Geocoding: "${regiao}"`);
  const centro = await geocode(regiao);
  console.log(`      -> ${centro.displayName}`);
  console.log(`      -> lat=${centro.lat} lng=${centro.lng}`);

  console.log(`[2/3] Scraping Maps: "${nicho}" no raio de ${raioKm}km`);
  const t0 = Date.now();
  const places = await scrapeMaps({
    nicho,
    centro,
    raioKm,
    maxCards: 40,
    headful: process.env.HEADFUL === "1",
  });
  const tookSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`      -> ${places.length} places em ${tookSec}s`);

  console.log("[3/3] Amostra (primeiros 5):");
  for (const p of places.slice(0, 5)) {
    const dist =
      p.lat != null && p.lng != null
        ? haversineKm(centro, { lat: p.lat, lng: p.lng }).toFixed(2)
        : "?";
    console.log(`  - ${p.nome}`);
    console.log(`      cat:  ${p.categoria || "-"}`);
    console.log(`      end:  ${p.endereco || "-"}`);
    console.log(`      tel:  ${p.telefone || "-"}`);
    console.log(`      site: ${p.site || "-"}`);
    console.log(`      dist: ${dist} km`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
