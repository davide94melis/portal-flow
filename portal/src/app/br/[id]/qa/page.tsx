"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { BRManifest } from "@/types/manifest";

export default function QAPage() {
  const { id } = useParams<{ id: string }>();
  const [manifest, setManifest] = useState<BRManifest | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/br/${id}`).then((r) => r.json()).then(setManifest);
  }, [id]);

  async function validate(criterioId: string, risultato: "pass" | "fail") {
    setSaving(criterioId);
    const res = await fetch(`/api/br/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "qa_validate", data: { criterioId, risultato } }),
    });
    if (res.ok) setManifest(await res.json());
    setSaving(null);
  }

  if (!manifest) return <p className="text-muted">Caricamento...</p>;

  const { criteri_accettazione } = manifest.qa;
  const validated = criteri_accettazione.filter((c) => c.validato_qa).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">QA — {manifest.nome}</h1>
        <span className="text-sm text-muted">{validated}/{criteri_accettazione.length} validati</span>
      </div>

      {criteri_accettazione.length === 0 ? (
        <p className="text-muted">Nessun criterio di accettazione definito.</p>
      ) : (
        <div className="space-y-3">
          {criteri_accettazione.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-muted">{c.id}</span>
                  <h3 className="font-medium">{c.funzionalita}</h3>
                  <p className="mt-0.5 text-sm">{c.criterio}</p>
                  <p className="mt-0.5 text-xs text-muted">Fonte: {c.fonte}</p>
                </div>
                {c.validato_qa && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${c.risultato_test === "pass" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {c.risultato_test}
                  </span>
                )}
              </div>
              {!c.validato_qa && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => validate(c.id, "pass")} disabled={saving === c.id} className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">Pass</button>
                  <button onClick={() => validate(c.id, "fail")} disabled={saving === c.id} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">Fail</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
