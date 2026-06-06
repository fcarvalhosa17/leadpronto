"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Lead, StatusCrm } from "@/lib/types";
import { STATUS_CRM_LABEL } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

interface Props { status: StatusCrm; leads: Lead[]; onOpen?: (id: string) => void; }

export function KanbanColumn({ status, leads, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef}
      className="flex w-72 shrink-0 flex-col rounded-xl p-3 transition-colors"
      style={{
        background: "#f5f5f5",
        border: `1.5px solid ${isOver ? "#ea580c" : "transparent"}`,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 220px)",
      }}>
      <div className="mb-3 flex items-center justify-between px-0.5">
        <h3 className="text-[13.5px] font-semibold text-neutral-950">{STATUS_CRM_LABEL[status]}</h3>
        <span className="inline-flex min-w-[22px] items-center justify-center rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-neutral-500"
          style={{ background: "#e5e5e5" }}>
          {leads.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-neutral-400">
            Vazio
          </div>
        ) : (
          leads.map((l) => <KanbanCard key={l.id} lead={l} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
