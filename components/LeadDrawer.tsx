"use client";

import { useEffect, useState, useCallback } from "react";
import type { Lead, StatusCrm } from "@/lib/types";
import { STATUS_CRM_ORDER, STATUS_CRM_LABEL } from "@/lib/types";
import { QualBadge, ScoreBadge, CrmBadge, RatingBadge } from "./StatusBadge";

interface Nota { id: string; texto: string; criadaEm: string; }
interface Atividade { id: string; tipo: string; descricao: string; criadaEm: string; }
interface LeadCompleto extends Lead { notas?: Nota[]; atividades?: Atividade[]; }
interface Props { leadId: string | null; onClose: () => void; onLeadUpdated?: (lead: Lead) => void; }

function telToWhats(t: string) {
  const d = t.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function toDateInput(v: string | Date | null | undefined) {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{title}</div>
      {children}
    </div>
  );
}

function ActionLink({ href, label, color, bg, border }: { href: string; label: string; color?: string; bg?: string; border?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-[filter]"
      style={{ color: color || "#171717", background: bg || "#fff", border: `1px solid ${border || "#e5e5e5"}` }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.filter = "brightness(0.96)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.filter = "none"; }}>
      {label}
    </a>
  );
}

function ProgressBar({ value, invert = false }: { value: number; invert?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const good = invert ? v < 40 : v >= 80;
  const mid  = invert ? v < 70 : v >= 60;
  const bg = good ? "#22c55e" : mid ? "#eab308" : "#ef4444";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
      <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: bg }} />
    </div>
  );
}

function BoolPill({ value, labelTrue, labelFalse }: { value: boolean | null | undefined; labelTrue: string; labelFalse: string }) {
  if (value == null) return <span className="text-xs text-neutral-400">—</span>;
  const cls = value
    ? "bg-green-100 text-green-700 border-green-300"
    : "bg-red-100 text-red-600 border-red-300";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{value ? labelTrue : labelFalse}</span>;
}

const selectCls = "mt-1 h-8 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-orange-500/40";

export function LeadDrawer({ leadId, onClose, onLeadUpdated }: Props) {
  const [lead, setLead] = useState<LeadCompleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [salvandoData, setSalvandoData] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true); setErro(null);
    try {
      const res = await fetch(`/api/lead/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar lead");
      setLead(data.lead);
    } catch (e) { setErro((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (leadId) { load(leadId); requestAnimationFrame(() => setVisible(true)); }
    else { setVisible(false); setTimeout(() => { setLead(null); setNovaNota(""); }, 240); }
  }, [leadId, load]);

  const close = useCallback(() => { setVisible(false); setTimeout(onClose, 240); }, [onClose]);

  useEffect(() => {
    if (!leadId) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [leadId, close]);

  async function mudarStatus(novoStatus: StatusCrm) {
    if (!lead) return;
    const anterior = lead.statusCrm;
    setLead({ ...lead, statusCrm: novoStatus });
    try {
      const res = await fetch(`/api/lead/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusCrm: novoStatus }),
      });
      if (!res.ok) throw new Error("Falha");
      await load(lead.id);
      onLeadUpdated?.({ ...lead, statusCrm: novoStatus });
    } catch (e) { setErro((e as Error).message); setLead({ ...lead, statusCrm: anterior }); }
  }

  async function salvarProximoContato(valor: string) {
    if (!lead) return;
    setSalvandoData(true);
    try {
      const res = await fetch(`/api/lead/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proximoContato: valor || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setLead({ ...lead, proximoContato: data.lead.proximoContato });
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvandoData(false); }
  }

  async function adicionarNota() {
    if (!lead || !novaNota.trim()) return;
    setSalvandoNota(true);
    try {
      const res = await fetch(`/api/lead/${lead.id}/notas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: novaNota.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Falha"); }
      setNovaNota("");
      await load(lead.id);
    } catch (e) { setErro((e as Error).message); }
    finally { setSalvandoNota(false); }
  }

  const open = leadId != null;

  // Timeline
  type TimelineItem = { kind: "nota"|"atividade"; id: string; texto: string; tipo?: string; criadaEm: string; };
  const timeline: TimelineItem[] = lead ? [
    ...(lead.notas || []).map((n) => ({ kind: "nota" as const, id: `n-${n.id}`, texto: n.texto, criadaEm: n.criadaEm })),
    ...(lead.atividades || []).map((a) => ({ kind: "atividade" as const, id: `a-${a.id}`, texto: a.descricao, tipo: a.tipo, criadaEm: a.criadaEm })),
  ].sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime()) : [];

  const waNumber = lead?.telefone ? telToWhats(lead.telefone) : null;
  const mapsUrl = lead ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.endereco || lead.nome)}` : "";

  return (
    <>
      {/* Backdrop */}
      <div onClick={close}
        className="fixed inset-0 z-40 transition-opacity"
        style={{
          background: "rgba(10,10,10,0.5)",
          opacity: open && visible ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms ease",
        }} />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-white"
        style={{
          width: "min(560px, 94vw)",
          boxShadow: "0 0 0 1px oklch(0.145 0 0 / 0.08), 0 12px 24px -6px oklch(0.145 0 0 / 0.14)",
          transform: open && visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 240ms cubic-bezier(0.22,1,0.36,1)",
        }}>
        {!open ? null : loading && !lead ? (
          <div className="p-8 text-sm text-neutral-400">Carregando...</div>
        ) : !lead ? (
          <div className="p-8 text-sm text-red-600">
            {erro || "Lead não encontrado"}
            <button onClick={close} className="ml-3 underline">Fechar</button>
          </div>
        ) : (
          <>
            {/* Sticky header */}
            <header className="sticky top-0 z-10 border-b border-border bg-white px-5 pb-3.5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold leading-snug text-neutral-950"
                    style={{ letterSpacing: "-0.02em" }}>{lead.nome}</div>
                  {lead.categoria && <div className="mt-0.5 text-xs text-neutral-400">{lead.categoria}</div>}
                </div>
                <button onClick={close} aria-label="Fechar"
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-surface hover:text-neutral-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <ScoreBadge score={lead.score} />
                <QualBadge status={lead.statusQual} />
                <CrmBadge status={lead.statusCrm} />
                {lead.rating != null && <RatingBadge rating={lead.rating} reviews={lead.totalReviews} />}
                {lead.claimed && (
                  <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Reivindicado
                  </span>
                )}
              </div>
              {erro && <div className="mt-2 text-xs text-red-600">{erro}</div>}
            </header>

            <div className="flex-1 overflow-y-auto">
              {/* Contato */}
              <Section title="Contato">
                <div className="flex flex-col gap-3 text-sm">
                  {lead.telefone ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-medium">{lead.telefone}</span>
                      <ActionLink href={`tel:${lead.telefone.replace(/\D/g, "")}`} label="Ligar" />
                      {waNumber && <ActionLink href={`https://wa.me/${waNumber}`} label="WhatsApp"
                        color="#fff" bg="#22c55e" border="#16a34a" />}
                    </div>
                  ) : <div className="text-xs text-neutral-400">Sem telefone</div>}

                  {lead.endereco ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-neutral-700">{lead.endereco}</span>
                      <ActionLink href={mapsUrl} label="Ver no Maps" />
                    </div>
                  ) : <div className="text-xs text-neutral-400">Sem endereço</div>}

                  {lead.site ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-orange-700">{hostname(lead.site)}</span>
                      <ActionLink href={lead.site} label="Abrir site" />
                    </div>
                  ) : <div className="text-xs text-neutral-400">Sem site cadastrado</div>}

                  {lead.distanciaKm != null && (
                    <div className="text-xs text-neutral-400">Distância: {lead.distanciaKm.toFixed(2)} km</div>
                  )}

                  {(lead.instagram || lead.facebook) && (
                    <div className="flex flex-wrap gap-2">
                      {lead.instagram && <ActionLink href={lead.instagram} label="Instagram"
                        color="#fff" bg="#DD2A7B" border="#c01e63" />}
                      {lead.facebook && <ActionLink href={lead.facebook} label="Facebook"
                        color="#fff" bg="#1877F2" border="#1568d8" />}
                    </div>
                  )}
                  {lead.horario && <div className="text-xs text-neutral-400">Horário: <span className="text-neutral-700">{lead.horario}</span></div>}
                </div>
              </Section>

              {/* Score */}
              <Section title="Score">
                <div className="rounded-lg border border-border bg-surface p-3.5">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-neutral-500">Score total (oportunidade)</span>
                    <span className="font-mono font-semibold">{lead.score}/100</span>
                  </div>
                  <ProgressBar value={lead.score} invert />

                  {!lead.site ? (
                    <p className="mt-2.5 text-xs text-yellow-700">Sem site — score base 75 (oportunidade alta).</p>
                  ) : lead.statusQual === "pendente" ? (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-400">
                      <svg className="lp-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Qualificação ainda não iniciada.
                    </div>
                  ) : (
                    <div className="mt-3.5 space-y-2">
                      {lead.psiScore != null && (
                        <>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-neutral-500">PSI Performance</span>
                            <span className="font-mono font-semibold">{lead.psiScore}</span>
                          </div>
                          <ProgressBar value={lead.psiScore} />
                        </>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "HTTPS", node: <BoolPill value={lead.hasHttps} labelTrue="Sim" labelFalse="Não" /> },
                          { label: "Mobile viewport", node: <BoolPill value={lead.hasMobileVp} labelTrue="Sim" labelFalse="Não" /> },
                          { label: "Safe Browsing", node: <BoolPill value={lead.safeMalware == null ? null : !lead.safeMalware} labelTrue="Seguro" labelFalse="Ameaça" /> },
                          ...(lead.psiLcpMs != null ? [{ label: "LCP", node: <span className="font-mono text-xs font-semibold">{lead.psiLcpMs} ms</span> }] : []),
                        ].map(({ label, node }) => (
                          <div key={label} className="flex items-center justify-between rounded-lg border border-border bg-white px-2.5 py-2 text-xs">
                            <span className="text-neutral-400">{label}</span>
                            {node}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {lead.ultimoErro && <p className="mt-2 text-xs text-red-600">Erro: {lead.ultimoErro}</p>}
                </div>
              </Section>

              {/* Status CRM */}
              <Section title="Status CRM">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500">Estágio</label>
                    <select value={lead.statusCrm} onChange={(e) => mudarStatus(e.target.value as StatusCrm)}
                      className={selectCls}>
                      {STATUS_CRM_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_CRM_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Próximo contato</label>
                    <input type="date" value={toDateInput(lead.proximoContato)}
                      onChange={(e) => salvarProximoContato(e.target.value)}
                      disabled={salvandoData} className={selectCls} />
                  </div>
                </div>
              </Section>

              {/* Notas */}
              <Section title="Notas e histórico">
                <div className="mb-3 flex flex-col gap-2">
                  <textarea value={novaNota} onChange={(e) => setNovaNota(e.target.value)} rows={3}
                    placeholder="Escreva uma nota sobre este lead..."
                    className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-orange-500/40" />
                  <div className="flex justify-end">
                    <button onClick={adicionarNota} disabled={salvandoNota || !novaNota.trim()}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: "#ea580c" }}
                      onMouseEnter={(e) => { if (!novaNota.trim()) return; (e.currentTarget as HTMLButtonElement).style.background = "#c2410c"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ea580c"; }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="M12 5v14"/>
                      </svg>
                      {salvandoNota ? "Salvando..." : "Adicionar nota"}
                    </button>
                  </div>
                </div>

                {timeline.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-neutral-400">
                    Sem histórico ainda.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {timeline.map((it, i) => {
                      const isNota = it.kind === "nota";
                      return (
                        <div key={it.id} className="flex gap-3" style={{ paddingBottom: 14 }}>
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full"
                              style={{ background: isNota ? "#3b82f6" : "#a1a1a1" }} />
                            {i < timeline.length - 1 && (
                              <span className="mt-1 flex-1" style={{ width: 1.5, background: "#e5e5e5" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                isNota ? "border-blue-300 bg-blue-100 text-blue-700" : "border-neutral-300 bg-neutral-100 text-neutral-500"
                              }`}>
                                {isNota ? "Nota" : (it.tipo || "Atividade")}
                              </span>
                              <span className="text-[10px] text-neutral-400">{relTime(it.criadaEm)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-snug text-neutral-700">{it.texto}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
              <div className="h-4" />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
