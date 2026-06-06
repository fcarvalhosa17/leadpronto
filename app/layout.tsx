import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import Link from "next/link";

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
      <body className="min-h-screen antialiased" style={{ background: "#fff", color: "#171717" }}>
        <header
          className="sticky top-0 z-40 border-b border-border"
          style={{
            background: "color-mix(in oklch, #ffffff 92%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-lg"
                style={{ width: 28, height: 28, background: "#ea580c" }}
              >
                {/* MapPin icon */}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <span className="text-lg font-semibold tracking-tight" style={{ letterSpacing: "-0.03em", color: "#0a0a0a" }}>
                Lead<span style={{ color: "#ea580c" }}>Pronto</span>
              </span>
            </Link>

            <NavBar />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
