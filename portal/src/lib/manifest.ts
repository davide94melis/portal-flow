import { readFile, writeFile, listFiles } from "./github";
import type { BRManifest } from "@/types/manifest";

const BRS_DIR = "brs";

export async function getManifest(
  brName: string
): Promise<BRManifest | null> {
  const content = await readFile(`${BRS_DIR}/${brName}/manifest.json`);
  if (!content) return null;

  const manifest: BRManifest = JSON.parse(content);

  if (!manifest.version || !manifest.nome || !manifest.stato_pipeline) {
    throw new Error(`Invalid manifest for BR "${brName}": missing required fields`);
  }

  return manifest;
}

export async function updateManifest(
  brName: string,
  updater: (manifest: BRManifest) => BRManifest,
  commitMessage: string
): Promise<BRManifest> {
  const current = await getManifest(brName);
  if (!current) {
    throw new Error(`Manifest not found for BR "${brName}"`);
  }

  const updated = updater(current);
  const content = JSON.stringify(updated, null, 2);

  await writeFile(
    `${BRS_DIR}/${brName}/manifest.json`,
    content,
    `[br-portal] ${brName}: ${commitMessage}`
  );

  return updated;
}

export interface BRSummary {
  nome: string;
  stato_pipeline: string;
  data_creazione: string;
  creato_da: string;
  taskCount: number;
  taskCompleted: number;
}

export async function listBRs(): Promise<BRSummary[]> {
  const dirs = await listFiles(BRS_DIR);
  const brDirs = dirs.filter((p) => !p.includes("."));

  const summaries: BRSummary[] = [];

  for (const dir of brDirs) {
    const brName = dir.replace(`${BRS_DIR}/`, "");
    const manifest = await getManifest(brName);
    if (manifest) {
      summaries.push({
        nome: manifest.nome,
        stato_pipeline: manifest.stato_pipeline,
        data_creazione: manifest.data_creazione,
        creato_da: manifest.creato_da,
        taskCount: manifest.piano.task.length,
        taskCompleted: manifest.piano.task.filter(
          (t) => t.stato === "completata"
        ).length,
      });
    }
  }

  return summaries;
}

export async function createBR(data: {
  nome: string;
  creato_da: string;
  codebase: { nome: string; sigla: string }[];
  team: BRManifest["team"];
}): Promise<BRManifest> {
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
    review: {
      data: null,
      esito: null,
      problemi: [],
      assunzioni: [],
      disallineamenti_codice: [],
    },
    qa: {
      criteri_accettazione: [],
    },
    gap_analysis: {
      data: null,
      matrice: [],
      gap_aperti: [],
    },
    piano: {
      approvato: false,
      data_approvazione: null,
      approvato_da: null,
      stream: [],
      task: [],
    },
    timeline: [
      {
        data: new Date().toISOString(),
        attore: data.creato_da,
        ruolo: "funzionale",
        azione: "BR creato",
        stage: "onboard",
      },
    ],
  };

  const content = JSON.stringify(manifest, null, 2);
  await writeFile(
    `${BRS_DIR}/${data.nome}/manifest.json`,
    content,
    `[br-portal] ${data.nome}: BR creato`
  );

  return manifest;
}
