"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Lead, StatusCrm } from "@/lib/types";
import { STATUS_CRM_ORDER } from "@/lib/types";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadDrawer } from "@/components/LeadDrawer";

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        const data = await res.json();
        if (active) setLeads(data.leads || []);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const novoStatus = String(over.id) as StatusCrm;
    if (!STATUS_CRM_ORDER.includes(novoStatus)) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, statusCrm: novoStatus } : l)),
    );

    try {
      const res = await fetch(`/api/lead/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusCrm: novoStatus }),
      });
      if (!res.ok) throw new Error("PATCH falhou");
    } catch {
      // rollback simples: recarrega tudo
      const res = await fetch("/api/leads", { cache: "no-store" });
      const data = await res.json();
      setLeads(data.leads || []);
    }
  }

  const porStatus: Record<StatusCrm, Lead[]> = {
    novo: [],
    contatado: [],
    reuniao: [],
    proposta: [],
    fechado: [],
  };
  for (const l of leads) {
    const s = (STATUS_CRM_ORDER as readonly string[]).includes(l.statusCrm)
      ? (l.statusCrm as StatusCrm)
      : "novo";
    porStatus[s].push(l);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kanban</h1>
        <p className="mt-1 text-sm text-gray-400">
          Arraste os cards entre as colunas para atualizar o status comercial.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando leads...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_CRM_ORDER.map((s) => (
              <KanbanColumn
                key={s}
                status={s}
                leads={porStatus[s]}
                onOpen={setSelectedLeadId}
              />
            ))}
          </div>
        </DndContext>
      )}

      <LeadDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={(updated) =>
          setLeads((prev) =>
            prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
          )
        }
      />
    </div>
  );
}
