"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const links = [
  { href: "/",            label: "Busca" },
  { href: "/crm",         label: "CRM" },
  { href: "/crm/kanban",  label: "Kanban" },
  { href: "/crm/mapa",    label: "Mapa" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={[
              "h-8 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-orange-50 text-orange-700"
                : "text-neutral-500 hover:bg-surface hover:text-neutral-950",
            ].join(" ")}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
