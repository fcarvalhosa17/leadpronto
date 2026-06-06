"use client";

import { useEffect, useState, useCallback } from "react";
import type { Lead, StatusCrm } from "@/lib/types";
import { STATUS_CRM_ORDER, STATUS_CRM_LABEL } from "@/lib/types";
import { QualBadge, ScoreBadge, CrmBadge } from "./StatusBadge";

interface Nota {
  id: string;
  texto: string;
  criadaEm: string;
}

interface Atividade {
  id: string;
  tipo: string;
  descricao: string;
  criadaEm: string;
}

interface LeadCompleto extends Lead {
  notas?: Nota[];
  atividades?: Atividade[];
}

interface Props {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: (lead: Lead) => void;
}

// Limpa o telefone para uso em wa.me (so digitos, prefixa 55 se faltar)
function telToWhats(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Barra de progresso colorida (0-100). Verde alto, amarelo medio, vermelho baixo.
function ProgressBar({ value, invert = false }: { value: number; invert?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  // invert=true: alto=ruim (caso do score de oportunidade do lead)
  // invert=false: alto=bom (caso de metricas do PSI)
  const good = invert ? v < 40 : v >= 80;
  const mid = invert ? v < 70 : v >= 60;
  const color = good ? "bg-green-500" : mid ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-background">
      <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function BoolPill({ value, labelTrue, labelFalse }: {
  value: boolean | null | undefined;
  labelTrue: string;
  labelFalse: string;
}) {
  if (value == null) {
    return <span className="text-xs text-gray-500">-</span>;
  }
  const cls = value
    ? "bg-green-500/15 text-green-300 border-green-500/30"
    : "bg-red-500/15 text-red-300 border-red-500/30";
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value ? labelTrue : labelFalse}
    </span>
  );
}

export function LeadDrawer({ leadId, onClose, onLeadUpdated }: Props) {
  const [lead, setLead] = useState<LeadCompleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/lead/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar lead");
      setLead(data.lead);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (leadId) {
      load(leadId);
    } else {
      setLead(null);
      setNovaNota("");
    }
  }, [leadId, load]);

  // Fecha com ESC
  useEffect(() => {
    if (!leadId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leadId, onClose]);

  async function mudarStatus(novoStatus: StatusCrm) {
    if (!lead) return;
    const anterior = lead.statusCrm;
    setLead({ ...lead, statusCrm: novoStatus });
    try {
      const res = await fetch(`/api/lead/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusCrm: novoStatus }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar status");
      // recarrega para trazer atividade gerada
      await load(lead.id);
      onLeadUpdated?.({ ...lead, statusCrm: novoStatus });
    } catch (e) {
      setErro((e as Error).message);
      setLead({ ...lead, statusCrm: anterior });
    }
  }

  async function salvarProximoContato(valor: string) {
    if (!lead) return;
    setSalvandoData(true);
    try {
      const res = await fetch(`/api/lead/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proximoContato: valor || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar data");
      setLead({ ...lead, proximoContato: data.lead.proximoContato });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoData(false);
    }
  }

  async function adicionarNota() {
    if (!lead || !novaNota.trim()) return;
    setSalvandoNota(true);
    try {
      const res = await fetch(`/api/lead/${lead.id}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: novaNota.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao salvar nota");
      }
      setNovaNota("");
      await load(lead.id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvandoNota(false);
    }
  }

  const open = leadId != null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {!open ? null : loading && !lead ? (
          <div className="p-8 text-sm text-gray-400">Carregando...</div>
        ) : !lead ? (
          <div className="p-8 text-sm text-red-400">
            {erro || "Lead nao encontrado"}
            <button onClick={onClose} className="ml-3 underline">
              Fechar
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Cabecalho */}
            <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-surface p-5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-white">
                  {lead.nome}
                </h2>
                {lead.categoria && (
                  <p className="truncate text-xs text-gray-400">{lead.categoria}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ScoreBadge score={lead.score} />
                  <QualBadge status={lead.statusQual} />
                  <CrmBadge status={lead.statusCrm} />
                  {lead.rating != null && (
                    <span className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-200">
                      <span>⭐</span>
                      <span>{lead.rating.toFixed(1)}</span>
                      {lead.totalReviews != null && (
                        <span className="text-yellow-400/70">
                          · {lead.totalReviews}
                        </span>
                      )}
                    </span>
                  )}
                  {lead.claimed && (
                    <span className="inline-flex items-center rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-200">
                      Reivindicado
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded p-1 text-gray-400 hover:bg-background hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4Z" />
                </svg>
              </button>
            </header>

            {erro && (
              <div className="border-b border-red-500/30 bg-red-500/10 px-5 py-2 text-xs text-red-300">
                {erro}
              </div>
            )}

            <div className="space-y-6 p-5">
              {/* Seção: Contato */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Contato
                </h3>
                <div className="space-y-3 text-sm">
                  {lead.telefone ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-300">{lead.telefone}</span>
                      <a
                        href={`tel:${lead.telefone.replace(/\D/g, "")}`}
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:border-primary"
                      >
                        Ligar
                      </a>
                      <a
                        href={`https://wa.me/${telToWhats(lead.telefone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-300 hover:border-green-500"
                      >
                        WhatsApp
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Sem telefone</div>
                  )}

                  {lead.endereco ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-300">{lead.endereco}</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(lead.endereco)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:border-primary"
                      >
                        Ver no Maps
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Sem endereco</div>
                  )}

                  {lead.site ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-primary">
                        {(() => {
                          try {
                            return new URL(lead.site).hostname.replace(/^www\./, "");
                          } catch {
                            return lead.site;
                          }
                        })()}
                      </span>
                      <a
                        href={lead.site}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:border-primary"
                      >
                        Abrir site
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Sem site</div>
                  )}

                  {lead.distanciaKm != null && (
                    <div className="text-xs text-gray-400">
                      Distancia: {lead.distanciaKm.toFixed(2)} km
                    </div>
                  )}

                  {(lead.instagram || lead.facebook) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {lead.instagram && (
                        <a
                          href={lead.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-pink-500/30 bg-pink-500/10 px-2 py-1 text-xs text-pink-300 hover:border-pink-500"
                        >
                          Instagram
                        </a>
                      )}
                      {lead.facebook && (
                        <a
                          href={lead.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-300 hover:border-blue-500"
                        >
                          Facebook
                        </a>
                      )}
                    </div>
                  )}

                  {lead.horario && (
                    <div className="text-xs text-gray-400">
                      Horario: <span className="text-gray-300">{lead.horario}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Seção: Score breakdown */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Score
                </h3>
                <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-400">Score total (oportunidade)</span>
                      <span className="font-semibold text-white">{lead.score}/100</span>
                    </div>
                    <ProgressBar value={lead.score} invert />
                  </div>

                  {!lead.site ? (
                    <p className="text-xs text-gray-400">
                      Sem site - score base 75 (oportunidade alta).
                    </p>
                  ) : lead.statusQual === "pendente" ? (
                    <p className="text-xs text-gray-400">
                      Qualificacao ainda nao iniciada.
                    </p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {lead.psiScore != null && (
                        <div>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-gray-400">PSI Performance</span>
                            <span className="text-gray-200">{lead.psiScore}</span>
                          </div>
                          <ProgressBar value={lead.psiScore} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <span className="block text-gray-500">HTTPS</span>
                          <BoolPill value={lead.hasHttps} labelTrue="Sim" labelFalse="Nao" />
                        </div>
                        <div>
                          <span className="block text-gray-500">Mobile viewport</span>
                          <BoolPill value={lead.hasMobileVp} labelTrue="Sim" labelFalse="Nao" />
                        </div>
                        <div>
                          <span className="block text-gray-500">Safe Browsing</span>
                          <BoolPill
                            value={lead.safeMalware == null ? null : !lead.safeMalware}
                            labelTrue="Seguro"
                            labelFalse="Ameaca"
                          />
                        </div>
                        {lead.psiLcpMs != null && (
                          <div>
                            <span className="block text-gray-500">LCP</span>
                            <span className="text-gray-200">{lead.psiLcpMs} ms</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {lead.ultimoErro && (
                    <p className="text-xs text-red-400">
                      Erro: {lead.ultimoErro}
                    </p>
                  )}
                </div>
              </section>

              {/* Seção: Status CRM */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Status CRM
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500">Status</label>
                    <select
                      value={lead.statusCrm}
                      onChange={(e) => mudarStatus(e.target.value as StatusCrm)}
                      className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {STATUS_CRM_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CRM_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">
                      Proximo contato
                    </label>
                    <input
                      type="date"
                      value={toDateInputValue(lead.proximoContato)}
                      onChange={(e) => salvarProximoContato(e.target.value)}
                      disabled={salvandoData}
                      className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </section>

              {/* Seção: Notas */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Notas e historico
                </h3>

                <div className="mb-3">
                  <textarea
                    value={novaNota}
                    onChange={(e) => setNovaNota(e.target.value)}
                    placeholder="Escreva uma nota..."
                    rows={3}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={adicionarNota}
                      disabled={salvandoNota || !novaNota.trim()}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {salvandoNota ? "Salvando..." : "Adicionar nota"}
                    </button>
                  </div>
                </div>

                <Timeline notas={lead.notas || []} atividades={lead.atividades || []} />
              </section>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

interface TimelineItem {
  kind: "nota" | "atividade";
  id: string;
  texto: string;
  tipo?: string;
  criadaEm: string;
}

function Timeline({ notas, atividades }: { notas: Nota[]; atividades: Atividade[] }) {
  const items: TimelineItem[] = [
    ...notas.map((n) => ({
      kind: "nota" as const,
      id: `n-${n.id}`,
      texto: n.texto,
      criadaEm: n.criadaEm,
    })),
    ...atividades.map((a) => ({
      kind: "atividade" as const,
      id: `a-${a.id}`,
      texto: a.descricao,
      tipo: a.tipo,
      criadaEm: a.criadaEm,
    })),
  ].sort(
    (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
  );

  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-4 text-center text-xs text-gray-500">
        Sem historico ainda.
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="rounded border border-border bg-background/40 p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] uppercase ${
                it.kind === "nota"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  : "border-gray-500/30 bg-gray-500/10 text-gray-300"
              }`}
            >
              {it.kind === "nota" ? "Nota" : it.tipo || "Atividade"}
            </span>
            <span className="text-[10px] text-gray-500">{formatDate(it.criadaEm)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-gray-200">{it.texto}</p>
        </li>
      ))}
    </ol>
  );
}
