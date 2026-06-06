/**
 * Scoring de qualificacao do lead.
 *
 * Quanto MAIOR o score, MAIOR a oportunidade de venda do nosso servico
 * (criacao/melhoria de site, performance, etc).
 *
 * Filosofia da spec:
 *  - Sem site -> 75 fixo (oportunidade obvia, tratado fora desta funcao)
 *  - Com site ruim (PSI baixo, sem mobile, sem https, ameaca) -> score alto
 *  - Com site impecavel -> score baixo (cliente nao tem dor)
 *
 * Coeficientes ficam aqui exportados para que seja facil tunar sem mexer
 * na logica.
 */

export const SCORING_WEIGHTS = {
  psi: 50, // peso do PSI (0-50 pontos, invertido — score baixo PSI = mais peso)
  noHttps: 15, // sem HTTPS na URL final
  noMobileViewport: 15, // sem viewport meta — provavel site desktop only
  safeBrowsingThreat: 20, // marcado pelo Safe Browsing
  errorBaseline: 50, // quando nao foi possivel analisar (erro), score base
} as const;

export interface ScoringInputs {
  /** Score Lighthouse 0-100, null = nao mediu */
  psiScore: number | null;
  hasHttps: boolean | null;
  hasMobileVp: boolean | null;
  /** true = Safe Browsing detectou ameaca */
  safeThreat: boolean | null;
  /** se ocorreu erro durante a analise (timeout, site fora do ar) */
  hasError?: boolean;
}

export function computeScore(inputs: ScoringInputs): number {
  if (inputs.hasError) return SCORING_WEIGHTS.errorBaseline;

  let score = 0;

  // PSI: invertido. Score 0 do PSI -> 50 pontos de oportunidade.
  if (inputs.psiScore != null) {
    const inverted = (100 - inputs.psiScore) / 100;
    score += Math.round(inverted * SCORING_WEIGHTS.psi);
  }

  if (inputs.hasHttps === false) score += SCORING_WEIGHTS.noHttps;
  if (inputs.hasMobileVp === false) score += SCORING_WEIGHTS.noMobileViewport;
  if (inputs.safeThreat === true) score += SCORING_WEIGHTS.safeBrowsingThreat;

  // Clampa entre 0 e 100
  return Math.max(0, Math.min(100, score));
}
