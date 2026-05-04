import { readFile, writeFile, listFiles } from "./github";
import { redis } from "./redis";
import type { BRManifest, Project, RepoRef } from "@/types/manifest";

const BRS_DIR = "brs";

export async function getProject(slug: string): Promise<Project | null> {
  return redis.get<Project>(`project:${slug}`);
}

export async function listProjects(): Promise<Project[]> {
  const keys = await redis.keys("project:*");
  const projects: Project[] = [];
  for (const key of keys) {
    const p = await redis.get<Project>(key);
    if (p) projects.push(p);
  }
  return projects;
}

export async function createProject(data: Omit<Project, "id">): Promise<Project> {
  const project: Project = { ...data, id: crypto.randomUUID() };
  await redis.set(`project:${data.slug}`, project);
  return project;
}

export async function deleteProject(slug: string): Promise<void> {
  await redis.del(`project:${slug}`);
}

function toRepoRef(p: Project): RepoRef {
  return { owner: p.repoOwner, name: p.repoName, branch: p.branch };
}

export async function getManifest(
  projectSlug: string,
  brName: string
): Promise<BRManifest | null> {
  const project = await getProject(projectSlug);
  if (!project) return null;

  const content = await readFile(toRepoRef(project), `${BRS_DIR}/${brName}/manifest.json`);
  if (!content) return null;

  const manifest: BRManifest = JSON.parse(content);
  if (!manifest.version || !manifest.nome || !manifest.stato_pipeline) {
    throw new Error(`Invalid manifest for BR "${brName}": missing required fields`);
  }

  return manifest;
}

export async function updateManifest(
  projectSlug: string,
  brName: string,
  updater: (manifest: BRManifest) => BRManifest,
  commitMessage: string
): Promise<BRManifest> {
  const project = await getProject(projectSlug);
  if (!project) throw new Error(`Project "${projectSlug}" not found`);

  const current = await getManifest(projectSlug, brName);
  if (!current) throw new Error(`Manifest not found for BR "${brName}" in project "${projectSlug}"`);

  const updated = updater(current);
  const content = JSON.stringify(updated, null, 2);

  await writeFile(
    toRepoRef(project),
    `${BRS_DIR}/${brName}/manifest.json`,
    content,
    `[br-portal] ${brName}: ${commitMessage}`
  );

  return updated;
}

export interface BRSummary {
  nome: string;
  projectSlug: string;
  projectNome: string;
  stato_pipeline: string;
  data_creazione: string;
  creato_da: string;
  taskCount: number;
  taskCompleted: number;
}

export async function listBRs(projectSlug?: string): Promise<BRSummary[]> {
  const projects = projectSlug
    ? [await getProject(projectSlug)].filter(Boolean) as Project[]
    : await listProjects();

  const summaries: BRSummary[] = [];

  for (const project of projects) {
    const repo = toRepoRef(project);
    const dirs = await listFiles(repo, BRS_DIR);
    const brDirs = dirs.filter((p) => !p.includes("."));

    for (const dir of brDirs) {
      const brName = dir.replace(`${BRS_DIR}/`, "");
      const manifest = await getManifest(project.slug, brName);
      if (manifest) {
        summaries.push({
          nome: manifest.nome,
          projectSlug: project.slug,
          projectNome: project.nome,
          stato_pipeline: manifest.stato_pipeline,
          data_creazione: manifest.data_creazione,
          creato_da: manifest.creato_da,
          taskCount: manifest.piano.task.length,
          taskCompleted: manifest.piano.task.filter((t) => t.stato === "completata").length,
        });
      }
    }
  }

  return summaries;
}

export async function createBR(
  projectSlug: string,
  data: {
    nome: string;
    creato_da: string;
    codebase: { nome: string; sigla: string }[];
    team: BRManifest["team"];
  }
): Promise<BRManifest> {
  const project = await getProject(projectSlug);
  if (!project) throw new Error(`Project "${projectSlug}" not found`);

  const now = new Date().toISOString().split("T")[0];
  const manifest: BRManifest = {
    version: "1.0",
    nome: data.nome,
    data_creazione: now,
    creato_da: data.creato_da,
    stato_pipeline: "onboard",
    codebase: data.codebase,
    documenti: [],
    team: data.team,
    review: { data: null, esito: null, problemi: [], assunzioni: [], disallineamenti_codice: [] },
    qa: { criteri_accettazione: [] },
    gap_analysis: { data: null, matrice: [], gap_aperti: [] },
    piano: { approvato: false, data_approvazione: null, approvato_da: null, stream: [], task: [] },
    timeline: [{
      data: new Date().toISOString(),
      attore: data.creato_da,
      ruolo: "funzionale",
      azione: "BR creato",
      stage: "onboard",
    }],
  };

  const content = JSON.stringify(manifest, null, 2);
  await writeFile(
    toRepoRef(project),
    `${BRS_DIR}/${data.nome}/manifest.json`,
    content,
    `[br-portal] ${data.nome}: BR creato`
  );

  return manifest;
}
