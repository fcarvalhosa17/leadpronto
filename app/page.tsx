"use client";

import { useState } from "react";
import { BuscaForm } from "@/components/BuscaForm";
import { LeadsTable } from "@/components/LeadsTable";

export default function HomePage() {
  const [buscaId, setBuscaId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Geracao de leads</h1>
        <p className="mt-1 text-sm text-gray-400">
          Pesquise por nicho e regiao. O worker em background qualifica cada lead
          com PageSpeed Insights e Safe Browsing.
        </p>
      </div>

      <BuscaForm onBuscaCriada={setBuscaId} />

      <LeadsTable buscaId={buscaId} />
    </div>
  );
}
