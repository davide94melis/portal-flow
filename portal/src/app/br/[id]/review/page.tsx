"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { BRManifest, Problema } from "@/types/manifest";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [manifest, setManifest] = useState<BRManifest | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  async function saveResponse(problemId: string, risposta: string) {
    setSaving(problemId);
    const res = await fetch(`/api/br/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond_problem", data: { problemId, risposta } }),
    });
    if (res.ok) setManifest(await res.json());
    setSaving(null);
  }

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const { problemi } = manifest.review;
  const bloccanti = problemi.filter((p) => p.bloccante);
  const nonBloccanti = problemi.filter((p) => !p.bloccante);
  const answered = problemi.filter((p) => p.risposta).length;

  function ProblemCard({ p }: { p: Problema }) {
    const [risposta, setRisposta] = useState(p.risposta || "");
    return (
      <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-muted">{p.id}</span>
            <h3 className="font-medium">{p.titolo}</h3>
          </div>
          {p.stato === "risposto" && <span className="rounded bg-success/10 px-2 py-0.5 text-xs text-success">Risposto</span>}
          {(() => {
            if (!manifest) return null;
            const linked = manifest.review.assunzioni.find((a) => a.problema_rif === p.id);
            if (!linked) return null;
            if (linked.stato === "confermata") return <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Assunzione confermata</span>;
            if (linked.stato === "rifiutata") return <span className="rounded bg-warning/10 px-2 py-0.5 text-xs text-warning">Usata la tua risposta</span>;
            return null;
          })()}
        </div>
        <p className="mt-1 text-sm text-muted">{p.problema}</p>
        <p className="mt-2 text-sm"><strong>Domanda:</strong> {p.domanda}</p>
        {p.assunzione_proposta && (
          <p className="mt-1 rounded bg-warning/10 px-2 py-1 text-xs text-warning">Assunzione: {p.assunzione_proposta}</p>
        )}
        <textarea
          value={risposta}
          onChange={(e) => setRisposta(e.target.value)}
          placeholder="Scrivi la tua risposta..."
          rows={2}
          className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => saveResponse(p.id, risposta)}
          disabled={!risposta || saving === p.id}
          className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving === p.id ? "Salvataggio..." : "Salva risposta"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review — {manifest.nome}</h1>
        <span className="text-sm text-muted">{answered}/{problemi.length} risposte</span>
      </div>

      {bloccanti.length > 0 && (
        <div>
          <div className="mb-2 rounded bg-danger/10 px-3 py-2 text-sm font-medium text-danger">Problemi bloccanti — rispondi prima di procedere</div>
          <div className="space-y-3">{bloccanti.map((p) => <ProblemCard key={p.id} p={p} />)}</div>
        </div>
      )}

      {nonBloccanti.length > 0 && (
        <div>
          <h2 className="mb-2 font-medium text-foreground">Problemi non bloccanti</h2>
          <div className="space-y-3">{nonBloccanti.map((p) => <ProblemCard key={p.id} p={p} />)}</div>
        </div>
      )}

      {problemi.length === 0 && <p className="text-muted">Nessuna domanda dal review.</p>}
    </div>
  );
}
