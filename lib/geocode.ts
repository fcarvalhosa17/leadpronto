import type { LatLng } from "./types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  "leadpronto-local (contact@example.com)";

export interface GeocodeResult extends LatLng {
  displayName: string;
}

/**
 * Resolve um nome de regiao em coordenadas via Nominatim (OpenStreetMap).
 * Respeita o termo de uso enviando User-Agent identificavel.
 *
 * Cache simples em memoria para evitar chamadas repetidas durante a mesma
 * execucao do processo (UI -> API -> worker).
 */
const memoryCache = new Map<string, GeocodeResult>();

export async function geocode(regiao: string): Promise<GeocodeResult> {
  const key = regiao.trim().toLowerCase();
  if (!key) throw new Error("Regiao vazia");

  const cached = memoryCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: regiao,
    format: "json",
    addressdetails: "0",
    limit: "1",
    countrycodes: "br",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pt-BR",
    },
    // Evita cache do fetch do Next em rota dinamica
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!data.length) {
    throw new Error(`Regiao nao encontrada: ${regiao}`);
  }

  const result: GeocodeResult = {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    displayName: data[0].display_name,
  };

  memoryCache.set(key, result);
  return result;
}
