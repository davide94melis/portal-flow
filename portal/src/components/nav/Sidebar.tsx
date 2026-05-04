"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { UserRole } from "@/types/next-auth";

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  funzionale: [
    { label: "I miei BR", href: "/br" },
    { label: "Nuovo BR", href: "/br/nuovo" },
  ],
  tech_lead: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tutti i BR", href: "/br" },
  ],
  dev: [
    { label: "Le mie task", href: "/br" },
  ],
  qa: [
    { label: "Validazione", href: "/br" },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tutti i BR", href: "/br" },
    { label: "Utenti", href: "/admin" },
  ],
};

interface SidebarProps {
  userName: string;
  userRole: UserRole;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  const items = navByRole[userRole] || [];

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">BR Portal</h2>
        <p className="mt-1 text-xs text-muted">{userName}</p>
        <span className="mt-0.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {userRole.replace("_", " ")}
        </span>
      </div>

      <nav className="flex-1 p-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 block rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-danger"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
