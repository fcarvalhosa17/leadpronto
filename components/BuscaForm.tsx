"use client";

import { useState } from "react";

interface Props {
  onBuscaCriada: (buscaId: string) => void;
}

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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-5"
    >
      <h2 className="mb-4 text-base font-semibold">Nova busca</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_120px_auto]">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
            Nicho
          </label>
          <input
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            placeholder="ex: academia, dentista"
            required
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
            Regiao
          </label>
          <input
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            placeholder="ex: Vila Mariana, Sao Paulo"
            required
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
            Raio (km)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={raioKm}
            onChange={(e) => setRaioKm(Number(e.target.value))}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 md:w-auto"
          >
            {loading ? "Buscando..." : "Buscar leads"}
          </button>
        </div>
      </div>

      {erro && (
        <p className="mt-3 text-sm text-danger">Erro: {erro}</p>
      )}
      {loading && (
        <p className="mt-3 text-xs text-gray-400">
          Geocodificando regiao e raspando o Google Maps. Isso pode levar 30s a 2min.
        </p>
      )}
    </form>
  );
}
