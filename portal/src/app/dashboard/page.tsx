"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BRSummary } from "@/lib/manifest";

export default function DashboardPage() {
  const [brs, setBrs] = useState<BRSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/br").then((r) => r.json()).then((data) => { setBrs(data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-muted">Caricamento...</p>;

  const byStage = brs.reduce((acc, br) => {
    acc[br.stato_pipeline] = (acc[br.stato_pipeline] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(byStage).map(([stage, count]) => (
          <div key={stage} className="rounded-lg border border-border bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-semibold">{count}</p>
            <p className="text-xs text-muted">{stage}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {brs.map((br) => {
          const progress = br.taskCount > 0 ? Math.round((br.taskCompleted / br.taskCount) * 100) : 0;
          return (
            <Link key={br.nome} href={`/br/${br.nome}`} className="flex items-center justify-between rounded-lg border border-border bg-white p-4 shadow-sm hover:shadow-md">
              <div>
                <h2 className="font-medium">{br.nome}</h2>
                <p className="text-xs text-muted">{br.data_creazione} — {br.creato_da}</p>
              </div>
              <div className="flex items-center gap-4">
                {br.taskCount > 0 && (
                  <div className="w-24">
                    <div className="h-1.5 rounded-full bg-surface">
                      <div className="h-full rounded-full bg-success" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-muted">{progress}%</p>
                  </div>
                )}
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{br.stato_pipeline}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
