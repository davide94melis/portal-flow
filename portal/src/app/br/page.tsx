"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BRSummary } from "@/lib/manifest";

const stageColors: Record<string, string> = {
  onboard: "bg-secondary/10 text-secondary",
  review: "bg-warning/20 text-warning",
  clarify: "bg-warning/20 text-warning",
  analyze: "bg-primary/10 text-primary",
  approve: "bg-primary/10 text-primary",
  execute: "bg-success/10 text-success",
  verify: "bg-success/10 text-success",
  update: "bg-danger/10 text-danger",
  report: "bg-success/10 text-success",
};

export default function BRListPage() {
  const [brs, setBrs] = useState<BRSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/br")
      .then((r) => r.json())
      .then((data) => {
        setBrs(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-muted">Caricamento...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Business Requirements</h1>

      {brs.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-muted">Nessun BR trovato.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brs.map((br) => (
            <Link
              key={br.nome}
              href={`/br/${br.nome}`}
              className="block rounded-lg border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-foreground">{br.nome}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Creato il {br.data_creazione} da {br.creato_da}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {br.taskCount > 0 && (
                    <span className="text-xs text-muted">
                      {br.taskCompleted}/{br.taskCount} task
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      stageColors[br.stato_pipeline] || ""
                    }`}
                  >
                    {br.stato_pipeline}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
