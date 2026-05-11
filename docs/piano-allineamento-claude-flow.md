# Piano di Allineamento portal-flow ← claude-flow

Data: 2026-05-10
Riferimento: [gap-report-portal-vs-claude-flow.md](./gap-report-portal-vs-claude-flow.md)

## Obiettivo

Portare portal-flow allo stesso livello di maturita' delle skill di claude-flow, rimuovere il ruolo QA, e consolidare le differenze intenzionali di design.

## Strategia

Il piano e' diviso in 3 fasi:

1. **Fase 0 — Rimozione QA** (prerequisito, sblocca tutto il resto)
2. **Fase 1 — Gap critici** (G1, G4)
3. **Fase 2 — Gap medi e bassi** (G2, G3, G5, G6)

Le fasi 1 e 2 sono indipendenti a livello di file — un dev puo' lavorare su G1 (skill) mentre un altro lavora su G2 (portale/Excel). La Fase 0 e' prerequisito perche' modifica i tipi condivisi e lo schema manifest usati da tutti gli altri task.

---

## Fase 0 — Rimozione QA

**Effort:** 1-2 gg
**Prerequisiti:** nessuno
**Obiettivo:** Eliminare completamente il ruolo QA, lo stage S6 Verify, i criteri di accettazione, e tutti i riferimenti correlati.

### Task 0.1 — Rimuovere QA dal manifest schema e dai tipi TypeScript

**File da modificare:**
- `shared/manifest.schema.json`
- `portal/src/types/manifest.ts`
- `portal/src/types/next-auth.d.ts`

**Modifiche schema JSON (`shared/manifest.schema.json`):**
- Rimuovere `"qa"` dalle `required` properties del root object (riga 7)
- Rimuovere la property `"qa"` dal root object
- Rimuovere le definizioni `qa` e `criterio_qa` da `$defs`
- Rimuovere `"verify"` dall'enum `stato_pipeline` (riga 30)
- Rimuovere `"qa_criteri"` dalle `required` della definizione `task` (riga 427)
- Rimuovere la property `qa_criteri` dalla definizione `task`
- Rimuovere `"qa"` dall'enum `ruolo` nella definizione `timeline_entry` (riga 514)

**Modifiche tipi TS (`portal/src/types/manifest.ts`):**
- Rimuovere `"verify"` da `StatoPipeline`
- Rimuovere `"qa"` da `Ruolo`
- Rimuovere le interfacce `CriterioQA` e `QA`
- Rimuovere `qa: QA` da `BRManifest`
- Rimuovere `qa_criteri: string[]` da `Task`

**Modifiche auth (`portal/src/types/next-auth.d.ts`):**
- Rimuovere `"qa"` da `UserRole`

### Task 0.2 — Rimuovere QA dal portale (componenti, pagine, API)

**File da modificare:**
- `portal/src/components/nav/Sidebar.tsx`
- `portal/src/app/api/br/[id]/route.ts`
- `portal/src/middleware.ts`
- `portal/src/lib/manifest.ts`

**File da eliminare:**
- `portal/src/app/br/[id]/qa/page.tsx`

**Modifiche Sidebar:**
- Rimuovere l'entry `qa: [{ label: "Validazione", href: "/br" }]` da `navByRole`

**Modifiche API route (`/api/br/[id]/route.ts`):**
- Rimuovere il case `qa_validate` dal switch nel PATCH handler

**Modifiche middleware:**
- Rimuovere le regole di protezione route per `/br/[id]/qa` e per il ruolo `qa`

**Modifiche manifest.ts:**
- Verificare e rimuovere eventuali riferimenti a `qa` nel layer di lettura/scrittura

### Task 0.3 — Rimuovere QA dalla skill CLI

**File da modificare:**
- `skill/br-pipeline/SKILL.md`

**Modifiche:**
- Rimuovere stage S6 (Verify) dalla tabella stage e dal diagramma ASCII del flusso
- In S1 (Review): rimuovere la sezione "4. Generazione criteri QA iniziali" e i riferimenti a `manifest.qa.criteri_accettazione[]`
- In S3 (Analyze): rimuovere la sezione "5. QA test plan" e i riferimenti a `qa_criteri` nella generazione delle task
- Rimuovere `"verify"` dall'enum degli stage nella sezione Entry Point
- Aggiornare la tabella delle transizioni stato_pipeline (rimuovere `verify`)
- Aggiornare il diagramma del flusso: `S0 → S1 → S2 → S3 → S4 → S5 → S7 → S8`

### Task 0.4 — Rimuovere QA dalla documentazione

**File da modificare:**
- `docs/spec.md`
- `docs/implementation-plan.md`
- `README.md`
- `shared/manifest.example.json`

**Modifiche spec.md:**
- Rimuovere il ruolo QA dalla tabella "Ruoli e Viste" (4 ruoli → 3: Funzionale, TL/PM, Dev)
- Rimuovere la "Vista QA" dalla sezione "Viste portale"
- Rimuovere lo stage S6 (Verify) dalla tabella "Stage del pipeline" e dal diagramma di sequenza
- Rimuovere la sezione "Integrazione QA" (S1, S3, S6)
- Rimuovere `qa` dal manifest example nella spec
- Rimuovere `qa_criteri` dalla struttura task nella spec
- Aggiornare la tabella notifiche (rimuovere eventi QA)
- Aggiornare la tabella vincoli/decisioni (rimuovere riga QA)
- Aggiornare la sezione "Scope di implementazione"

**Modifiche implementation-plan.md:**
- Rimuovere Task 6.5 (Vista QA)
- Rimuovere riferimenti a criteri QA in Task 3.1 (S1) e Task 3.2 (S3)
- Aggiornare Task 5.4 (Sidebar — rimuovere voce QA)
- Aggiornare la verifica E2E (rimuovere QA flow)

**Modifiche README.md:**
- Rimuovere S6 Verify dalla tabella stage
- Rimuovere riferimenti al ruolo QA
- Aggiornare il diagramma POM

**Modifiche manifest.example.json:**
- Rimuovere la sezione `qa` dall'esempio
- Rimuovere `qa_criteri` dalle task di esempio

### Task 0.5 — Verifica coerenza post-rimozione

**Azioni:**
- Verificare che `portal/` compili senza errori TypeScript (`npx tsc --noEmit`)
- Verificare che il manifest.example.json sia valido rispetto allo schema aggiornato
- Verificare che nessun file referenzi piu' `qa`, `QA`, `verify`, `criteri_accettazione`, `qa_criteri`, `validato_qa`, `risultato_test`
- Grep completo: `grep -ri "qa\|verify\|criteri.*accettazione\|validato" portal/src/ skill/ shared/ docs/`

---

## Fase 1 — Gap Critici

**Effort:** 5-7 gg
**Prerequisiti:** Fase 0 completata
**Obiettivo:** Implementare la cross-branch progress aggregation e la rivalutazione automatica.

### Task 1.1 — Cross-branch progress aggregation nella skill CLI (G1)

**File da modificare:**
- `skill/br-pipeline/SKILL.md`

**Obiettivo:** Aggiungere la logica di aggregazione cross-branch adattata al modello manifest JSON di portal-flow.

**Sezione da aggiungere:** "Lettura progresso aggregata (cross-branch)" — come utility condivisa usata da S5 Execute e dalla dashboard TL/PM.

**Contenuto della sezione:**

1. `git fetch origin` per sincronizzare i branch remoti

2. Leggere il manifest corrente per estrarre:
   - Gli ID di tutte le task (`piano.task[].id`)
   - I nomi branch di ogni task (`piano.task[].branch`)
   - Il nome del BR (`nome`)

3. Trovare i branch remoti da controllare:
   - Per ogni task con `branch` diverso da null: verificare che `origin/<branch>` esista con `git branch -r | grep "<branch>"`
   - Fallback: cercare branch con `git branch -r | grep -i "feature/<nome-br>"`

4. Per ogni branch trovato, leggere il manifest dal branch remoto:
   ```bash
   git show origin/<branch>:brs/<nome>/manifest.json
   ```
   Parsare il JSON e estrarre `piano.task[]` con progresso e stato.

5. Aggregare per task con regola "highest progress wins":
   - Per ogni task, confrontare le versioni da tutti i branch
   - Se una versione mostra `stato == "completata"` (progresso 100%), vince sempre
   - Altrimenti, prendere la versione con il progresso % piu' alto
   - Se due versioni hanno lo stesso %, prendere quella con lo stato piu' avanzato (`in_corso` > `da_iniziare`)

6. Ricalcolare le metriche di riepilogo dalla vista aggregata

7. Fallback: se `git fetch` fallisce, usare il manifest locale con warning

**Punti dove usare l'aggregazione:**
- S5 Execute: prima di controllare le dipendenze e di selezionare la prossima task
- Dashboard TL/PM: prima di mostrare il progresso di un BR in stato `execute`/`approved`
- Report: quando l'utente chiede lo stato di avanzamento

### Task 1.2 — Cross-branch progress aggregation nel portale (G1)

**File da creare/modificare:**
- `portal/src/lib/manifest.ts` — aggiungere funzione `getAggregatedProgress(brName)`
- `portal/src/app/api/br/[id]/route.ts` — esporre endpoint per progresso aggregato
- `portal/src/app/dashboard/page.tsx` — usare il progresso aggregato nella dashboard
- `portal/src/app/br/[id]/page.tsx` — usare il progresso aggregato nel dettaglio BR

**Logica server-side:**
La GitHub API permette di leggere file da branch diversi:
```
GET /repos/{owner}/{repo}/contents/brs/{nome}/manifest.json?ref={branch}
```

La funzione `getAggregatedProgress` deve:
1. Listare i branch del repo con GitHub API (`GET /repos/{owner}/{repo}/branches`)
2. Filtrare quelli che corrispondono alle task del BR (campo `branch` nelle task)
3. Per ogni branch, leggere il manifest e estrarre il progresso delle task
4. Applicare la regola "highest progress wins"
5. Ritornare la lista task con progresso aggregato

**Cache:** Il progresso aggregato puo' essere cachato (Vercel KV) con TTL di 60 secondi per evitare chiamate eccessive alla GitHub API.

### Task 1.3 — Rivalutazione automatica bloccanti/assunzioni (G4)

**File da modificare:**
- `portal/src/app/api/br/[id]/route.ts` — arricchire l'action `respond_problem`
- `portal/src/app/br/[id]/review/page.tsx` — mostrare feedback rivalutazione
- `skill/br-pipeline/SKILL.md` — arricchire S2 Clarify / logica di lettura risposte in S3

**Logica rivalutazione server-side (API route PATCH):**

Quando l'action e' `respond_problem`:
1. Salvare la risposta come oggi (`p.risposta = risposta, p.stato = "risposto"`)
2. **Nuova logica — per i bloccanti:**
   - Se `p.bloccante == true`:
     - Segnare il problema come `"risposto"` (lo stato corrente)
     - Il TL/PM dalla CLI (S3) vedra' la risposta e decidera' se il bloccante e' risolto
   - Non servono valutazioni automatiche lato portale: il funzionale risponde, il TL/PM valuta
3. **Nuova logica — per i non bloccanti con assunzione:**
   - Cercare l'assunzione collegata in `manifest.review.assunzioni[]` (via `problema_rif`)
   - Salvare `assunzione.risposta_funzionale = risposta`
   - Il TL/PM dalla CLI (S3) confrontera' risposta vs assunzione e classifichera' come confermata/rigettata

**Logica nella skill CLI (S3 Analyze):**
Aggiungere una sotto-sezione in S3 "Incorpora risposte" piu' dettagliata:
- Per ogni bloccante con risposta: mostrare al TL/PM e chiedere se lo considera risolto
- Per ogni assunzione con `risposta_funzionale`: confrontare con `assunzione` e chiedere conferma al TL/PM: "L'assunzione era X, il funzionale ha risposto Y — vuoi usare la risposta del funzionale?"
- Aggiornare `assunzione.stato` a `"confermata"` o `"rifiutata"`
- Aggiornare `problema.stato` a `"accettato"` (bloccante risolto) o lasciare `"risposto"` (bloccante non risolto)

**Feedback nel portale:**
Nella pagina review (`/br/[id]/review`), mostrare per ogni domanda:
- Se ha risposta: badge "Risposto" (gia' presente)
- Se l'assunzione collegata e' stata confermata/rigettata (dal TL/PM via CLI): mostrare badge aggiuntivo "Assunzione confermata" o "Assunzione rigettata — usata la tua risposta"

---

## Fase 2 — Gap Medi e Bassi

**Effort:** 4-6 gg
**Prerequisiti:** Fase 0 completata. Indipendente da Fase 1.
**Obiettivo:** Excel report, dettaglio piano, viste MD, check vs codice.

### Task 2.1 — Excel progress report (G2)

**File da creare:**
- `portal/src/app/api/br/[id]/export/route.ts` — endpoint che genera e ritorna il file XLSX
- `portal/src/app/br/[id]/page.tsx` — aggiungere bottone "Esporta Excel" nella vista TL/PM

**Alternativa A — Generazione server-side con libreria JS:**
Usare `exceljs` (equivalente JS di openpyxl) per generare il file direttamente nel portale:
```
npm install exceljs
```
L'API route genera il file in memoria e lo ritorna come stream con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

**Alternativa B — Generazione nella skill CLI:**
Aggiungere una sezione "Report Excel" nella skill `skill/br-pipeline/SKILL.md` che replica la logica di `br-progress-report` di claude-flow, adattata al manifest JSON.

**Raccomandazione:** Implementare **entrambe**. Il portale per il download rapido dal browser (Alternativa A). La skill per la generazione offline dalla CLI (Alternativa B).

**Struttura Excel (identica a claude-flow):**
- Foglio 1 "Task": 13 colonne (senza qa_criteri post rimozione QA), formattazione condizionale, filtri
- Foglio 2 "Per Sviluppatore": riepilogo per dev, riga TOTALE
- Foglio 3 "Riepilogo": dashboard con metriche, effort, stato per wave

**La sorgente dati deve usare il progresso aggregato (Task 1.1/1.2)** quando disponibile.

### Task 2.2 — Dettaglio stream e merge task nella skill CLI (G3)

**File da modificare:**
- `skill/br-pipeline/SKILL.md`

**Sezione da arricchire:** S3 Analyze, sotto-sezione "Generazione piano"

**Contenuto da aggiungere (portare da claude-flow br-analyzer):**

**Principi per la creazione delle task:**

1. **Organizzazione in stream** — Raggruppa le task in stream funzionali coesi (es. `stream-booking`, `stream-monitoraggio`). Le task nello stesso stream condividono il contesto di codice e possono dipendere direttamente tra loro. Per le dipendenze cross-stream, inserisci sempre una merge task esplicita.

2. **Merge task per dipendenze cross-stream** — Quando una task in stream-X dipende da una task in stream-Y, il pipeline inserisce automaticamente una merge task `T-MERGE-NNN` (dove NNN e' l'ID della task sorgente). La merge task:
   - Appartiene allo stream sorgente
   - Ha effort ~0.5gg
   - Specifica quale branch mergiare, in quale branch base, e di verificare la build
   - Si colloca tra le wave come punto di sincronizzazione
   - All'interno dello stesso stream non serve — la dipendenza diretta basta

3. **Branch convention** — Ogni task ha un branch `feature/<br-name>-<slug-attivita>`. Per merge task il valore e' null.

4. **Indipendenza massima** — Se due task condividono una dipendenza, la task sorgente va nella wave precedente.

5. **Assegnazione per competenza e seniority** — Senior per design/review/sblocco, junior con scope chiuso e reviewer assegnato.

6. **Granularita'** — 1-5 giorni per task. Troppo grande: spezza. Troppo piccola (< 2h): accorpa.

7. **Autosufficiente per Claude Code** — Ogni task contiene: file esatti da modificare/creare, pattern del progetto da seguire, criteri di completamento verificabili, e note specifiche.

### Task 2.3 — Generazione viste MD retrocompatibili (G5)

**File da modificare:**
- `skill/br-pipeline/SKILL.md`

**Obiettivo:** Verificare e completare la generazione delle viste MD in ogni stage.

**Checklist:**
- S1 Review: verificare che generi `brs/<nome>/REVIEW_BR.md` dal manifest — il template e' gia' documentato, confermare che sia citato come step esplicito
- S3 Analyze: verificare che generi `brs/<nome>/GAP_REPORT_BR.md` e `brs/<nome>/PIANO_IMPLEMENTAZIONE_BR.md` dal manifest
- S5 Execute: verificare che aggiorni `brs/<nome>/PROGRESSO_BR.md` dal manifest ad ogni cambio di stato task
- S7 Update: verificare che rigeneri tutte le viste MD dopo l'aggiornamento

**Aggiunta:** Nella sezione "Utilities condivise", aggiungere un paragrafo esplicito:

> Dopo ogni commit del manifest, il pipeline DEVE generare/aggiornare le viste MD corrispondenti nella directory `brs/<nome>/`. Queste sono viste di sola lettura — il manifest resta la single source of truth.

### Task 2.4 — Check vs codice nel review S1 (G6)

**File da modificare:**
- `skill/br-pipeline/SKILL.md`

**Sezione da arricchire:** S1 Review, sotto-sezione "Check vs codice"

**Contenuto da aggiungere (portare da claude-flow br-reviewer Fase 3.3):**

Per ogni codebase nel manifest (`codebase[]`), leggere il path locale da `.br-local.json`. Se il TL/PM non ha `.br-local.json`, chiedere i path.

Verificare superficialmente:
- **Entita' e modelli dati**: il BR presuppone strutture che nel codice esistono ma sono diverse? (nomi diversi, campi diversi, relazioni diverse)
- **Enum e costanti**: il BR definisce stati o valori che nel codice esistono come enum con valori/nomi diversi?
- **API/endpoint**: il BR descrive operazioni che nel codice corrispondono ad API con naming o struttura diversa?
- **Flussi e stati**: il BR descrive transizioni di stato che nel codice funzionano diversamente?

Usare l'Agent tool con `subagent_type: "Explore"` per parallelizzare l'esplorazione dei diversi codebase.

I disallineamenti trovati vanno scritti in `manifest.review.disallineamenti_codice[]` (la struttura nel manifest gia' supporta questo dato).

---

## Ordine di esecuzione

```
Fase 0 — Rimozione QA (prerequisito)
  Task 0.1 → 0.2 → 0.3 → 0.4 → 0.5
  [sequenziali: 0.1 cambia i tipi, 0.2-0.4 li usano, 0.5 verifica]

Fase 1 — Gap Critici
  Task 1.1 (skill CLI)  ←── parallelizzabili ──→  Task 1.3 (portale + skill)
  Task 1.2 (portale)
  [1.2 dipende da 1.1 per la specifica della logica]
  [1.1 e 1.3 sono indipendenti]

Fase 2 — Gap Medi e Bassi
  Task 2.1 (Excel)  ←── parallelizzabili ──→  Task 2.2 (stream/merge)
  Task 2.3 (viste MD)  ←── parallelizzabili ──→  Task 2.4 (check vs codice)
  [tutti i task di Fase 2 sono indipendenti tra loro]

Fase 1 e Fase 2 sono parallelizzabili tra loro
(a patto che Fase 0 sia completata)
```

---

## Stima complessiva

| Fase | Task | Effort | Note |
|---|---|---|---|
| Fase 0 | 0.1-0.5 | 1-2 gg | Prerequisito, sequenziale |
| Fase 1 | 1.1 | 2 gg | Skill CLI |
| Fase 1 | 1.2 | 2 gg | Portale + cache |
| Fase 1 | 1.3 | 1-2 gg | Portale + skill |
| Fase 2 | 2.1 | 2-3 gg | Excel (portale + skill) |
| Fase 2 | 2.2 | 1 gg | Skill CLI (aggiunta testo) |
| Fase 2 | 2.3 | 0.5 gg | Skill CLI (verifica + completamento) |
| Fase 2 | 2.4 | 0.5 gg | Skill CLI (aggiunta testo) |
| **TOTALE** | | **10-13 gg** | |

---

## Rischi

| Rischio | Mitigazione |
|---|---|
| La rimozione QA rompe il build TypeScript | Task 0.5 verifica con `tsc --noEmit` |
| L'aggregazione cross-branch e' lenta su repo con molti branch | Cache con TTL nel portale; nella skill, eseguire solo quando richiesto |
| La GitHub API ha rate limiting per la lettura multi-branch | Batch requests, cache locale, usare GraphQL API dove possibile |
| Il file SKILL.md diventa troppo lungo | Struttura modulare per stage, evitare ripetizioni, referenziare sezioni condivise |

---

## Verifica finale

Dopo il completamento di tutte le fasi:

1. **Build check**: `cd portal && npx tsc --noEmit` — zero errori
2. **Schema validation**: `manifest.example.json` valido contro `manifest.schema.json` aggiornato
3. **Grep QA residui**: `grep -ri "qa\|verify\|criteri.*accettazione" portal/src/ skill/ shared/` — zero risultati
4. **Skill CLI**: invocare `br-pipeline` come TL/PM, verificare che non menzioni QA/Verify
5. **Portale**: login come ogni ruolo (funzionale, tech_lead, dev, admin), verificare che QA non appaia
6. **Excel**: generare un export Excel da un BR di test, verificare i 3 fogli
7. **Aggregazione**: con 2+ branch remoti, verificare che il progresso aggregato sia corretto
