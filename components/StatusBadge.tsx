import {
  STATUS_QUAL_LABEL,
  STATUS_CRM_LABEL,
  type StatusQual,
  type StatusCrm,
} from "@/lib/types";

// Light-mode translucent pill styles
const QUAL_COLOR: Record<StatusQual, string> = {
  pendente:  "bg-yellow-100 text-yellow-700 border-yellow-300",
  sem_site:  "bg-neutral-100 text-neutral-600 border-neutral-300",
  analisado: "bg-green-100  text-green-700  border-green-300",
  erro:      "bg-red-100    text-red-600    border-red-300",
};

const CRM_COLOR: Record<StatusCrm, string> = {
  novo:      "bg-blue-100   text-blue-700   border-blue-300",
  contatado: "bg-purple-100 text-purple-700 border-purple-300",
  reuniao:   "bg-cyan-100   text-cyan-700   border-cyan-300",
  proposta:  "bg-orange-100 text-orange-700 border-orange-300",
  fechado:   "bg-green-100  text-green-700  border-green-300",
};

const pill = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";

export function QualBadge({ status }: { status: string }) {
  const s = (status as StatusQual) in QUAL_COLOR ? (status as StatusQual) : "pendente";
  return (
    <span className={`${pill} ${QUAL_COLOR[s]}`}>
      {s === "pendente" && (
        <svg className="lp-spin" width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      )}
      {s === "analisado" && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
        </svg>
      )}
      {STATUS_QUAL_LABEL[s]}
    </span>
  );
}

export function CrmBadge({ status }: { status: string }) {
  const s = (status as StatusCrm) in CRM_COLOR ? (status as StatusCrm) : "novo";
  return (
    <span className={`${pill} ${CRM_COLOR[s]}`}>
      {STATUS_CRM_LABEL[s]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  let color = "bg-neutral-100 text-neutral-500 border-neutral-300";
  if (score >= 80) color = "bg-green-100 text-green-700 border-green-300";
  else if (score >= 60) color = "bg-yellow-100 text-yellow-700 border-yellow-300";
  else if (score > 0) color = "bg-red-100 text-red-600 border-red-300";

  return (
    <span className={`${pill} min-w-[2.25rem] justify-center rounded-full font-mono font-semibold ${color}`}>
      {score > 0 ? score : "—"}
    </span>
  );
}

export function RatingBadge({ rating, reviews }: { rating: number; reviews?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1">
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
      </svg>
      <span className="font-mono font-semibold">{rating.toFixed(1)}</span>
      {reviews != null && <span className="text-neutral-400">· {reviews}</span>}
    </span>
  );
}
