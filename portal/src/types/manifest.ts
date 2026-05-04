export type StatoPipeline =
  | "onboard"
  | "review"
  | "clarify"
  | "analyze"
  | "approve"
  | "execute"
  | "verify"
  | "update"
  | "report";

export type StatoTask =
  | "da_iniziare"
  | "in_corso"
  | "completata"
  | "bloccata"
  | "annullata"
  | "sospesa";

export type Priorita = "P0" | "P1" | "P2";

export type Seniority = "Junior" | "Mid" | "Senior" | "Lead";

export type TipoDocumento = "br" | "spec" | "mapping" | "mockup" | "altro";

export type CategoriaProblema =
  | "Gap funzionale"
  | "Ambiguita"
  | "Contraddizione"
  | "Dipendenza non specificata"
  | "Vincolo tecnico"
  | "Sicurezza"
  | "Performance"
  | "UX";

export type Ruolo =
  | "funzionale"
  | "tech_lead"
  | "dev"
  | "qa"
  | "admin"
  | "sistema";

export interface CodebaseEntry {
  nome: string;
  sigla: string;
}

export interface Documento {
  originale: string;
  convertito: string | null;
  tipo: TipoDocumento;
}

export interface TeamMember {
  nome: string;
  email: string;
  ruolo: string;
  seniority: Seniority;
  reviewer?: string | null;
}

export interface Problema {
  id: string;
  titolo: string;
  categoria: CategoriaProblema;
  bloccante: boolean;
  dove: string;
  problema: string;
  impatto: string;
  domanda: string;
  assunzione_proposta: string | null;
  risposta: string | null;
  data_risposta: string | null;
  stato: "aperto" | "risposto" | "accettato" | "rifiutato";
}

export interface Assunzione {
  id: string;
  problema_rif: string;
  assunzione: string;
  rischio: "Basso" | "Medio" | "Alto";
  costo_correzione: "Basso" | "Medio" | "Alto";
  stato: "in_attesa" | "confermata" | "rifiutata";
  risposta_funzionale: string | null;
}

export interface Disallineamento {
  id: string;
  tipo: "naming" | "struttura" | "logica" | "modello_dati" | "api";
  dove_doc: string;
  dove_codice: string;
  descrizione: string;
  impatto: string;
}

export interface Review {
  data: string | null;
  esito: "Senza bloccanti" | "Con bloccanti" | null;
  problemi: Problema[];
  assunzioni: Assunzione[];
  disallineamenti_codice: Disallineamento[];
}

export interface CriterioQA {
  id: string;
  funzionalita: string;
  criterio: string;
  fonte: "review" | "analisi" | "qa_team";
  validato_qa: boolean;
  risultato_test: "pass" | "fail" | null;
}

export interface QA {
  criteri_accettazione: CriterioQA[];
}

export interface MatriceEntry {
  id: string;
  funzionalita: string;
  stato_attuale: "assente" | "parziale" | "presente" | "diverso";
  stato_richiesto: string;
  gap: string;
  codebase: string;
  file_coinvolti?: string[];
}

export interface GapAnalysis {
  data: string | null;
  matrice: MatriceEntry[];
  gap_aperti: string[];
}

export interface Stream {
  id: string;
  nome: string;
  descrizione: string;
}

export interface Task {
  id: string;
  stream: string;
  owner: string;
  area: string;
  priorita: Priorita;
  wave: number;
  attivita: string;
  descrizione: string;
  dipendenze: string[];
  effort_gg: number;
  branch: string | null;
  progresso: number;
  stato: StatoTask;
  qa_criteri: string[];
  note?: string;
}

export interface Piano {
  approvato: boolean;
  data_approvazione: string | null;
  approvato_da: string | null;
  stream: Stream[];
  task: Task[];
}

export interface TimelineEntry {
  data: string;
  attore: string;
  ruolo: Ruolo;
  azione: string;
  stage: StatoPipeline;
}

export interface BRManifest {
  version: "1.0";
  nome: string;
  data_creazione: string;
  creato_da: string;
  stato_pipeline: StatoPipeline;
  codebase: CodebaseEntry[];
  documenti: Documento[];
  team: TeamMember[];
  review: Review;
  qa: QA;
  gap_analysis: GapAnalysis;
  piano: Piano;
  timeline: TimelineEntry[];
}
