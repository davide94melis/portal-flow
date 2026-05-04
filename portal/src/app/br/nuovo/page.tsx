"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  nome: string;
  slug: string;
  repoOwner: string;
  repoName: string;
  branch: string;
}

export default function NuovoBRPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSlug, setProjectSlug] = useState("");
  const [nome, setNome] = useState("");
  const [docs, setDocs] = useState<File[]>([]);
  const [mockups, setMockups] = useState<File[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!nome) {
      setError("Il nome è obbligatorio.");
      setLoading(false);
      return;
    }

    const fd = new FormData();
    fd.set("projectSlug", projectSlug);
    fd.set("nome", nome.toLowerCase().replace(/\s+/g, "-"));
    fd.set("team", JSON.stringify([]));

    for (const file of docs) {
      fd.append("docs", file);
    }
    for (const file of mockups) {
      fd.append("mockups", file);
    }

    const res = await fetch("/api/br", { method: "POST", body: fd });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Errore nella creazione");
      return;
    }

    router.push("/br");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuovo Business Requirement</h1>

      <form onSubmit={handleSubmit}>
        {step === 0 && (
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">1. Seleziona progetto</h2>

            {projects.length === 0 ? (
              <p className="text-sm text-muted">
                Nessun progetto configurato. Chiedi a un admin di crearne uno.
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Progetto</label>
                  <select
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Seleziona un progetto --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!projectSlug}
                  onClick={() => setStep(1)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  Avanti
                </button>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">2. Nome BR</h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Nome BR</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="es. booking-v2"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">
                Verra convertito in slug (minuscolo, senza spazi)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
              >
                Indietro
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Avanti
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium">3. Documenti</h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Documenti BR (DOCX, PDF, XLSX, PPTX)
              </label>
              <input
                type="file"
                multiple
                accept=".docx,.pdf,.xlsx,.pptx"
                onChange={(e) =>
                  setDocs(e.target.files ? Array.from(e.target.files) : [])
                }
                className="w-full text-sm"
              />
              {docs.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  {docs.length} file selezionati
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Mockup (PNG, JPG)
              </label>
              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg"
                onChange={(e) =>
                  setMockups(e.target.files ? Array.from(e.target.files) : [])
                }
                className="w-full text-sm"
              />
              {mockups.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  {mockups.length} file selezionati
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
              >
                Indietro
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {loading ? "Creazione..." : "Crea BR"}
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        )}
      </form>
    </div>
  );
}
