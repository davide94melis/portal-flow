# Gap Report: portal-flow vs claude-flow

Data: 2026-05-10

## Contesto

`claude-flow` contiene 7 skill standalone per la gestione dei Business Requirement:
- `br-reviewer`, `br-clarify`, `br-analyzer`, `br-executor`, `br-updater`, `br-progress-report`, `br-pipeline`

`portal-flow` nasce da `claude-flow` per automatizzare il processo e dare una piattaforma web (Next.js) che permetta a funzionali e sviluppatori di interagire piu' velocemente. portal-flow ha 2 componenti:
1. **br-pipeline skill** (`skill/br-pipeline/SKILL.md`) — riscrittura manifest-based con stage S0-S8
2. **BR Portal** (`portal/`) — web app Next.js su Vercel con viste per ruolo

Questo documento elenca i gap tra le due repo: cosa claude-flow ha e portal-flow no, cosa portal-flow ha cambiato intenzionalmente, e cosa va rimosso (ruolo QA).

---

## Legenda

| Simbolo | Significato |
|---|---|
| **GAP** | Feature presente in claude-flow, assente o incompleta in portal-flow |
| **DESIGN** | Differenza intenzionale di design — non e' un gap da colmare |
| **REMOVE** | Feature presente in portal-flow che va rimossa (QA) |

---

## G1 — Cross-branch progress aggregation

**Tipo:** GAP — CRITICO

**Dove in claude-flow:**
- `skills/br-pipeline/SKILL.md` — Fase 2, sezione "Lettura progresso aggregata (cross-branch)"
- `skills/br-executor/SKILL.md` — Fase 3, sezione "Lettura progresso aggregata (cross-branch)"
- `skills/br-progress-report/SKILL.md` — Fase 2, sezione "Lettura progresso aggregata (cross-branch)"

**Cosa fa:**
Quando piu' sviluppatori lavorano su branch diversi, ognuno aggiorna il PROGRESSO solo sul proprio feature branch. Senza aggregazione, il progresso degli altri non e' visibile. La logica:

1. `git fetch origin` per sincronizzare i branch remoti
2. Legge il piano per estrarre gli ID di tutte le task e i nomi branch
3. Se il piano ha colonna **Branch**: usa i nomi branch dal piano. Se no: cerca branch remoti con `git branch -r | grep`
4. Per ogni branch trovato, prova a leggere il PROGRESSO da 3 percorsi (`plans/in-progress/`, `plans/todo/`, `plans/done/`)
5. Aggrega per task con regola **"highest progress wins"**: se una versione mostra "Completata" (100%), vince sempre; altrimenti prende il progresso % piu' alto
6. Ricalcola le metriche di riepilogo dalla vista aggregata
7. Fallback: se `git fetch` fallisce, usa il file locale con warning

**Dove in portal-flow:**
- `skill/br-pipeline/SKILL.md` — Stage S5 Execute: legge solo dal manifest locale, non aggrega
- `portal/` — le API leggono il manifest dal repo via GitHub API, non aggregano da branch remoti

**Impatto:** Senza questa feature, la dashboard e la skill mostrano solo il progresso locale. Il TL/PM non vede il progresso reale del team.

**Adattamento necessario per portal-flow:**
In portal-flow il progresso e' nel manifest JSON (`piano.task[].progresso`), non nei file MD. La logica di aggregazione va adattata:
- Ogni dev aggiorna il manifest sul proprio feature branch
- L'aggregazione deve leggere `manifest.json` da tutti i branch remoti (non i file PROGRESSO_BR.md)
- La regola "highest progress wins" resta identica
- Il portale dovrebbe esporre questa vista aggregata nella dashboard TL/PM

---

## G2 — Excel progress report

**Tipo:** GAP — MEDIA

**Dove in claude-flow:**
- `skills/br-progress-report/SKILL.md` — skill completa

**Cosa fa:**
Genera un file `.xlsx` con `openpyxl` contenente 3 fogli:

1. **Task** — tabella con 14 colonne (ID, Stream, Attivita', Descrizione, Owner, Area, Priorita', Wave, Dipendenze, Effort, Branch, Progresso, Stato, Note), formattazione condizionale per progresso e stato, filtri attivi, righe alternate
2. **Per Sviluppatore** — riepilogo per dev (task totali, completate, in corso, progresso medio, effort), riga TOTALE in fondo
3. **Riepilogo** — dashboard complessiva con metriche, effort, stato per wave

Usa la lettura progresso aggregata (G1) come sorgente dati. Supporta sia creazione da zero che aggiornamento preservando note manuali.

**Dove in portal-flow:**
Assente. Nessun equivalente ne' nella skill ne' nel portale.

**Nota:** Il portale potrebbe compensare con una dashboard live, ma l'Excel serve per reportistica esterna (management, stakeholder che non accedono al portale).

---

## G3 — Dettaglio stream e merge task nella generazione piano

**Tipo:** GAP — MEDIA

**Dove in claude-flow:**
- `skills/br-analyzer/SKILL.md` — Fase 4, sezione "Principi per la creazione delle task"

**Cosa fa:**
Regole esplicite per la generazione del piano:

- **Stream funzionali**: raggruppa task per area funzionale (es. `stream-booking`, `stream-monitoraggio`, `stream-fondazioni`). Le task nello stesso stream condividono contesto di codice.
- **Merge task automatiche**: quando una task in stream-X dipende da una task in stream-Y, br-analyzer inserisce automaticamente una merge task `T-MERGE-NNN`. La merge task:
  - Appartiene allo stream sorgente
  - Ha effort ~0.5gg e type "merge"
  - Specifica quale branch mergiare, in quale branch base, e di verificare la build
  - Si colloca tra le wave come punto di sincronizzazione
- **Branch convention**: ogni task ha un branch `feature/<br-name>-<slug-attivita>`. Per merge task il valore e' `—`.
- **Indipendenza massima**: se due task condividono una dipendenza, la task sorgente va nella wave precedente
- **Assegnazione per competenza e seniority**: senior per design/review/sblocco, junior con scope chiuso e reviewer assegnato
- **Granularita'**: 1-5 giorni per task. Troppo grande: spezza. Troppo piccola (< 2h): accorpa.
- **Autosufficiente per Claude Code**: ogni task contiene file esatti da modificare, pattern da seguire, criteri di completamento

**Dove in portal-flow:**
- `skill/br-pipeline/SKILL.md` — Stage S3 menziona stream e merge task ma con meno dettaglio. Il manifest schema supporta la struttura (`stream[]`, `task[]` con `T-MERGE-*` pattern) ma la guida per la generazione e' meno prescriptiva.

**Cosa manca specificamente:**
- Le regole per decidere quando inserire una merge task
- La convenzione di naming branch esplicita nel piano
- La logica di "autosufficienza per Claude Code" (ogni task deve contenere file esatti, pattern, criteri)
- I livelli di dettaglio per wave 0 fondazioni vs wave successive

---

## G4 — Rivalutazione automatica bloccanti/assunzioni

**Tipo:** GAP — MEDIA

**Dove in claude-flow:**
- `skills/br-clarify/SKILL.md` — Fase 4, "Rivalutazione"

**Cosa fa:**
Quando arrivano risposte dal funzionale, la skill esegue una rivalutazione strutturata:

**Per i bloccanti:**
- **Risolto**: la risposta chiarisce il punto → `Bloccante: Si → RISOLTO`
- **Non risolto**: risposta parziale o ambigua → resta bloccante, con nota + domanda di follow-up

**Per le assunzioni:**
- **Confermata**: la risposta del funzionale conferma l'assunzione
- **Rigettata**: la risposta e' diversa dall'assunzione → segnala esplicitamente al TL/PM, l'analisi usera' la risposta del funzionale al posto dell'assunzione

La rivalutazione viene presentata all'utente per conferma prima di scrivere.

**Dove in portal-flow:**
- `portal/src/app/api/br/[id]/route.ts` — action `respond_problem`: salva la risposta e cambia stato a "risposto", ma **non esegue rivalutazione**. Non c'e' logica per determinare se un bloccante e' risolto o se un'assunzione e' confermata/rigettata.
- `portal/src/app/br/[id]/review/page.tsx` — mostra le domande e permette risposte inline, ma senza feedback sulla rivalutazione.

**Impatto:** Il TL/PM deve valutare manualmente ogni risposta. Quando lancia S3 Analyze dalla CLI, le risposte vengono incorporate ma senza la pre-classificazione (risolto/confermata/rigettata) che br-clarify fornisce.

---

## G5 — Generazione viste MD retrocompatibili

**Tipo:** GAP — BASSA

**Dove in claude-flow:**
- `skills/br-pipeline/SKILL.md` — Fase 5, "Aggiornamento Manifest", e le singole skill che generano file specifici

**Cosa fa:**
Ogni volta che il manifest viene modificato, vengono generati file MD nella directory del BR:
- `REVIEW_BR.md` (da `manifest.review`)
- `GAP_REPORT_BR.md` (da `manifest.gap_analysis`)
- `PIANO_IMPLEMENTAZIONE_BR.md` (da `manifest.piano`)
- `PROGRESSO_BR.md` (da `manifest.piano.task`)

Questi file servono per chi preferisce leggere in formato human-readable senza parsare JSON.

**Dove in portal-flow:**
- `skill/br-pipeline/SKILL.md` — documenta i template di generazione per tutti e 4 i file MD. Le sezioni S1, S3, S5 dicono "Generazione vista MD" come ultimo step.
- Non e' verificato se vengono effettivamente generati in tutti gli stage. I template sono definiti ma la generazione potrebbe mancare in alcuni percorsi.

**Impatto:** Basso. Il portale compensa rendendo i dati accessibili via web.

---

## G6 — Check leggero vs codice nel review (S1)

**Tipo:** GAP — BASSA

**Dove in claude-flow:**
- `skills/br-reviewer/SKILL.md` — Fase 3.3, "Check leggero contro il codice"

**Cosa fa:**
Per ogni codebase fornito, verifica superficialmente:
- Entita' e modelli dati: il BR presuppone strutture che nel codice esistono ma sono diverse?
- Enum e costanti: il BR definisce stati che nel codice hanno valori/nomi diversi?
- API/endpoint: il BR descrive operazioni con naming diverso dal codice?
- Flussi e stati: il BR descrive transizioni che nel codice funzionano diversamente?

Usa agent di tipo `Explore` per parallelizzare l'esplorazione dei diversi codebase.

**Dove in portal-flow:**
- `skill/br-pipeline/SKILL.md` — S1 menziona il check vs codice ma dipende dalla disponibilita' dei path in `.br-local.json`. Un TL/PM potrebbe non aver configurato il file. La sezione e' meno dettagliata e non prescrive l'uso di agent Explore.

---

## D1 — Eliminazione DOCX (interazione inline)

**Tipo:** DESIGN — scelta intenzionale

**claude-flow:** br-reviewer genera REVIEW_BR.docx (pandoc), il funzionale lo compila, br-clarify lo rielabora. Il ciclo DOCX e' lento (conversioni, corruzione file, round multipli).

**portal-flow:** Il DOCX e' eliminato. Il funzionale risponde inline sul portale, campo per campo. Il salvataggio aggiorna direttamente il manifest via GitHub API.

**Valutazione:** Scelta corretta. Non e' un gap da colmare.

---

## D2 — Struttura brs/ vs plans/

**Tipo:** DESIGN — scelta intenzionale

**claude-flow:** usa `plans/todo/` → `plans/in-progress/` → `plans/done/` con spostamento fisico delle cartelle BR.

**portal-flow:** usa `brs/<nome>/` con stato nel campo `stato_pipeline` del manifest. Nessuno spostamento fisico.

**Valutazione:** Scelta corretta. Il manifest e' la single source of truth; la posizione nel filesystem non determina lo stato.

---

## R1 — Rimozione ruolo QA

**Tipo:** REMOVE

**Motivazione:** La validazione QA avverra' fuori dalla piattaforma. Il funzionale aprira' defect su Jira o tramite Excel esterno. I defect verranno lavorati al di fuori della piattaforma.

**Cosa rimuovere:**

### Nel portale (portal/)

| # | File | Cosa | Dettaglio |
|---|---|---|---|
| R1.1 | `src/types/next-auth.d.ts:5` | `"qa"` dal tipo `UserRole` | Rimuovere il valore dall'union type |
| R1.2 | `src/types/manifest.ts:58` | `"qa"` dal tipo `Ruolo` | Rimuovere il valore dall'union type |
| R1.3 | `src/types/manifest.ts:123-132` | Interfacce `CriterioQA`, `QA` | Rimuovere le interfacce |
| R1.4 | `src/types/manifest.ts:150` | `qa: QA` dalla `BRManifest` | Rimuovere il campo |
| R1.5 | `src/types/manifest.ts:169` | `qa_criteri: string[]` dalla `Task` | Rimuovere il campo |
| R1.6 | `src/components/nav/Sidebar.tsx:25-27` | Voce nav per ruolo `qa` | Rimuovere l'entry `qa: [...]` da `navByRole` |
| R1.7 | `src/app/br/[id]/qa/page.tsx` | Pagina QA | Eliminare il file |
| R1.8 | `src/app/api/br/[id]/route.ts:60-65` | Action `qa_validate` | Rimuovere il case dal switch |
| R1.9 | `src/middleware.ts` | Protezioni route per `/br/[id]/qa` | Rimuovere le regole per QA |
| R1.10 | `src/lib/manifest.ts` | Eventuali riferimenti a `qa` | Verificare e rimuovere |

### Nello schema condiviso (shared/)

| # | File | Cosa |
|---|---|---|
| R1.11 | `shared/manifest.schema.json:277-318` | Rimuovere `qa` dalle required properties, eliminare le definizioni `qa`, `criterio_qa` |
| R1.12 | `shared/manifest.schema.json:30` | Rimuovere `"verify"` dall'enum `stato_pipeline` |
| R1.13 | `shared/manifest.schema.json:427` | Rimuovere `qa_criteri` dalla definizione `task` e dalle `required` |
| R1.14 | `shared/manifest.schema.json:514` | Rimuovere `"qa"` dall'enum `ruolo` nella `timeline_entry` |
| R1.15 | `shared/manifest.example.json` | Rimuovere la sezione `qa` dall'esempio |

### Nella skill CLI (skill/)

| # | File | Cosa |
|---|---|---|
| R1.16 | `skill/br-pipeline/SKILL.md` | Rimuovere stage S6 (Verify) dalla tabella stage e dal diagramma |
| R1.17 | `skill/br-pipeline/SKILL.md` | Rimuovere generazione criteri QA da S1 (Review) |
| R1.18 | `skill/br-pipeline/SKILL.md` | Rimuovere arricchimento criteri QA da S3 (Analyze) |
| R1.19 | `skill/br-pipeline/SKILL.md` | Rimuovere `qa_criteri` dalla generazione task in S3 |
| R1.20 | `skill/br-pipeline/SKILL.md` | Rimuovere `"verify"` dall'enum degli stage e dalla tabella transizioni |

### Nella documentazione (docs/)

| # | File | Cosa |
|---|---|---|
| R1.21 | `docs/spec.md` | Rimuovere ruolo QA dalla tabella ruoli, sezione "Integrazione QA", stage S6, riferimenti a `qa_criteri`, criteri accettazione nel manifest |
| R1.22 | `docs/implementation-plan.md` | Rimuovere Task 6.5 (Vista QA), riferimenti a QA negli step di S1 e S3 |
| R1.23 | `README.md` | Rimuovere S6 Verify dalla tabella stage, riferimenti al ruolo QA |

### Impatto sulla struttura

- Il flusso diventa: `S0 Onboard → S1 Review → S2 Clarify → S3 Analyze → S4 Approve → S5 Execute → S7 Update → S8 Report`
- Lo stage S6 (Verify) sparisce
- Il manifest non ha piu' la sezione `qa`
- Le task non hanno piu' `qa_criteri`
- La timeline non ha piu' il ruolo `"qa"`
- Lo `stato_pipeline` non ha piu' il valore `"verify"`
- Il portale ha 4 ruoli invece di 5: funzionale, tech_lead, dev, admin

---

## Riepilogo

### Gap da colmare (in ordine di priorita')

| # | Gap | Priorita' | Effort stimato |
|---|---|---|---|
| G1 | Cross-branch progress aggregation | CRITICA | 3-4 gg |
| G2 | Excel progress report | MEDIA | 2-3 gg |
| G3 | Dettaglio stream/merge task nel piano | MEDIA | 1-2 gg |
| G4 | Rivalutazione automatica bloccanti/assunzioni | MEDIA | 2-3 gg |
| G5 | Generazione viste MD retrocompatibili | BASSA | 1 gg |
| G6 | Check vs codice in S1 | BASSA | 0.5 gg |

### Rimozione QA

| # | Area | Items | Effort stimato |
|---|---|---|---|
| R1 | Portale + Schema + Skill + Docs | 23 modifiche | 1-2 gg |

### Scelte di design confermate (non sono gap)

| # | Scelta | Motivazione |
|---|---|---|
| D1 | DOCX eliminato → interazione inline portale | Velocizza il ciclo funzionale-tecnico |
| D2 | `brs/` con stato in manifest invece di `plans/todo/in-progress/done/` | Semplifica, manifest e' single source of truth |
