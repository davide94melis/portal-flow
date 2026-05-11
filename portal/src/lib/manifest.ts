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

export interface AggregatedTask {
  id: string;
  progresso: number;
  stato: string;
  branch: string | null;
  sourcesBranch: string;
}

export async function getAggregatedProgress(
  projectSlug: string,
  brName: string
): Promise<AggregatedTask[] | null> {
  const project = await getProject(projectSlug);
  if (!project) return null;

  const repo = toRepoRef(project);
  const manifest = await getManifest(projectSlug, brName);
  if (!manifest) return null;

  // Collect branch names referenced by tasks
  const taskBranches = new Set<string>();
  for (const task of manifest.piano.task) {
    if (task.branch) taskBranches.add(task.branch);
  }

  if (taskBranches.size === 0) {
    return manifest.piano.task.map((t) => ({
      id: t.id,
      progresso: t.progresso,
      stato: t.stato,
      branch: t.branch,
      sourcesBranch: repo.branch,
    }));
  }

  // Try cache first
  const cacheKey = `aggregated:${projectSlug}:${brName}`;
  const cached = await redis.get<AggregatedTask[]>(cacheKey);
  if (cached) return cached;

  // Read manifest from each task branch
  const branchManifests: Map<string, BRManifest> = new Map();
  for (const branch of taskBranches) {
    try {
      const content = await readFile(
        { ...repo, branch },
        `${BRS_DIR}/${brName}/manifest.json`
      );
      if (content) {
        branchManifests.set(branch, JSON.parse(content) as BRManifest);
      }
    } catch {
      // Branch might not exist or manifest not found — skip
    }
  }

  // Build aggregated view: highest progress wins
  const stateOrder: Record<string, number> = {
    da_iniziare: 0,
    bloccata: 1,
    sospesa: 1,
    annullata: 1,
    in_corso: 2,
    completata: 3,
  };

  const aggregated: AggregatedTask[] = manifest.piano.task.map((baseTask) => {
    let best = {
      progresso: baseTask.progresso,
      stato: baseTask.stato,
      source: repo.branch,
    };

    for (const [branch, branchManifest] of branchManifests) {
      const branchTask = branchManifest.piano.task.find((t) => t.id === baseTask.id);
      if (!branchTask) continue;

      if (branchTask.stato === "completata") {
        best = { progresso: 100, stato: "completata", source: branch };
        break;
      }

      if (
        branchTask.progresso > best.progresso ||
        (branchTask.progresso === best.progresso &&
          (stateOrder[branchTask.stato] ?? 0) > (stateOrder[best.stato] ?? 0))
      ) {
        best = { progresso: branchTask.progresso, stato: branchTask.stato, source: branch };
      }
    }

    return {
      id: baseTask.id,
      progresso: best.progresso,
      stato: best.stato,
      branch: baseTask.branch,
      sourcesBranch: best.source,
    };
  });

  // Cache for 60 seconds
  await redis.set(cacheKey, aggregated, { ex: 60 });

  return aggregated;
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
