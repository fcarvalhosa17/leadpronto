"use client";

import { useEffect, useState } from "react";
import type { Lead, Busca, StatusCrm } from "@/lib/types";
import { STATUS_CRM_ORDER, STATUS_CRM_LABEL } from "@/lib/types";
import { QualBadge, ScoreBadge, CrmBadge } from "./StatusBadge";
import { LeadDrawer } from "./LeadDrawer";

type Mode = "busca" | "crm";

interface Props {
  buscaId: string | null;
  mode?: Mode;
}

type FiltroQual = "" | "pendente" | "sem_site" | "analisado" | "erro";
type FiltroCrm = "" | StatusCrm;

export function LeadsTable({ buscaId, mode = "busca" }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [filtroQual, setFiltroQual] = useState<FiltroQual>("");
  const [filtroCrm, setFiltroCrm] = useState<FiltroCrm>("");
  const [minScore, setMinScore] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Modo CRM: permite escolher uma busca especifica (opcional)
  const [buscas, setBuscas] = useState<Busca[]>([]);
  const [filtroBuscaId, setFiltroBuscaId] = useState<string>("");

  // Em modo busca, o id vem da prop. Em modo crm, o usuario escolhe no select.
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

  // Debounce do termo de busca para nao refazer fetch a cada keystroke
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Em modo crm, carrega a lista de buscas uma vez para popular o select
  useEffect(() => {
    if (mode !== "crm") return;
    let active = true;
    async function loadBuscas() {
      try {
        const res = await fetch("/api/busca", { cache: "no-store" });
        const data = await res.json();
        if (active) setBuscas(data.buscas || []);
      } catch {
        // silencioso, select fica vazio
      }
    }
    loadBuscas();
    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    // Em modo busca, exige buscaId para evitar carregar antes do usuario buscar.
    // Em modo crm, sempre carrega (sem buscaId = todos os leads).
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

        const res = await fetch(`/api/leads?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (active) setLeads(data.leads || []);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    // Polling 5s para refletir scores que o worker for atualizando
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [mode, buscaId, effectiveBuscaId, qDebounced, filtroQual, filtroCrm, minScore]);

  if (mode === "busca" && !buscaId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-gray-500">
        Faca uma busca para ver os leads aqui.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <h2 className="mr-auto text-base font-semibold">
          Leads ({leads.length}){" "}
          {loading && (
            <span className="text-xs font-normal text-gray-500">atualizando...</span>
          )}
        </h2>
        {mode === "crm" && (
          <select
            value={filtroBuscaId}
            onChange={(e) => setFiltroBuscaId(e.target.value)}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Todas as buscas</option>
            {buscas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nicho} - {b.regiao}
              </option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filtrar por nome/endereco"
          className="rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <select
          value={filtroQual}
          onChange={(e) => setFiltroQual(e.target.value as FiltroQual)}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="sem_site">Sem site</option>
          <option value="analisado">Analisado</option>
          <option value="erro">Erro</option>
        </select>
        {mode === "crm" && (
          <select
            value={filtroCrm}
            onChange={(e) => setFiltroCrm(e.target.value as FiltroCrm)}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Todos CRM</option>
            {STATUS_CRM_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_CRM_LABEL[s]}
              </option>
            ))}
          </select>
        )}
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value={0}>Score min: qualquer</option>
          <option value={50}>Score min: 50</option>
          <option value={70}>Score min: 70</option>
          <option value={80}>Score min: 80</option>
        </select>
        <a
          href={buildExportUrl()}
          className="rounded border border-border bg-background px-3 py-1.5 text-sm hover:border-primary"
        >
          Exportar CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Site</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Endereco</th>
              <th className="px-4 py-3 text-right">Dist (km)</th>
              <th className="px-4 py-3 text-center">Rating</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">CRM</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelectedLeadId(l.id)}
                className="cursor-pointer border-t border-border hover:bg-background/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{l.nome}</div>
                  {l.categoria && (
                    <div className="text-xs text-gray-500">{l.categoria}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.site ? (
                    <a
                      href={l.site}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {(() => {
                        try {
                          return new URL(l.site).hostname.replace(/^www\./, "");
                        } catch {
                          return l.site;
                        }
                      })()}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-500">sem site</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-300">{l.telefone || "-"}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {l.endereco || "-"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {l.distanciaKm != null ? l.distanciaKm.toFixed(2) : "-"}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-300">
                  {l.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span>{l.rating.toFixed(1)}</span>
                      {l.totalReviews != null && (
                        <span className="text-gray-500">· {l.totalReviews}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={l.score} />
                </td>
                <td className="px-4 py-3">
                  <QualBadge status={l.statusQual} />
                </td>
                <td className="px-4 py-3">
                  <CrmBadge status={l.statusCrm} />
                </td>
              </tr>
            ))}
            {!loading && leads.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
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
          setLeads((prev) =>
            prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
          )
        }
      />
    </div>
  );
}
