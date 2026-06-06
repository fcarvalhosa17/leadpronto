"use client";

import { LeadsTable } from "@/components/LeadsTable";

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          CRM - Todos os leads
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Lista consolidada de todos os leads ja coletados em qualquer busca.
          Filtre por busca, status de qualificacao, status comercial ou score.
        </p>
      </div>

      <LeadsTable buscaId={null} mode="crm" />
    </div>
  );
}
