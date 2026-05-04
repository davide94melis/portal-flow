"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BRSummary } from "@/lib/manifest";

const stageColors: Record<string, string> = {
  onboard: "bg-secondary/10 text-secondary", review: "bg-warning/20 text-warning",
  clarify: "bg-warning/20 text-warning", analyze: "bg-primary/10 text-primary",
  approve: "bg-primary/10 text-primary", execute: "bg-success/10 text-success",
  verify: "bg-success/10 text-success", update: "bg-danger/10 text-danger",
  report: "bg-success/10 text-success",
};

export default function BRListPage() {
  const [brs, setBrs] = useState<BRSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/br").then((r) => r.json()).then((data) => { setBrs(data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-muted">Caricamento...</p>;

  const grouped = brs.reduce((acc, br) => {
    const key = br.projectNome || br.projectSlug;
    (acc[key] = acc[key] || []).push(br);
    return acc;
  }, {} as Record<string, BRSummary[]>);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Business Requirements</h1>
      {brs.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-muted">Nessun BR trovato.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([project, projectBrs]) => (
          <div key={project} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted uppercase tracking-wide">{project}</h2>
            <div className="space-y-2">
              {projectBrs.map((br) => (
                <Link key={`${br.projectSlug}--${br.nome}`} href={`/br/${br.projectSlug}--${br.nome}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-white p-4 shadow-sm hover:shadow-md">
                  <div>
                    <h3 className="font-medium text-foreground">{br.nome}</h3>
                    <p className="mt-0.5 text-xs text-muted">{br.data_creazione} — {br.creato_da}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {br.taskCount > 0 && <span className="text-xs text-muted">{br.taskCompleted}/{br.taskCount} task</span>}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageColors[br.stato_pipeline] || ""}`}>{br.stato_pipeline}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
