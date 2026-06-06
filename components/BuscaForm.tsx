"use client";

import { useState } from "react";

interface Props {
  onBuscaCriada: (buscaId: string) => void;
}

const inputCls = "h-8 w-full rounded-lg border border-border bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-primary focus:ring-[3px] focus:ring-orange-500/40";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500";

export function BuscaForm({ onBuscaCriada }: Props) {
  const [nicho, setNicho] = useState("");
  const [regiao, setRegiao] = useState("");
  const [raioKm, setRaioKm] = useState(3);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch("/api/busca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicho, regiao, raioKm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      onBuscaCriada(data.buscaId);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white px-5 pb-5 pt-4"
      style={{ boxShadow: "0 0 0 1px oklch(0.145 0 0 / 0.10), 0 1px 3px 0 oklch(0.145 0 0 / 0.08)" }}>
      <div className="mb-4 text-[15px] font-semibold text-neutral-950">Nova busca</div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <div>
            <label className={labelCls}>Nicho</label>
            <input value={nicho} onChange={(e) => setNicho(e.target.value)}
              placeholder="ex: academia, dentista" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Região</label>
            <input value={regiao} onChange={(e) => setRegiao(e.target.value)}
              placeholder="ex: Vila Mariana, São Paulo" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Raio (km)</label>
            <input type="number" min={1} max={50} value={raioKm}
              onChange={(e) => setRaioKm(Number(e.target.value))} className={inputCls} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: loading ? "#c2410c" : "#ea580c", minWidth: 130 }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#c2410c"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#ea580c"; }}>
              {loading ? (
                <>
                  <svg className="lp-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Buscando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  Buscar leads
                </>
              )}
            </button>
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">Erro: {erro}</p>}
        {loading && (
          <p className="mt-3 text-xs text-neutral-500">
            Geocodificando região e raspando o Google Maps. Isso pode levar 30s a 2min.
          </p>
        )}
      </form>
    </div>
  );
}
