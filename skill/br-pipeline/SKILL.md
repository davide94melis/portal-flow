---
name: br-pipeline
description: Pipeline POM completo per gestione BR con manifest JSON e viste per ruolo. Trigger: "br-pipeline", "pipeline br", "le mie task"
---

# BR Pipeline POM

Pipeline completo per la gestione dei Business Requirements (BR) con modello POM (Project Operating Model). Ogni BR ha un manifest JSON come single source of truth. I file MD sono viste retrocompatibili generate dal manifest.

## Stage del Pipeline

```
S0 Onboard ──► S1 Review ──► S2 Clarify ──► S3 Analyze ──► S4 Approve
                                                                │
S8 Report ◄── S7 Update ◄──────────────── S5 Execute ◄────────┘
```

| Stage | ID | Chi | Dove | Descrizione |
|---|---|---|---|---|
| Onboard | S0 | Funzionale | Portale | Crea BR, carica docs/mockup, assegna team |
| Review | S1 | TL/PM | Claude Code | Analisi docs + codice, genera domande |
| Clarify | S2 | Funzionale | Portale | Risponde alle domande inline |
| Analyze | S3 | TL/PM | Claude Code | Gap analysis + piano |
| Approve | S4 | TL/PM | Portale | GATE: valida e approva il piano |
| Execute | S5 | Dev | Claude Code | Esegue task con sottoagenti |
| Update | S7 | TL/PM | Claude Code | Aggiorna piano se BR cambia |
| Report | S8 | Tutti | Portale | Dashboard live, export |

---

## Entry Point

All'invocazione, esegui questa sequenza:

### 1. Sincronizzazione

```bash
git pull --rebase origin main
```

Se il pull fallisce per conflitti, avvisa l'utente e fermati.

### 2. Scoperta BR attivi

Cerca tutti i manifest in `brs/*/manifest.json` nella root del repo. Per ogni manifest trovato, leggi `nome` e `stato_pipeline`.

Se non ci sono BR:
- **TL/PM**: "Nessun BR attivo. Il funzionale deve creare un nuovo BR dal portale."
- **Dev**: "Nessun BR attivo con task assegnate."

### 3. Identificazione ruolo

**Controlla se esiste `.br-local.json` nella root del repo:**

- **Se esiste** → L'utente e' un **Dev**. Leggi `developer` per il nome e `paths` per i path locali dei codebase.
- **Se non esiste** → Chiedi: "Sei un TL/PM o un Dev?"
  - Se **Dev**: avvia il setup iniziale (vedi sezione Setup)
  - Se **TL/PM**: procedi con la vista TL/PM

### 4. Vista per ruolo

**TL/PM — Dashboard BR:**

Mostra tabella con tutti i BR attivi:

```
| BR | Stage | Ultimo evento | Azione suggerita |
|---|---|---|---|
| booking-v2 | clarify | 3 risposte ricevute (2h fa) | Rivalutare risposte → S3 |
| monitoraggio | onboard | Documenti caricati (1g fa) | Lanciare review → S1 |
```

Per ogni BR, proponi il next step basato su `stato_pipeline`:
- `onboard` → "Lanciare review (S1)"
- `review` → "Attendere risposte funzionale" (ma se ci sono risposte, suggerisci S3)
- `clarify` → "Lanciare analisi (S3)" (se ci sono risposte nuove)
- `analyze` → "Approvare il piano (S4) — da fare sul portale"
- `approve` → "Piano approvato, i Dev possono eseguire (S5)"
- `execute` → "Monitorare progresso" (mostra % completamento)
- `update` → "BR aggiornato, rivalutare"

Per ogni BR in stato `execute` o `approved`, il progresso mostrato e' il risultato della **Lettura progresso aggregata** (vedi sezione Utilities). Questo garantisce che il TL/PM veda il progresso reale di TUTTI gli sviluppatori, non solo quello locale.

Chiedi: "Quale BR vuoi lavorare?" (o "Quale azione?")

**Dev — Le mie task:**

Filtra le task da tutti i BR dove `piano.approvato == true` e `task[].owner == <nome_dev>` e `task[].stato != "completata"` e `task[].stato != "annullata"`.

Mostra:

```
| BR | Task | Attivita | Wave | Priorita | Stato | Progresso | Bloccata da |
|---|---|---|---|---|---|---|---|
| booking-v2 | T-001 | Creare entita Booking | 0 | P0 | da_iniziare | 0% | - |
| booking-v2 | T-003 | API endpoint booking | 1 | P0 | da_iniziare | 0% | T-001 |
```

Proponi la prossima task disponibile (non bloccata, priorita' piu' alta, wave piu' bassa):
"La prossima task disponibile e' **T-001 — Creare entita Booking** (booking-v2, P0, wave 0). Vuoi iniziare?"

---

## Utilities condivise

### Lettura manifest

Per leggere il manifest di un BR:

```bash
cat brs/<nome>/manifest.json
```

Parsare il JSON e validare che contenga i campi obbligatori (`version`, `nome`, `stato_pipeline`). Se il manifest e' malformato, avvisa l'utente.

### Scrittura manifest

Dopo ogni modifica al manifest:

1. Scrivi il JSON aggiornato (formattato con indentazione a 2 spazi)
2. Aggiungi entry alla `timeline[]` per l'azione eseguita
3. Commit e push:

```bash
git add brs/<nome>/manifest.json
git commit -m "[br-pipeline] <nome>: <azione>"
git push origin main
```

Formato messaggi di commit:
- `[br-pipeline] booking-v2: review completato (1 bloccante, 2 non bloccanti)`
- `[br-pipeline] booking-v2: gap analysis completata (5 gap identificati)`
- `[br-pipeline] booking-v2: T-001 stato → in_corso`
- `[br-pipeline] booking-v2: piano aggiornato dopo update BR`

### Timeline

Ogni azione significativa aggiunge un entry a `timeline[]`:

```json
{
  "data": "<ISO 8601 timestamp>",
  "attore": "<email o nome>",
  "ruolo": "<funzionale|tech_lead|dev|admin|sistema>",
  "azione": "<descrizione azione>",
  "stage": "<stage corrente>"
}
```

### Generazione viste MD retrocompatibili

Dopo ogni modifica significativa al manifest, genera i file MD corrispondenti nella directory del BR. Questi file sono viste di sola lettura — il manifest resta la source of truth.

#### REVIEW_BR.md

Genera da `manifest.review`:

```markdown
# Review BR — <nome>

**Data:** <review.data>
**Esito:** <review.esito>

## Problemi Bloccanti

| ID | Titolo | Categoria | Domanda | Risposta |
|---|---|---|---|---|
<per ogni problema con bloccante == true>

## Problemi Non Bloccanti

| ID | Titolo | Categoria | Domanda | Assunzione | Risposta |
|---|---|---|---|---|---|
<per ogni problema con bloccante == false>

## Assunzioni

| ID | Rif. | Assunzione | Rischio | Stato |
|---|---|---|---|---|
<per ogni assunzione>

## Disallineamenti Codice

| ID | Tipo | Documento | Codice | Descrizione |
|---|---|---|---|---|
<per ogni disallineamento>
```

#### GAP_REPORT_BR.md

Genera da `manifest.gap_analysis`:

```markdown
# Gap Report — <nome>

**Data analisi:** <gap_analysis.data>
**Gap aperti:** <conteggio gap_aperti>

## Matrice Gap

| ID | Funzionalita | Stato attuale | Stato richiesto | Gap | Codebase | File coinvolti |
|---|---|---|---|---|---|---|
<per ogni entry in matrice>
```

#### PIANO_IMPLEMENTAZIONE_BR.md

Genera da `manifest.piano`:

```markdown
# Piano di Implementazione — <nome>

**Approvato:** <si/no>
**Data approvazione:** <piano.data_approvazione>

## Stream

<per ogni stream>
### <stream.nome>
<stream.descrizione>

## Task

| ID | Stream | Owner | Area | P | Wave | Attivita | Effort | Stato | Progresso |
|---|---|---|---|---|---|---|---|---|---|
<per ogni task>

## Dipendenze

<lista dipendenze in formato leggibile>
```

#### PROGRESSO_BR.md

Genera da `manifest.piano.task`:

```markdown
# Progresso — <nome>

**Completamento globale:** <percentuale>
**Task completate:** <n>/<totale>

## Per sviluppatore

| Dev | Completate | In corso | Da iniziare | Bloccate | % |
|---|---|---|---|---|---|
<aggregazione per owner>

## Dettaglio task

| ID | Attivita | Owner | Stato | Progresso | Note |
|---|---|---|---|---|---|
<per ogni task ordinata per wave>
```

**Regola**: dopo ogni commit del manifest, il pipeline DEVE generare/aggiornare le viste MD corrispondenti nella directory `brs/<nome>/`. Queste sono viste di sola lettura — il manifest resta la single source of truth. Lo step di generazione viste MD e' esplicito e obbligatorio in ogni stage che modifica il manifest:
- S1 Review: genera `REVIEW_BR.md`
- S3 Analyze: genera `GAP_REPORT_BR.md` e `PIANO_IMPLEMENTAZIONE_BR.md`
- S5 Execute: aggiorna `PROGRESSO_BR.md` ad ogni cambio di stato task
- S7 Update: rigenera tutte le viste MD dopo l'aggiornamento

### Lettura progresso aggregata (cross-branch)

Quando piu' sviluppatori lavorano su branch diversi, ognuno aggiorna il manifest sul proprio feature branch. Senza aggregazione, il progresso degli altri non e' visibile. Questa utility deve essere eseguita prima di mostrare il progresso o controllare le dipendenze.

**Quando usare:**
- S5 Execute: prima di controllare le dipendenze e di selezionare la prossima task
- Dashboard TL/PM: prima di mostrare il progresso di un BR in stato `execute`/`approved`
- Report: quando l'utente chiede lo stato di avanzamento

**Procedura:**

1. Sincronizzare i branch remoti:
   ```bash
   git fetch origin
   ```

2. Leggere il manifest corrente per estrarre:
   - Gli ID di tutte le task (`piano.task[].id`)
   - I nomi branch di ogni task (`piano.task[].branch`)
   - Il nome del BR (`nome`)

3. Trovare i branch remoti da controllare:
   - Per ogni task con `branch` diverso da null: verificare che `origin/<branch>` esista:
     ```bash
     git branch -r | grep "<branch>"
     ```
   - Fallback: se il piano non ha colonna branch, cercare branch con:
     ```bash
     git branch -r | grep -i "feature/<nome-br>"
     ```

4. Per ogni branch trovato, leggere il manifest dal branch remoto:
   ```bash
   git show origin/<branch>:brs/<nome>/manifest.json
   ```
   Parsare il JSON e estrarre `piano.task[]` con progresso e stato per ogni task.

5. Aggregare per task con la regola **"highest progress wins"**:
   - Per ogni task, confrontare le versioni da tutti i branch (incluso il branch corrente)
   - Se una versione mostra `stato == "completata"` (progresso 100%), vince sempre
   - Altrimenti, prendere la versione con il progresso % piu' alto
   - Se due versioni hanno lo stesso %, prendere quella con lo stato piu' avanzato (`in_corso` > `da_iniziare`)

6. Ricalcolare le metriche di riepilogo dalla vista aggregata (task completate, in corso, progresso complessivo %).

7. **Fallback**: se `git fetch` fallisce (no rete), usare il manifest locale e mostrare un warning:

   > Impossibile sincronizzare con il remoto. Il progresso mostrato potrebbe non essere aggiornato.

Usare la vista aggregata per tutte le operazioni successive (controllo dipendenze, selezione task, dashboard).

---

## Setup iniziale (.br-local.json)

Alla prima invocazione come Dev, se `.br-local.json` non esiste nella root del repo:

1. Chiedi: "Come ti chiami? (nome che corrisponde al campo 'owner' nelle task)"
2. Chiedi: "Per quali codebase lavori? Per ognuno, dimmi il path locale."
   - Leggi i codebase disponibili dai manifest dei BR attivi (campo `codebase[].sigla`)
   - Per ogni sigla (es. BE, FE), chiedi il path locale
3. Crea `.br-local.json`:

```json
{
  "developer": "<nome>",
  "paths": {
    "<SIGLA>": "<path_locale>"
  }
}
```

4. Conferma: "Setup completato. Il file `.br-local.json` e' stato creato ed e' gitignored. Non verra' committato."

Il file NON deve essere committato (e' gia' nel `.gitignore`).

---

## Stage S1 — Review (TL/PM)

### Precondizioni

- `stato_pipeline == "onboard"`
- Esistono documenti in `brs/<nome>/docs/`

### Procedura

**1. Conversione documenti**

Per ogni file in `brs/<nome>/docs/` che non e' gia' in formato MD:
- Usa `doc-to-markdown` (skill) o `markitdown` per convertire DOCX/PDF/XLSX/PPTX in Markdown
- Salva il file convertito come `<nome_originale>.md` nella stessa directory
- Aggiorna `documenti[].convertito` nel manifest con il path del file MD

Se la conversione fallisce per un file, segna l'errore e prosegui con gli altri.

**2. Analisi documentazione**

Leggi tutti i documenti convertiti e analizzali seguendo questa struttura:

**Analisi intra-documento** (per ogni documento):
- Completezza: tutte le sezioni hanno contenuto sufficiente?
- Coerenza interna: terminologia consistente? Numeri/date coerenti?
- Chiarezza: requisiti ambigui, vaghi, o con "da definire"?

**Analisi inter-documento** (tra tutti i documenti):
- Contraddizioni tra documenti diversi
- Gap: funzionalita' menzionate in un doc ma assenti negli altri
- Mapping: mockup coprono tutte le funzionalita' del BR?

**Check leggero contro il codice**

Per ogni codebase nel manifest (`codebase[]`), leggere il path locale da `.br-local.json`. Se il TL/PM non ha `.br-local.json` configurato, chiedere i path dei codebase rilevanti.

Verificare superficialmente:

- **Entita' e modelli dati**: il BR presuppone strutture che nel codice esistono ma sono diverse? (nomi diversi, campi diversi, relazioni diverse)
- **Enum e costanti**: il BR definisce stati o valori che nel codice esistono gia' come enum con valori/nomi diversi?
- **API/endpoint**: il BR descrive operazioni che nel codice corrispondono ad API con naming o struttura diversa?
- **Flussi e stati**: il BR descrive transizioni di stato che nel codice funzionano diversamente?

Usare l'Agent tool con `subagent_type: "Explore"` per parallelizzare l'esplorazione dei diversi codebase, fornendo contesto dal BR su cosa cercare.

Lo scopo NON e' fare la gap analysis (quello lo fa S3 Analyze) ma trovare problemi di *documentazione* visibili solo confrontando col codice. I disallineamenti trovati vanno scritti in `manifest.review.disallineamenti_codice[]` con:
- `id`: formato `D-NNN`
- `tipo`: naming | struttura | logica | modello_dati | api
- `dove_doc`: riferimento al punto del documento
- `dove_codice`: path al file/classe nel codebase
- `descrizione`: cosa e' diverso
- `impatto`: conseguenze se non risolto

**3. Classificazione problemi**

Per ogni problema trovato, crea un entry in `manifest.review.problemi[]`:

- **Bloccanti** (id `B-xxx`): impossibile procedere senza risposta
  - `assunzione_proposta` = null (nessuna assunzione possibile)
- **Non bloccanti** (id `NB-xxx`): si puo' procedere con un'assunzione
  - `assunzione_proposta` = l'assunzione proposta

Per ogni assunzione generata, crea anche un entry in `manifest.review.assunzioni[]`.

Per ogni disallineamento codice trovato, crea un entry in `manifest.review.disallineamenti_codice[]`.

**4. Aggiornamento manifest**

- `stato_pipeline` = "review"
- `review.data` = data odierna
- `review.esito` = "Con bloccanti" se ci sono problemi bloccanti, altrimenti "Senza bloccanti"
- Aggiungi entry in `timeline[]`

**5. Generazione vista MD**

Genera `brs/<nome>/REVIEW_BR.md` dal manifest (vedi sezione Utilities).

**6. Commit e output**

Commit: `[br-pipeline] <nome>: review completato (<n> bloccanti, <m> non bloccanti)`

Mostra riepilogo:

```
Review completato per <nome>.

Esito: <esito>
- Problemi bloccanti: <n>
- Problemi non bloccanti: <m>
- Assunzioni proposte: <k>
- Disallineamenti codice: <j>

Prossimo step: Il funzionale deve rispondere alle domande sul portale (S2).
Quando le risposte arrivano, puoi lanciare l'analisi (S3).
```

---

## Stage S3 — Analyze (TL/PM)

### Precondizioni

- `stato_pipeline == "clarify"` (ideale: il funzionale ha risposto)
- Oppure `stato_pipeline == "review"` (il TL/PM decide di procedere senza attendere tutte le risposte)

### Procedura

**1. Incorpora risposte**

Se ci sono risposte dal funzionale (campi `review.problemi[].risposta` e `review.assunzioni[].risposta_funzionale` compilati):
- Per ogni risposta, rivaluta il problema: e' ancora valido? L'assunzione va aggiornata?
- Aggiorna `stato` dei problemi a "risposto" dove hanno una risposta

Se ci sono problemi bloccanti senza risposta, avvisa:
"ATTENZIONE: Ci sono <n> problemi bloccanti senza risposta. Vuoi procedere comunque con assunzioni?"

**2. Esplorazione codebase**

Per ogni `codebase[]` nel manifest:
1. Leggi il path locale da `.br-local.json`
2. Se il path non esiste in `.br-local.json`, chiedi al TL/PM il path
3. Esplora la struttura del codebase:
   - Struttura directory (primo livello + aree rilevanti)
   - Modello dati (entita', tabelle, schemi)
   - API/endpoint esistenti
   - Servizi e logica di business rilevante
   - Pattern architetturali usati

Usa l'Agent tool con `subagent_type: "Explore"` per ogni codebase, fornendo contesto dal BR su cosa cercare.

**3. Gap analysis**

Per ogni funzionalita' richiesta nel BR, confronta con lo stato attuale del codice:

Popola `manifest.gap_analysis.matrice[]`:
- `stato_attuale`: "assente" | "parziale" | "presente" | "diverso"
- `gap`: descrizione di cosa manca o va modificato
- `file_coinvolti`: lista dei file che andranno toccati

Popola `manifest.gap_analysis.gap_aperti[]` con gli ID dei gap con stato != "presente".

Setta `manifest.gap_analysis.data` = data odierna.

**4. Generazione piano**

Dal gap report, genera il piano di implementazione:

**Stream:** raggruppa le task per area funzionale. Popola `manifest.piano.stream[]`.

**Task:** per ogni gap, crea una o piu' task. Popola `manifest.piano.task[]`:
- `id`: T-001, T-002, ... in ordine sequenziale
- `stream`: ID dello stream di appartenenza
- `owner`: assegna in base a `area` e `team[]` (rispetta seniority — junior con reviewer)
- `priorita`: P0 (fondazioni), P1 (core business), P2 (nice-to-have)
- `wave`: ordine di esecuzione (0 = prime task, 1 = dipendono da wave 0, ecc.)
- `dipendenze`: ID delle task prerequisito
- `effort_gg`: stima in giorni
Aggiungi task di merge (`T-MERGE-xxx`) dove necessario per integrare branch paralleli.

**Principi per la creazione delle task:**

1. **Organizzazione in stream** — Raggruppa le task in stream funzionali coesi (es. `stream-booking`, `stream-monitoraggio`, `stream-fondazioni`). Le task nello stesso stream condividono il contesto di codice e possono dipendere direttamente tra loro. Per le dipendenze cross-stream, inserisci sempre una merge task esplicita.

2. **Merge task per dipendenze cross-stream** — Quando una task in stream-X dipende da una task in stream-Y, inserisci automaticamente una merge task `T-MERGE-NNN` (dove NNN e' l'ID numerico della task sorgente). La merge task:
   - Appartiene allo stream sorgente
   - Ha owner suggerito: lo sviluppatore che ha completato la task sorgente
   - Ha effort ~0.5gg
   - La descrizione specifica: quale branch mergiare, in quale branch base, e di verificare la build dopo il merge
   - Si colloca tra le wave come punto di sincronizzazione
   - All'interno dello stesso stream non serve alcuna merge task — la dipendenza diretta e' sufficiente

3. **Branch convention** — Ogni task ha un branch `feature/<br-name>-<slug-attivita>` (es. `feature/monitoring-enum-entities-core`). Per task multi-repo (Area = BE+FE), lo stesso nome branch viene usato in tutte le repo. Per le merge task (T-MERGE-*), il campo branch e' null.

4. **Indipendenza massima** — Ogni task deve poter essere sviluppata in parallelo. Se due task condividono una dipendenza (es. una nuova entita' DB), la task che crea la dipendenza va nella wave precedente. Minimizza le dipendenze cross-stream: le fondazioni condivise vanno in `stream-fondazioni` completato e mergiato prima che gli altri stream inizino.

5. **Assegnazione per competenza e seniority** — Task complesse o architetturali ai senior/mid. Task ripetitive o con scope chiuso ai junior, con reviewer assegnato. I senior non vanno caricati di implementazione continua: il loro valore e' nel design, review, e sblocco tecnico.

6. **Granularita' giusta** — Ogni task deve essere completabile in 1-5 giorni. Troppo grande: spezzala. Troppo piccola (< 2 ore): accorpala con task correlate.

7. **Autosufficiente per Claude Code** — Ogni task deve contenere abbastanza contesto perche' un agente Claude Code possa implementarla leggendo solo la task e il gap report. Includi: file esatti da modificare/creare, pattern del progetto da seguire, criteri di completamento verificabili, e note specifiche (convenzioni, attenzioni, edge case).

**5. Aggiornamento manifest**

- `stato_pipeline` = "analyze"
- Aggiungi entry in `timeline[]`

**6. Generazione viste MD**

Genera:
- `brs/<nome>/GAP_REPORT_BR.md`
- `brs/<nome>/PIANO_IMPLEMENTAZIONE_BR.md`

**7. Commit e output**

Commit: `[br-pipeline] <nome>: analisi completata (<n> gap, <m> task)`

Mostra riepilogo con gap trovati, piano proposto (tabella task), e prossimo step:

```
Analisi completata per <nome>.

Gap identificati: <n>
Task generate: <m> (di cui <k> merge task)
Stream: <lista stream>
Effort totale stimato: <tot> giorni

Prossimo step: Approva il piano dal portale (S4).
Dopo l'approvazione, i Dev vedranno le task assegnate.
```

---

## Stage S5 — Execute (Dev)

### Precondizioni

- `piano.approvato == true`
- Il Dev ha un `.br-local.json` configurato

### Procedura

**1. Identifica dev**

Leggi `.br-local.json` → campo `developer` = nome del dev.

**2. Mostra task**

Filtra `manifest.piano.task[]` dove:
- `owner == <nome_dev>`
- `stato` non e' "completata" ne' "annullata"

Ordina per `wave` (crescente) poi `priorita` (P0 > P1 > P2).

Mostra la lista (vedi formato in Entry Point → Dev).

**3. Selezione task**

Prima di controllare le dipendenze, eseguire la **Lettura progresso aggregata** (vedi sezione Utilities). Usare la vista aggregata per determinare lo stato delle dipendenze, NON il manifest locale.

Proponi la prossima task disponibile = la prima task dove:
- Tutte le task in `dipendenze[]` hanno `stato == "completata"` nella vista aggregata
- `stato` != "bloccata"

Se nessuna task e' disponibile (tutte bloccate da dipendenze):
"Tutte le tue task sono bloccate da dipendenze non ancora completate. Ecco lo stato delle dipendenze: ..."

Il Dev puo' scegliere una task diversa se lo desidera.

**4. Aggiornamento stato → in_corso**

- `task[].stato` = "in_corso"
- `task[].progresso` = 10
- Aggiungi entry in `timeline[]`
- Commit: `[br-pipeline] <nome>: T-xxx stato → in_corso`

**5. Esecuzione con sottoagenti**

Per ogni task (tranne T-MERGE-*):

Scomponi la task in sotto-step basandoti sulla `descrizione`. Ogni sotto-step deve essere autosufficiente.

Per ogni sotto-step, lancia un sottoagente con l'Agent tool:
- Fornisci contesto completo: task description, file coinvolti (dal gap report), pattern del codebase, vincoli
- Il sotto-step deve poter essere eseguito senza bisogno di leggere il manifest
- Il sottoagente lavora nel path del codebase rilevante (da `.br-local.json`)
- Il sottoagente DEVE scrivere test per il suo lavoro, compresi edge case (input vuoti, null, boundary values, casi di errore). Specificalo esplicitamente nel prompt. Il sottoagente non puo' dichiarare il lavoro completo senza test.

Dopo ogni sotto-step completato, aggiorna `task[].progresso` nel manifest.

**Verifica del lavoro dei sottoagenti**

Dopo che ogni sottoagente completa il suo lavoro, esegui una verifica in 3 fasi prima di aggiornare il progresso:

**Fase A — Verifica tecnica**

1. Esegui i test — la suite completa deve passare con zero failure
2. Verifica la build — il progetto deve compilare senza errori
3. Controlla che il sottoagente abbia scritto test che coprano:
   - Il caso felice (happy path)
   - I casi limite (edge case): input vuoti, null, valori al boundary, liste vuote, stringhe troppo lunghe
   - I casi di errore: dipendenze che falliscono, input malformato, stati invalidi
   - Se i test edge case mancano, lancia un nuovo sottoagente per aggiungerli. Non procedere senza.

**Fase B — Verifica di coerenza col requisito**

Rileggi la descrizione della task dal manifest (`piano.task[].descrizione`) e dal gap report. Per OGNI requisito:

1. E' stato implementato? Il codice copre effettivamente quel requisito?
2. E' stato implementato correttamente? Il comportamento corrisponde?
3. Manca qualcosa che il sottoagente ha ignorato?

Se trovi discrepanze, lancia un sottoagente di correzione e ripeti la Fase B.

**Fase C — Riesame finale (second look)**

Dopo le Fasi A e B:

1. Rileggere il codice prodotto dall'inizio alla fine — non fidarsi del riepilogo del sottoagente
2. Cercare assunzioni nascoste — valori hardcodati che dovrebbero essere configurabili?
3. Verificare che i test testino realmente — ogni test deve avere asserzioni specifiche e significative
4. Controllare che i nomi seguano le convenzioni del progetto

Se trovi problemi, correggi e ripeti la Fase C.

Solo quando tutte e 3 le fasi sono superate il sotto-step e' verificato e il progresso puo' essere aggiornato.

**6. Gestione merge task (T-MERGE-*)**

Le task di merge NON usano sottoagenti. Il pipeline guida il Dev nel merge:
1. Elenca i branch da mergere
2. Suggerisci l'ordine di merge
3. Per ogni conflitto, mostra i file in conflitto e suggerisci la risoluzione
4. Aggiorna il manifest dopo il merge

**7. Completamento task**

Una task e' completata solo quando TUTTI questi criteri sono soddisfatti:

1. **Requisiti** — tutto cio' che il gap report e il piano richiedono e' implementato
2. **Codice completo** — nessun placeholder, nessun TODO, nessuna implementazione parziale
3. **Test completi e verdi** — con copertura di happy path, edge case (input vuoti, null, boundary), e casi di errore
4. **Build** — il progetto compila senza errori
5. **Coerenza verificata** — la Fase B e' stata superata per ogni requisito
6. **Riesame superato** — la Fase C non ha trovato problemi

**Ciclo di verifica finale:**

Prima di dichiarare la task completata, esegui questo ciclo:

1. Elenca ogni requisito dalla descrizione della task nel manifest
2. Per ognuno, indica il file e la riga che lo implementa
3. Per ognuno, indica il test che lo verifica
4. Se un requisito non ha implementazione O non ha test → la task NON e' completa

Mostra la tabella di verifica:

```
| # | Requisito | Implementato | File | Test | Verificato |
|---|---|---|---|---|---|
| 1 | [requisito] | Si | path/file:42 | TestMethod | Si |
| 2 | [requisito] | No | — | — | — |
```

Se un requisito risulta non coperto, lancia un sottoagente per completarlo, poi ripeti il ciclo.

Quando TUTTI i requisiti sono coperti, implementati e testati:

- `task[].stato` = "completata"
- `task[].progresso` = 100
- Aggiungi entry in `timeline[]`

Comunica al Dev:

> La task **T-XXX — [nome]** e' completa e verificata.
>
> - Requisiti coperti: N/N
> - Test: X totali (Y happy path, Z edge case, W error case) — tutti verdi
> - Build: compila
> - Coerenza: verificata
> - Riesame: superato

**IMPORTANTE: Mai committare automaticamente nel codebase del progetto.** Suggerisci al Dev cosa committare e con quale messaggio, ma lascia che sia lui a farlo. Committare autonomamente solo nel repo portal-flow (manifest).

**8. Generazione vista MD**

Aggiorna `brs/<nome>/PROGRESSO_BR.md`.

**9. Prossima task**

Dopo il completamento, proponi la prossima task disponibile. Se non ce ne sono:
"Tutte le tue task sono completate!"

---

## Stage S7 — Update (TL/PM)

### Trigger

- Il TL/PM dice "il BR e' stato aggiornato" o simili
- Oppure il pipeline rileva nuovi documenti in `brs/<nome>/docs/` rispetto a quelli nel manifest

### Procedura

**1. Identificazione delta**

Confronta la documentazione attuale con quella precedente:
- Nuovi documenti non presenti in `manifest.documenti[]`
- Documenti modificati (verifica data di modifica o diff)
- Documenti rimossi

Classifica ogni delta come:
- **Nuovo**: funzionalita' completamente nuova
- **Modificato**: modifica a requisito esistente
- **Rimosso**: funzionalita' non piu' richiesta

**2. Conversione nuovi documenti**

Come in S1: converti i nuovi documenti in MD e aggiorna `manifest.documenti[]`.

**3. Analisi impatto**

Per ogni delta, determina l'impatto sulle task esistenti:
- **Task completate**: restano completate (il lavoro fatto non si perde)
- **Task in corso**: segnala se il delta le impatta, suggerisci modifiche
- **Task da iniziare**: aggiorna descrizione se necessario
- **Nuove task**: crea con ID sequenziale (prosegui dalla numerazione esistente)
- **Task non piu' necessarie**: segna come "annullata" o "sospesa"

**4. Aggiornamento manifest**

Preserva il progresso:
- Non toccare task con `stato == "completata"`
- Aggiorna `descrizione` delle task impattate
- Aggiungi nuove task
- Ricalcola `wave` e `dipendenze` dove necessario
- Se il piano era approvato e le modifiche sono sostanziali, setta `piano.approvato = false` e avvisa

Aggiorna `stato_pipeline` = "update".
Aggiungi entry in `timeline[]`.

**5. Generazione viste MD**

Rigenera tutti i file MD per riflettere i cambiamenti.

**6. Commit e output**

Commit: `[br-pipeline] <nome>: piano aggiornato dopo update BR`

Mostra riepilogo delta con impatto:

```
Aggiornamento BR completato per <nome>.

Delta rilevati:
- Nuovi: <n> funzionalita'
- Modificati: <m> requisiti
- Rimossi: <k> funzionalita'

Impatto sulle task:
- Task nuove: <x>
- Task aggiornate: <y>
- Task annullate/sospese: <z>
- Task completate (invariate): <w>

[Se piano disattivato]: Il piano richiede ri-approvazione dal portale (S4).
```
