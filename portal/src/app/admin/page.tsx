"use client";

import { useEffect, useState, FormEvent } from "react";
import type { UserRole } from "@/types/next-auth";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface Project {
  nome: string;
  slug: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  codebase: { nome: string; sigla: string }[];
}

type Tab = "utenti" | "progetti";

const ROLES: UserRole[] = ["funzionale", "tech_lead", "dev", "qa", "admin"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("utenti");

  // --- Users state ---
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userError, setUserError] = useState("");

  // --- Projects state ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [projectNome, setProjectNome] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectCodebase, setProjectCodebase] = useState<{nome:string;sigla:string}[]>([{nome:"",sigla:""}]);

  // --- Users fetch ---
  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoadingUsers(false);
  }

  // --- Projects fetch ---
  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoadingProjects(false);
  }

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  // --- Users handlers ---
  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUserError("");
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setUserError(data.error || "Errore nella creazione");
      return;
    }

    setUserFormOpen(false);
    (e.target as HTMLFormElement).reset();
    fetchUsers();
  }

  async function handleDeleteUser(email: string) {
    if (!confirm(`Eliminare l'utente ${email}?`)) return;

    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    fetchUsers();
  }

  // --- Projects handlers ---
  function handleNomeChange(value: string) {
    setProjectNome(value);
    setProjectSlug(slugify(value));
  }

  function addProjectCodebase() {
    setProjectCodebase([...projectCodebase, { nome: "", sigla: "" }]);
  }

  function updateProjectCodebase(index: number, field: "nome" | "sigla", value: string) {
    const updated = [...projectCodebase];
    updated[index] = { ...updated[index], [field]: value };
    setProjectCodebase(updated);
  }

  function removeProjectCodebase(index: number) {
    setProjectCodebase(projectCodebase.filter((_, i) => i !== index));
  }

  async function handleCreateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProjectError("");
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: fd.get("nome"),
        slug: fd.get("slug"),
        repoOwner: fd.get("repoOwner"),
        repoName: fd.get("repoName"),
        branch: fd.get("branch") || "main",
        codebase: projectCodebase.filter(c => c.nome && c.sigla),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setProjectError(data.error || "Errore nella creazione");
      return;
    }

    setProjectFormOpen(false);
    setProjectNome("");
    setProjectSlug("");
    setProjectCodebase([{ nome: "", sigla: "" }]);
    (e.target as HTMLFormElement).reset();
    fetchProjects();
  }

  async function handleDeleteProject(slug: string) {
    if (!confirm(`Eliminare il progetto "${slug}"?`)) return;

    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    fetchProjects();
  }

  const loading = activeTab === "utenti" ? loadingUsers : loadingProjects;

  if (loading) {
    return <p className="text-muted">Caricamento...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("utenti")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "utenti"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Utenti
        </button>
        <button
          onClick={() => setActiveTab("progetti")}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === "progetti"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Progetti
        </button>
      </div>

      {/* ===== UTENTI TAB ===== */}
      {activeTab === "utenti" && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              Gestione utenti
            </h1>
            <button
              onClick={() => setUserFormOpen(!userFormOpen)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {userFormOpen ? "Chiudi" : "Nuovo utente"}
            </button>
          </div>

          {userFormOpen && (
            <form
              onSubmit={handleCreateUser}
              className="mb-6 rounded-lg border border-border bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nome</label>
                  <input
                    name="name"
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Ruolo</label>
                  <select
                    name="role"
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {userError && <p className="mt-2 text-sm text-danger">{userError}</p>}
              <button
                type="submit"
                className="mt-4 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Crea utente
              </button>
            </form>
          )}

          <div className="rounded-lg border border-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted">Nome</th>
                  <th className="px-4 py-3 font-medium text-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-muted">Ruolo</th>
                  <th className="px-4 py-3 font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Nessun utente registrato.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3 text-muted">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          className="text-xs text-danger hover:underline"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== PROGETTI TAB ===== */}
      {activeTab === "progetti" && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">
              Gestione progetti
            </h1>
            <button
              onClick={() => setProjectFormOpen(!projectFormOpen)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {projectFormOpen ? "Chiudi" : "Nuovo progetto"}
            </button>
          </div>

          {projectFormOpen && (
            <form
              onSubmit={handleCreateProject}
              className="mb-6 rounded-lg border border-border bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nome</label>
                  <input
                    name="nome"
                    required
                    value={projectNome}
                    onChange={(e) => handleNomeChange(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Slug</label>
                  <input
                    name="slug"
                    required
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Repo Owner</label>
                  <input
                    name="repoOwner"
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Repo Name</label>
                  <input
                    name="repoName"
                    required
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Branch</label>
                  <input
                    name="branch"
                    defaultValue="main"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium">Codebase</label>
                  {projectCodebase.map((cb, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                      <input
                        placeholder="Nome"
                        value={cb.nome}
                        onChange={(e) => updateProjectCodebase(i, "nome", e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <input
                        placeholder="Sigla"
                        value={cb.sigla}
                        onChange={(e) => updateProjectCodebase(i, "sigla", e.target.value)}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      {projectCodebase.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProjectCodebase(i)}
                          className="text-sm text-danger hover:underline"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addProjectCodebase}
                    className="text-sm text-primary hover:underline"
                  >
                    + Aggiungi codebase
                  </button>
                </div>
              </div>
              {projectError && <p className="mt-2 text-sm text-danger">{projectError}</p>}
              <button
                type="submit"
                className="mt-4 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Crea progetto
              </button>
            </form>
          )}

          <div className="rounded-lg border border-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted">Nome</th>
                  <th className="px-4 py-3 font-medium text-muted">Slug</th>
                  <th className="px-4 py-3 font-medium text-muted">Repository</th>
                  <th className="px-4 py-3 font-medium text-muted">Branch</th>
                  <th className="px-4 py-3 font-medium text-muted">Codebase</th>
                  <th className="px-4 py-3 font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted">
                      Nessun progetto registrato.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.slug} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{project.nome}</td>
                      <td className="px-4 py-3 text-muted">{project.slug}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          {project.repoOwner}/{project.repoName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{project.branch}</td>
                      <td className="px-4 py-3 text-muted">
                        {project.codebase?.length
                          ? project.codebase.map(c => c.sigla).join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteProject(project.slug)}
                          className="text-xs text-danger hover:underline"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
