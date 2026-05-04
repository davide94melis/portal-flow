"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { BRManifest } from "@/types/manifest";

export default function PianoPage() {
  const { id } = useParams<{ id: string }>();
  const [manifest, setManifest] = useState<BRManifest | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  async function approvePlan() {
    setApproving(true);
    const res = await fetch(`/api/br/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_plan", data: {} }),
    });
    if (res.ok) setManifest(await res.json());
    setApproving(false);
  }

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const { piano } = manifest;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Piano — {manifest.nome}</h1>
        {piano.approvato ? (
          <span className="rounded bg-success/10 px-3 py-1 text-sm font-medium text-success">Approvato il {new Date(piano.data_approvazione!).toLocaleDateString("it-IT")}</span>
        ) : piano.task.length > 0 ? (
          <button onClick={approvePlan} disabled={approving} className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {approving ? "Approvazione..." : "Approva piano"}
          </button>
        ) : null}
      </div>

      {piano.stream.length > 0 && (
        <div className="space-y-2">
          {piano.stream.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-white p-3 shadow-sm">
              <p className="font-medium">{s.nome}</p>
              <p className="text-xs text-muted">{s.descrizione}</p>
            </div>
          ))}
        </div>
      )}

      {piano.task.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium text-muted">ID</th>
                <th className="px-3 py-2 font-medium text-muted">Attivita</th>
                <th className="px-3 py-2 font-medium text-muted">Owner</th>
                <th className="px-3 py-2 font-medium text-muted">Area</th>
                <th className="px-3 py-2 font-medium text-muted">P</th>
                <th className="px-3 py-2 font-medium text-muted">Wave</th>
                <th className="px-3 py-2 font-medium text-muted">Effort</th>
                <th className="px-3 py-2 font-medium text-muted">Stato</th>
                <th className="px-3 py-2 font-medium text-muted">%</th>
              </tr>
            </thead>
            <tbody>
              {piano.task.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-3 py-2">{t.attivita}</td>
                  <td className="px-3 py-2">{t.owner}</td>
                  <td className="px-3 py-2">{t.area}</td>
                  <td className="px-3 py-2">{t.priorita}</td>
                  <td className="px-3 py-2">{t.wave}</td>
                  <td className="px-3 py-2">{t.effort_gg}g</td>
                  <td className="px-3 py-2"><span className="rounded bg-surface px-1.5 py-0.5 text-xs">{t.stato}</span></td>
                  <td className="px-3 py-2">{t.progresso}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Nessuna task nel piano. Lancia l&apos;analisi (S3) da Claude Code.</p>
      )}
    </div>
  );
}
