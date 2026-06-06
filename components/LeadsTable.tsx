"use client";

import { useEffect, useState } from "react";
import type { Lead, Busca, StatusCrm } from "@/lib/types";
import { STATUS_CRM_ORDER, STATUS_CRM_LABEL } from "@/lib/types";
import { QualBadge, ScoreBadge, CrmBadge, RatingBadge } from "./StatusBadge";
import { LeadDrawer } from "./LeadDrawer";

type Mode = "busca" | "crm";
type FiltroQual = "" | "pendente" | "sem_site" | "analisado" | "erro";
type FiltroCrm = "" | StatusCrm;

interface Props {
  buscaId: string | null;
  mode?: Mode;
}

const selectCls = "h-8 rounded-lg border border-border bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-orange-500/40";

export function LeadsTable({ buscaId, mode = "busca" }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [filtroQual, setFiltroQual] = useState<FiltroQual>("");
  const [filtroCrm, setFiltroCrm] = useState<FiltroCrm>("");
  const [minScore, setMinScore] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const [buscas, setBuscas] = useState<Busca[]>([]);
  const [filtroBuscaId, setFiltroBuscaId] = useState<string>("");

  const effectiveBuscaId = mode === "busca" ? buscaId : filtroBuscaId || null;

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (effectiveBuscaId) params.set("buscaId", effectiveBuscaId);
    if (filtroQual) params.set("statusQual", filtroQual);
    if (filtroCrm) params.set("statusCrm", filtroCrm);
    if (minScore > 0) params.set("minScore", String(minScore));
    if (qDebounced) params.set("q", qDebounced);
    return `/api/leads/export?${params.toString()}`;
  }

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (mode !== "crm") return;
    let active = true;
    fetch("/api/busca", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (active) setBuscas(d.buscas || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    if (mode === "busca" && !buscaId) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (effectiveBuscaId) params.set("buscaId", effectiveBuscaId);
        if (filtroQual) params.set("statusQual", filtroQual);
        if (filtroCrm) params.set("statusCrm", filtroCrm);
        if (minScore > 0) params.set("minScore", String(minScore));
        if (qDebounced) params.set("q", qDebounced);
        const res = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (active) setLeads(data.leads || []);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [mode, buscaId, effectiveBuscaId, qDebounced, filtroQual, filtroCrm, minScore]);

  if (mode === "busca" && !buscaId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-neutral-500">
        Faça uma busca para ver os leads aqui.
      </div>
    );
  }

  const thCls = "sticky top-0 bg-surface px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-border";

  return (
    <div className="rounded-xl border border-border bg-white"
      style={{ boxShadow: "0 0 0 1px oklch(0.145 0 0 / 0.10), 0 1px 3px 0 oklch(0.145 0 0 / 0.08)" }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="mr-auto text-[15px] font-semibold text-neutral-950">
          Leads ({leads.length})
          {loading && (
            <span className="ml-2 text-xs font-normal text-neutral-400">atualizando...</span>
          )}
        </span>

        {mode === "crm" && (
          <select value={filtroBuscaId} onChange={(e) => setFiltroBuscaId(e.target.value)}
            className={selectCls} style={{ width: 200 }}>
            <option value="">Todas as buscas</option>
            {buscas.map((b) => (
              <option key={b.id} value={b.id}>{b.nicho} — {b.regiao}</option>
            ))}
          </select>
        )}

        {/* search input */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="filtrar por nome/endereço"
            className={`${selectCls} pl-7`} style={{ width: 220 }} />
        </div>

        <select value={filtroQual} onChange={(e) => setFiltroQual(e.target.value as FiltroQual)}
          className={selectCls} style={{ width: 150 }}>
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="sem_site">Sem site</option>
          <option value="analisado">Analisado</option>
          <option value="erro">Erro</option>
        </select>

        {mode === "crm" && (
          <select value={filtroCrm} onChange={(e) => setFiltroCrm(e.target.value as FiltroCrm)}
            className={selectCls} style={{ width: 140 }}>
            <option value="">Todos CRM</option>
            {STATUS_CRM_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_CRM_LABEL[s]}</option>
            ))}
          </select>
        )}

        <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
          className={selectCls} style={{ width: 160 }}>
          <option value={0}>Score min: qualquer</option>
          <option value={50}>Score min: 50</option>
          <option value={70}>Score min: 70</option>
          <option value={80}>Score min: 80</option>
        </select>

        <a href={buildExportUrl()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-neutral-700 transition-colors hover:border-primary hover:text-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Exportar CSV
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={thCls}>Empresa</th>
              <th className={thCls}>Site</th>
              <th className={thCls}>Telefone</th>
              <th className={thCls}>Endereço</th>
              <th className={`${thCls} text-right`}>Dist (km)</th>
              <th className={`${thCls} text-center`}>Rating</th>
              <th className={`${thCls} text-center`}>Score</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>CRM</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} onClick={() => setSelectedLeadId(l.id)}
                className="cursor-pointer border-t border-border transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-neutral-950">{l.nome}</div>
                  {l.categoria && <div className="text-xs text-neutral-400">{l.categoria}</div>}
                </td>
                <td className="px-3 py-2.5">
                  {l.site ? (
                    <a href={l.site} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 font-medium text-orange-700 hover:underline">
                      {(() => { try { return new URL(l.site).hostname.replace(/^www\./, ""); } catch { return l.site; } })()}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      </svg>
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400">sem site</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-neutral-700">{l.telefone || <span className="text-neutral-400">—</span>}</td>
                <td className="max-w-[200px] px-3 py-2.5 text-xs text-neutral-500">{l.endereco || "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono text-neutral-700">
                  {l.distanciaKm != null ? l.distanciaKm.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {l.rating != null ? (
                    <RatingBadge rating={l.rating} reviews={l.totalReviews} />
                  ) : <span className="text-neutral-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-center"><ScoreBadge score={l.score} /></td>
                <td className="px-3 py-2.5"><QualBadge status={l.statusQual} /></td>
                <td className="px-3 py-2.5"><CrmBadge status={l.statusCrm} /></td>
              </tr>
            ))}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-neutral-400">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
