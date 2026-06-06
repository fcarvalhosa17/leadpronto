import {
  STATUS_QUAL_LABEL,
  STATUS_CRM_LABEL,
  type StatusQual,
  type StatusCrm,
} from "@/lib/types";

const QUAL_COLOR: Record<StatusQual, string> = {
  pendente: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  sem_site: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  analisado: "bg-green-500/15 text-green-300 border-green-500/30",
  erro: "bg-red-500/15 text-red-300 border-red-500/30",
};

const CRM_COLOR: Record<StatusCrm, string> = {
  novo: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  contatado: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  reuniao: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  proposta: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  fechado: "bg-green-500/15 text-green-300 border-green-500/30",
};

export function QualBadge({ status }: { status: string }) {
  const s = (status as StatusQual) in QUAL_COLOR ? (status as StatusQual) : "pendente";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${QUAL_COLOR[s]}`}
    >
      {STATUS_QUAL_LABEL[s]}
    </span>
  );
}

export function CrmBadge({ status }: { status: string }) {
  const s = (status as StatusCrm) in CRM_COLOR ? (status as StatusCrm) : "novo";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${CRM_COLOR[s]}`}
    >
      {STATUS_CRM_LABEL[s]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-500/15 text-gray-300 border-gray-500/30";
  if (score >= 80) color = "bg-green-500/15 text-green-300 border-green-500/30";
  else if (score >= 60)
    color = "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  else if (score > 0)
    color = "bg-red-500/15 text-red-300 border-red-500/30";

  return (
    <span
      className={`inline-flex min-w-[2.5rem] items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      {score}
    </span>
  );
}
