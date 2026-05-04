# BR Pipeline POM

Sistema a 2 componenti per la gestione di Business Requirements con flusso POM (Project Operating Model).

## Componenti

1. **br-pipeline** (`skill/br-pipeline/`) — Skill CLI per Claude Code. Orchestrazione completa del ciclo BR: review, analisi, pianificazione, esecuzione task, aggiornamenti.
2. **BR Portal** (`portal/`) — Web app Next.js su Vercel con viste per ruolo (Funzionale, TL/PM, Dev, QA).

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
Funzionale         TL/PM              Dev              QA
    |                |                  |                |
    | S0 Crea BR     |                  |                |
    |--------------->|                  |                |
    |                | S1 Review        |                |
    |                | (Claude Code)    |                |
    | S2 Risponde    |                  |                |
    |--------------->|                  |                |
    |                | S3 Analyze       |                |
    |                | S4 Approva piano |                |
    |                |----------------->|                |
    |                |                  | S5 Execute     |
    |                |                  | (Claude Code)  |
    |                |                  |--------------->|
    |                |                  |                | S6 Verify
    |                | S7 Update (se BR cambia)          |
    |                | S8 Report (dashboard)             |
```

## Pipeline — Stage

| Stage | ID | Chi | Dove | Descrizione |
|---|---|---|---|---|
| Onboard | S0 | Funzionale | Portale | Crea BR, carica docs/mockup, assegna team |
| Review | S1 | TL/PM | Claude Code | Analisi docs + codice, genera domande |
| Clarify | S2 | Funzionale | Portale | Risponde alle domande inline |
| Analyze | S3 | TL/PM | Claude Code | Gap analysis + piano + QA test plan |
| Approve | S4 | TL/PM | Portale | GATE: valida e approva il piano |
| Execute | S5 | Dev | Claude Code | Esegue task con sottoagenti |
| Verify | S6 | QA | Portale | Verifica criteri accettazione |
| Update | S7 | TL/PM | Claude Code | Aggiorna piano se BR cambia |
| Report | S8 | Tutti | Portale | Dashboard live, export |

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

## Spec

Vedi [docs/spec.md](docs/spec.md) per la specifica completa.
