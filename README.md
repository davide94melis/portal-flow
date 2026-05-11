# BR Pipeline POM

Sistema a 2 componenti per la gestione di Business Requirements con flusso POM (Project Operating Model).

## Componenti

1. **br-pipeline** (`skill/br-pipeline/`) — Skill CLI per Claude Code. Orchestrazione completa del ciclo BR: review, analisi, pianificazione, esecuzione task, aggiornamenti.
2. **BR Portal** (`portal/`) — Web app Next.js su Vercel con viste per ruolo (Funzionale, TL/PM, Dev).

## Struttura

```
portal-flow/
  skill/br-pipeline/    # Skill CLI (SKILL.md + install.sh)
  portal/               # Web app Next.js
  shared/               # Schema manifest, template, config condivisi
  docs/                 # Spec e piano di implementazione
  brs/                  # Directory BR (creata dal pipeline)
    <nome-br>/
      manifest.json
      docs/
      mockups/
```

## Architettura

- **Single source of truth**: manifest JSON (`brs/<nome>/manifest.json`)
- **Storage contenuti**: repo Git via GitHub API
- **Auth portale**: NextAuth + Vercel KV
- **Retrocompatibilita**: file MD generati dal manifest come viste di lettura

## Flusso POM

```
Funzionale         TL/PM              Dev
    |                |                  |
    | S0 Crea BR     |                  |
    |--------------->|                  |
    |                | S1 Review        |
    |                | (Claude Code)    |
    | S2 Risponde    |                  |
    |--------------->|                  |
    |                | S3 Analyze       |
    |                | S4 Approva piano |
    |                |----------------->|
    |                |                  | S5 Execute
    |                |                  | (Claude Code)
    |                | S6 Update (se BR cambia)
    |                | S7 Report (dashboard)
```

## Pipeline — Stage

| Stage | ID | Chi | Dove | Descrizione |
|---|---|---|---|---|
| Onboard | S0 | Funzionale | Portale | Crea BR, carica docs/mockup, assegna team |
| Review | S1 | TL/PM | Claude Code | Analisi docs + codice, genera domande |
| Clarify | S2 | Funzionale | Portale | Risponde alle domande inline |
| Analyze | S3 | TL/PM | Claude Code | Gap analysis + piano |
| Approve | S4 | TL/PM | Portale | GATE: valida e approva il piano |
| Execute | S5 | Dev | Claude Code | Esegue task con sottoagenti |
| Update | S6 | TL/PM | Claude Code | Aggiorna piano se BR cambia |
| Report | S7 | Tutti | Portale | Dashboard live, export |

## Installazione Skill CLI

```bash
# 1. Clona il repo
git clone https://github.com/davide94melis/portal-flow.git
cd portal-flow

# 2. Installa la skill (crea symlink in ~/.claude/skills/)
bash skill/br-pipeline/install.sh

# 3. Lo script stampa il blocco da aggiungere a ~/.claude/CLAUDE.md
#    Copialo e incollalo nel tuo CLAUDE.md
```

## Guida rapida

### TL/PM

1. Di' `"br-pipeline"` o `"pipeline br"` a Claude Code
2. Vedi la dashboard dei BR attivi con lo stato pipeline
3. Lancia review (S1) o analisi (S3) sul BR scelto
4. Approva il piano dal portale (S4)

### Dev

1. Di' `"le mie task"` a Claude Code
2. Alla prima volta, il setup chiede nome e path locali dei codebase
3. Vedi le task assegnate (solo da BR con piano approvato)
4. Il pipeline propone la prossima task disponibile ed esegue con sottoagenti

## Qualita' dell'esecuzione

L'executor (S5) implementa un processo di verifica rigoroso per ogni task:

- **Test obbligatori** — ogni sottoagente deve scrivere test compresi edge case (input vuoti, null, boundary, casi di errore)
- **Verifica in 3 fasi** — dopo ogni sotto-step:
  - Fase A: test verdi + build compila + copertura edge case verificata
  - Fase B: coerenza col requisito — ogni requisito dalla task verificato contro il codice
  - Fase C: riesame finale — rilettura critica del codice, asserzioni significative, naming
- **Ciclo di verifica finale** — prima di completare una task, tabella di tracciabilita': ogni requisito deve avere implementazione e test corrispondente
- La task NON e' completa finche' il ciclo non e' superato

## Funzionalita' avanzate

- **Aggregazione cross-branch** — il progresso di tutti gli sviluppatori e' visibile anche prima delle merge, sia nella skill CLI che nel portale (API `/api/br/[id]/progress`, cache 60s)
- **Excel export** — endpoint `/api/br/[id]/export` genera un file XLSX con 3 fogli (Task, Per Sviluppatore, Riepilogo) con formattazione condizionale. Solo per TL/PM e admin.
- **Rivalutazione automatica** — quando il funzionale risponde a una domanda del review, l'assunzione collegata viene automaticamente aggiornata. Il TL/PM vede il feedback nella dashboard.

## Spec

Vedi [docs/spec.md](docs/spec.md) per la specifica completa.
