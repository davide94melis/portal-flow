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
```

## Architettura

- **Single source of truth**: manifest JSON (`brs/<nome>/manifest.json`)
- **Storage contenuti**: repo Git via GitHub API
- **Auth portale**: NextAuth + Vercel KV
- **Retrocompatibilita**: file MD generati dal manifest come viste di lettura

## Pipeline — Stage

| Stage | ID | Chi | Dove |
|---|---|---|---|
| Onboard | S0 | Funzionale | Portale |
| Review | S1 | TL/PM | Claude Code |
| Clarify | S2 | Funzionale | Portale |
| Analyze | S3 | TL/PM | Claude Code |
| Approve | S4 | TL/PM | Portale |
| Execute | S5 | Dev | Claude Code |
| Verify | S6 | QA | Portale |
| Update | S7 | TL/PM | Claude Code |
| Report | S8 | Tutti | Portale |

## Installazione Skill CLI

```bash
bash skill/br-pipeline/install.sh
```

## Spec

Vedi [docs/spec.md](docs/spec.md) per la specifica completa.
