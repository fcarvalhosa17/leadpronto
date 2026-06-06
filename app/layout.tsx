import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadPronto",
  description: "Geracao de leads B2B local com qualificacao automatica",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-gray-100 antialiased">
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <a href="/" className="text-lg font-semibold tracking-tight">
              LeadPronto
            </a>
            <nav className="flex gap-4 text-sm text-gray-400">
              <a href="/" className="hover:text-white">
                Busca
              </a>
              <a href="/crm" className="hover:text-white">
                CRM
              </a>
              <a href="/crm/kanban" className="hover:text-white">
                Kanban
              </a>
              <a href="/crm/mapa" className="hover:text-white">
                Mapa
              </a>
            </nav>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
