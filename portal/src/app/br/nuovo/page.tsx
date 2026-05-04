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

interface CodebaseItem {
  nome: string;
  sigla: string;
}

export default function NuovoBRPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSlug, setProjectSlug] = useState("");
  const [nome, setNome] = useState("");
  const [codebase, setCodebase] = useState<CodebaseItem[]>([
    { nome: "", sigla: "" },
  ]);
  const [docs, setDocs] = useState<File[]>([]);
  const [mockups, setMockups] = useState<File[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  function addCodebase() {
    setCodebase([...codebase, { nome: "", sigla: "" }]);
  }

  function updateCodebase(i: number, field: keyof CodebaseItem, value: string) {
    const updated = [...codebase];
    updated[i] = { ...updated[i], [field]: value };
    setCodebase(updated);
  }

  function removeCodebase(i: number) {
    setCodebase(codebase.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validCodebase = codebase.filter((c) => c.nome && c.sigla);
    if (!nome || validCodebase.length === 0) {
      setError("Nome e almeno un codebase sono obbligatori.");
      setLoading(false);
      return;
    }

    const fd = new FormData();
    fd.set("projectSlug", projectSlug);
    fd.set("nome", nome.toLowerCase().replace(/\s+/g, "-"));
    fd.set("codebase", JSON.stringify(validCodebase));
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
            <h2 className="mb-4 text-lg font-medium">2. Informazioni base</h2>

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

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Codebase</label>
              {codebase.map((c, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input
                    value={c.nome}
                    onChange={(e) => updateCodebase(i, "nome", e.target.value)}
                    placeholder="Nome (es. back-end)"
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    value={c.sigla}
                    onChange={(e) =>
                      updateCodebase(i, "sigla", e.target.value.toUpperCase())
                    }
                    placeholder="Sigla (es. BE)"
                    maxLength={5}
                    className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  {codebase.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCodebase(i)}
                      className="text-sm text-danger hover:underline"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCodebase}
                className="text-sm text-primary hover:underline"
              >
                + Aggiungi codebase
              </button>
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
