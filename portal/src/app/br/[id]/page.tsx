"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { BRManifest } from "@/types/manifest";

export default function BRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [manifest, setManifest] = useState<BRManifest | null>(null);
  const [editingCodebase, setEditingCodebase] = useState(false);
  const [codebaseItems, setCodebaseItems] = useState<{ nome: string; sigla: string }[]>([]);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const completedTasks = manifest.piano.task.filter((t) => t.stato === "completata").length;
  const totalTasks = manifest.piano.task.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const canEditCodebase =
    session?.user?.role === "tech_lead" || session?.user?.role === "admin";

  async function handleSaveCodebase() {
    const filtered = codebaseItems.filter((c) => c.nome && c.sigla);
    const res = await fetch(`/api/br/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_codebase", data: { codebase: filtered } }),
    });
    if (res.ok) {
      const updated = await res.json();
      setManifest(updated);
      setEditingCodebase(false);
    }
  }

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

      <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Codebase</h2>
          {canEditCodebase && !editingCodebase && (
            <button
              onClick={() => {
                setCodebaseItems([...manifest.codebase]);
                setEditingCodebase(true);
              }}
              className="text-sm text-primary hover:underline"
            >
              Modifica
            </button>
          )}
        </div>

        {editingCodebase ? (
          <div>
            {codebaseItems.map((cb, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input
                  value={cb.nome}
                  onChange={(e) => {
                    const u = [...codebaseItems];
                    u[i] = { ...u[i], nome: e.target.value };
                    setCodebaseItems(u);
                  }}
                  placeholder="Nome"
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <input
                  value={cb.sigla}
                  onChange={(e) => {
                    const u = [...codebaseItems];
                    u[i] = { ...u[i], sigla: e.target.value.toUpperCase() };
                    setCodebaseItems(u);
                  }}
                  placeholder="Sigla"
                  maxLength={5}
                  className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                {codebaseItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCodebaseItems(codebaseItems.filter((_, idx) => idx !== i))
                    }
                    className="text-sm text-danger hover:underline"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCodebaseItems([...codebaseItems, { nome: "", sigla: "" }])}
              className="mb-3 text-sm text-primary hover:underline"
            >
              + Aggiungi codebase
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveCodebase}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Salva
              </button>
              <button
                onClick={() => setEditingCodebase(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : manifest.codebase.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {manifest.codebase.map((cb, i) => (
              <span key={i} className="rounded bg-primary/10 px-2 py-1 text-sm">
                <span className="font-medium text-primary">{cb.sigla}</span>
                <span className="ml-1 text-muted">{cb.nome}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nessuna codebase configurata.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/br/${id}/review`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Review</Link>
        <Link href={`/br/${id}/piano`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Piano</Link>
        <Link href={`/br/${id}/task`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface">Task</Link>
        {canEditCodebase && (
          <a
            href={`/api/br/${id}/export`}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface"
            download
          >
            Esporta Excel
          </a>
        )}
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
