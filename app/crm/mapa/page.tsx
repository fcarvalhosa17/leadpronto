"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { LeadDrawer } from "@/components/LeadDrawer";

const MapaLeads = dynamic(() => import("@/components/MapaLeads"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-xl border border-border bg-surface text-sm text-neutral-400">
      Carregando mapa...
    </div>
  ),
});

interface BuscaResumo { id: string; nicho: string; regiao: string; createdAt: string; }

const selectCls = "h-8 rounded-lg border border-border bg-white px-3 text-sm text-neutral-950 outline-none focus:border-primary focus:ring-[3px] focus:ring-orange-500/40";

export default function MapaPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [buscas, setBuscas] = useState<BuscaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaId, setBuscaId] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/busca", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBuscas(d.buscas || []));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (buscaId) params.set("buscaId", buscaId);
    if (minScore > 0) params.set("minScore", String(minScore));

    fetch(`/api/leads?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (active) setLeads(d.leads || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [buscaId, minScore]);

  const mapableLeads = useMemo(() => leads.filter((l) => l.lat != null && l.lng != null), [leads]);

  const dot = (color: string) => (
    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Mapa de leads
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mapableLeads.length} de {leads.length} leads com coordenadas.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3"
        style={{ boxShadow: "0 0 0 1px oklch(0.145 0 0 / 0.10), 0 1px 3px 0 oklch(0.145 0 0 / 0.08)" }}>
        <select value={buscaId} onChange={(e) => setBuscaId(e.target.value)}
          className={selectCls} style={{ width: 220 }}>
          <option value="">Todas as buscas</option>
          {buscas.map((b) => (
            <option key={b.id} value={b.id}>{b.nicho} — {b.regiao}</option>
          ))}
        </select>
        <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
          className={selectCls} style={{ width: 160 }}>
          <option value={0}>Score min: qualquer</option>
          <option value={50}>Score min: 50</option>
          <option value={70}>Score min: 70</option>
          <option value={80}>Score min: 80</option>
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">{dot("#22c55e")} Score ≥ 80</span>
          <span className="inline-flex items-center gap-1.5">{dot("#eab308")} 60–79</span>
          <span className="inline-flex items-center gap-1.5">{dot("#ef4444")} &lt; 60</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[600px] items-center justify-center rounded-xl border border-border bg-surface text-sm text-neutral-400">
          Carregando leads...
        </div>
      ) : mapableLeads.length === 0 ? (
        <div className="flex h-[600px] items-center justify-center rounded-xl border border-dashed border-border bg-surface text-sm text-neutral-400">
          Nenhum lead com coordenadas para exibir.
        </div>
      ) : (
        <MapaLeads leads={mapableLeads} onOpenLead={(id) => setSelectedLeadId(id)} />
      )}

      <LeadDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={(updated) =>
          setLeads((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
        }
      />
    </div>
  );
}
