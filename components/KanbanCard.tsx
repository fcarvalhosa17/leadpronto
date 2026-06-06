"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/lib/types";
import { ScoreBadge, QualBadge } from "./StatusBadge";

interface Props { lead: Lead; onOpen?: (id: string) => void; }

export function KanbanCard({ lead, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });

  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        if ((e.target as HTMLElement).closest("a")) return;
        onOpen?.(lead.id);
      }}
      className="cursor-pointer rounded-lg border border-border bg-white p-3 transition-shadow hover:shadow-sm active:cursor-grabbing"
      style={{ ...style, boxShadow: "0 1px 2px 0 oklch(0.145 0 0 / 0.05)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-neutral-950">{lead.nome}</p>
          {lead.categoria && <p className="truncate text-xs text-neutral-400">{lead.categoria}</p>}
        </div>
        <ScoreBadge score={lead.score} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <QualBadge status={lead.statusQual} />
        {lead.telefone && <span className="font-mono text-[11.5px] text-neutral-400">{lead.telefone}</span>}
      </div>

      {lead.site && (
        <a href={lead.site} target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
          className="mt-1.5 block truncate text-xs font-medium text-orange-700 hover:underline">
          {(() => { try { return new URL(lead.site).hostname.replace(/^www\./, ""); } catch { return lead.site; } })()}
        </a>
      )}
    </div>
  );
}
