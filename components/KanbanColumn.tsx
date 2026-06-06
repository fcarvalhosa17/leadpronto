"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead, StatusCrm } from "@/lib/types";
import { STATUS_CRM_LABEL } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

interface Props {
  status: StatusCrm;
  leads: Lead[];
}

export function KanbanColumn({ status, leads }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-surface p-3 transition-colors ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">
          {STATUS_CRM_LABEL[status]}
        </h3>
        <span className="rounded bg-background px-2 py-0.5 text-xs text-gray-400">
          {leads.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {leads.map((l) => (
          <KanbanCard key={l.id} lead={l} />
        ))}
        {leads.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-gray-600">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}
