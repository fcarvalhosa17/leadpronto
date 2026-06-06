"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "@/lib/types";
import { ScoreBadge, QualBadge } from "./StatusBadge";

interface Props {
  lead: Lead;
}

export function KanbanCard({ lead }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-md border border-border bg-background p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{lead.nome}</p>
          {lead.categoria && (
            <p className="truncate text-xs text-gray-500">{lead.categoria}</p>
          )}
        </div>
        <ScoreBadge score={lead.score} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
        <QualBadge status={lead.statusQual} />
        {lead.telefone && <span>{lead.telefone}</span>}
      </div>

      {lead.site && (
        <a
          href={lead.site}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-1 block truncate text-xs text-primary hover:underline"
        >
          {(() => {
            try {
              return new URL(lead.site).hostname.replace(/^www\./, "");
            } catch {
              return lead.site;
            }
          })()}
        </a>
      )}
    </div>
  );
}
