"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import type { UserRole } from "@/types/next-auth";

function ShellContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        userName={session.user.name || "Utente"}
        userRole={(session.user.role as UserRole) || "dev"}
      />
      <main className="flex-1 overflow-auto bg-surface p-6">
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ShellContent>{children}</ShellContent>
    </SessionProvider>
  );
}
