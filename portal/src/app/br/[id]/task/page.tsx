"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { BRManifest, Task } from "@/types/manifest";

const statusColors: Record<string, string> = {
  da_iniziare: "bg-secondary/10 text-secondary",
  in_corso: "bg-primary/10 text-primary",
  completata: "bg-success/10 text-success",
  bloccata: "bg-danger/10 text-danger",
  annullata: "bg-muted/10 text-muted",
  sospesa: "bg-warning/10 text-warning",
};

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [manifest, setManifest] = useState<BRManifest | null>(null);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const myTasks = manifest.piano.task.filter(
    (t) => t.owner.toLowerCase() === (session?.user?.name || "").toLowerCase() && t.stato !== "annullata"
  );

  function getDeps(t: Task) {
    return t.dipendenze.map((depId) => {
      const dep = manifest!.piano.task.find((x) => x.id === depId);
      return dep ? `${dep.id} (${dep.stato})` : depId;
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Le mie task — {manifest.nome}</h1>
      <p className="text-sm text-muted">Le task vengono eseguite via Claude Code (br-pipeline). Questa vista e read-only.</p>

      {myTasks.length === 0 ? (
        <p className="text-muted">Nessuna task assegnata.</p>
      ) : (
        <div className="space-y-3">
          {myTasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-muted">{t.id}</span>
                  <h3 className="font-medium">{t.attivita}</h3>
                  <p className="mt-0.5 text-xs text-muted">{t.area} · Wave {t.wave} · {t.priorita} · {t.effort_gg}g</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[t.stato] || ""}`}>{t.stato}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${t.progresso}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-muted">{t.progresso}%</p>
              {t.dipendenze.length > 0 && (
                <p className="mt-2 text-xs text-muted">Dipende da: {getDeps(t).join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
