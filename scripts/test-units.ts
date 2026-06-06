/**
 * Smoke test das funcoes puras (sem rede).
 * Roda com: npx tsx scripts/test-units.ts
 */
import { haversineKm } from "../lib/haversine";
import { computeScore, SCORING_WEIGHTS } from "../lib/scoring";

function expect(label: string, ok: boolean, detail?: string) {
  const tag = ok ? "OK " : "FAIL";
  console.log(`  ${tag} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
}

console.log("haversine:");
{
  // Sao Paulo (Se) -> Rio de Janeiro (Centro) ~= 360 km
  const sp = { lat: -23.5505, lng: -46.6333 };
  const rj = { lat: -22.9068, lng: -43.1729 };
  const d = haversineKm(sp, rj);
  expect("SP -> RJ ~360km", d > 350 && d < 370, `got ${d.toFixed(1)} km`);

  // mesmo ponto -> 0
  expect("mesmo ponto = 0", haversineKm(sp, sp) === 0);
}

console.log("scoring:");
{
  // erro -> baseline
  expect(
    "hasError = baseline 50",
    computeScore({
      psiScore: null,
      hasHttps: null,
      hasMobileVp: null,
      safeThreat: null,
      hasError: true,
    }) === SCORING_WEIGHTS.errorBaseline,
  );

  // site perfeito (PSI 100, https, mobile, sem threat) -> 0
  expect(
    "site perfeito = 0",
    computeScore({
      psiScore: 100,
      hasHttps: true,
      hasMobileVp: true,
      safeThreat: false,
    }) === 0,
  );

  // site horrivel (PSI 0, sem https, sem mobile, com threat)
  //  -> 50 + 15 + 15 + 20 = 100 (clampado)
  expect(
    "site horrivel = 100",
    computeScore({
      psiScore: 0,
      hasHttps: false,
      hasMobileVp: false,
      safeThreat: true,
    }) === 100,
  );

  // PSI 50, https ok, mobile ok, sem threat -> ~25
  const meio = computeScore({
    psiScore: 50,
    hasHttps: true,
    hasMobileVp: true,
    safeThreat: false,
  });
  expect("PSI 50 = ~25", meio === 25, `got ${meio}`);
}

console.log(process.exitCode === 1 ? "\nFALHOU" : "\nPASSOU");
