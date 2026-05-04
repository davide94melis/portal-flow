"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { BRManifest } from "@/types/manifest";

export default function BRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [manifest, setManifest] = useState<BRManifest | null>(null);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const completedTasks = manifest.piano.task.filter((t) => t.stato === "completata").length;
  const totalTasks = manifest.piano.task.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{manifest.nome}</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {manifest.stato_pipeline}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted">Creato</p>
          <p className="font-medium">{manifest.data_creazione}</p>
          <p className="text-xs text-muted">{manifest.creato_da}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted">Documenti</p>
          <p className="font-medium">{manifest.documenti.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted">Progresso</p>
          <p className="font-medium">{completedTasks}/{totalTasks} task ({progress}%)</p>
          {totalTasks > 0 && (
            <div className="mt-1 h-1.5 rounded-full bg-surface">
              <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Link href={`/br/${id}/review`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Review</Link>
        <Link href={`/br/${id}/piano`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Piano</Link>
        <Link href={`/br/${id}/task`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Task</Link>
        <Link href={`/br/${id}/qa`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">QA</Link>
      </div>

      <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-medium">Timeline</h2>
        <div className="space-y-2">
          {[...manifest.timeline].reverse().slice(0, 10).map((entry, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="shrink-0 text-xs text-muted">{new Date(entry.data).toLocaleString("it-IT")}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{entry.stage}</span>
              <span>{entry.azione}</span>
              <span className="text-muted">— {entry.attore}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
