"use client";

import { useEffect, useState } from "react";
import type { Lead } from "@/lib/types";
import { QualBadge, ScoreBadge, CrmBadge } from "./StatusBadge";

interface Props {
  buscaId: string | null;
}

type FiltroQual = "" | "pendente" | "sem_site" | "analisado" | "erro";

export function LeadsTable({ buscaId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [filtroQual, setFiltroQual] = useState<FiltroQual>("");
  const [minScore, setMinScore] = useState(0);

  // Debounce do termo de busca para nao refazer fetch a cada keystroke
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!buscaId) return;

    let active = true;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (buscaId) params.set("buscaId", buscaId);
        if (filtroQual) params.set("statusQual", filtroQual);
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
  }, [buscaId, qDebounced, filtroQual, minScore]);

  if (!buscaId) {
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
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">CRM</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className="border-t border-border hover:bg-background/40"
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
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
