# BR Pipeline — Esempio Completo di Flusso

Scenario: il funzionale vuole una nuova funzionalita' di prenotazione ("booking-v3").

---

## Diagramma di flusso

```
                    ┌──────────────────────────────────────────────────────────────────┐
                    │                        BR PIPELINE POM                           │
                    └──────────────────────────────────────────────────────────────────┘

    FUNZIONALE (Portale)          TL/PM (CLI + Portale)           DEV (CLI)
    ═══════════════════           ═════════════════════           ═════════════
            │                              │                          │
            │  ┌─────────────────┐         │                          │
            ├─>│  S0  ONBOARD    │         │                          │
            │  │  Crea BR        │         │                          │
            │  │  Carica docs    │         │                          │
            │  │  Assegna team   │         │                          │
            │  └────────┬────────┘         │                          │
            │           │  notifica        │                          │
            │           └─────────────────>│                          │
            │                              │                          │
            │                     ┌────────┴────────┐                 │
            │                     │  S1  REVIEW     │                 │
            │                     │  "br-pipeline"  │                 │
            │                     │                 │                 │
            │                     │  · Converte doc │                 │
            │                     │  · Analisi docs │                 │
            │                     │  · Check vs cod │                 │
            │                     │  · Genera dom.  │                 │
            │                     └────────┬────────┘                 │
            │           notifica           │                          │
            │<─────────────────────────────┘                          │
            │                                                         │
   ┌────────┴────────┐                                                │
   │  S2  CLARIFY    │                                                │
   │  Risponde       │                                                │
   │  inline sul     │                                                │
   │  portale        │─── salvataggio ──>  manifest.json              │
   │  (parziale ok)  │                     aggiornato                 │
   └────────┬────────┘                                                │
            │           notifica                                      │
            └─────────────────────>│                                  │
                                   │                                  │
                          ┌────────┴────────┐                         │
                          │  S3  ANALYZE    │                         │
                          │  "br-pipeline"  │                         │
                          │                 │                         │
                          │  · Incorpora    │                         │
                          │    risposte     │                         │
                          │  · Rivaluta     │                         │
                          │    bloccanti    │                         │
                          │  · Esplora      │                         │
                          │    codebase     │                         │
                          │  · Gap analysis │                         │
                          │  · Genera piano │                         │
                          │    (stream,     │                         │
                          │     merge task, │                         │
                          │     wave)       │                         │
                          └────────┬────────┘                         │
                                   │                                  │
                          ┌────────┴────────┐                         │
                          │  S4  APPROVE    │                         │
                          │  (Portale)      │                         │
                          │                 │                         │
                          │  GATE: approva  │                         │
                          │  il piano       │                         │
                          └────────┬────────┘                         │
                                   │  notifica                        │
                                   └─────────────────────────────────>│
                                                                      │
                                                             ┌────────┴────────┐
                                                             │  S5  EXECUTE    │
                                                             │  "le mie task"  │
                                                             │                 │
                                                             │  Per ogni task: │
                                                             │  · Sottoagente  │
                                                             │    implementa   │
                                                             │  · Fase A:      │
                                                             │    test + build │
                                                             │  · Fase B:      │
                                                             │    coerenza     │
                                                             │    requisito    │
                                                             │  · Fase C:      │
                                                             │    riesame      │
                                                             │    (second look)│
                                                             │  · Ciclo finale │
                                                             │    tracciab.    │
                                                             └────────┬────────┘
                                                                      │
                          ┌───────────────────────────────────────────>│
                          │  (se BR cambia)                           │
                 ┌────────┴────────┐                                  │
                 │  S6  UPDATE     │                                  │
                 │  "br-pipeline"  │                                  │
                 │                 │                                  │
                 │  · Delta docs   │                                  │
                 │  · Aggiorna     │                                  │
                 │    piano        │                                  │
                 │  · Preserva     │                                  │
                 │    progresso    │                                  │
                 └────────┬────────┘                                  │
                          │  ritorna in S5                            │
                          └──────────────────────────────────────────>│
                                                                      │
                          ┌───────────────────────────────────────────┘
                          │
                 ┌────────┴────────┐
                 │  S7  REPORT     │
                 │  (Portale)      │
                 │                 │
                 │  · Dashboard    │
                 │    live         │
                 │  · Progresso    │
                 │    aggregato    │
                 │    cross-branch │
                 │  · Excel export │
                 └─────────────────┘
```

### Dettaglio verifica in S5 Execute

```
                    ┌─────────────────────────┐
                    │  Sottoagente completa    │
                    │  il sotto-step           │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  FASE A — Tecnica        │
                    │  · Test tutti verdi?      │
                    │  · Build compila?         │
                    │  · Edge case coperti?     │
                    └────────────┬─────────────┘
                                 │
                         ┌───────┴───────┐
                         │ Passa?        │
                         └───┬───────┬───┘
                          No │       │ Si
                   ┌─────────▼──┐    │
                   │ Sottoagente│    │
                   │ corregge   │────┘
                   └────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  FASE B — Coerenza       │
                    │  Per ogni requisito:      │
                    │  · Implementato?          │
                    │  · Implementato bene?     │
                    │  · Manca qualcosa?        │
                    └────────────┬─────────────┘
                                 │
                         ┌───────┴───────┐
                         │ Passa?        │
                         └───┬───────┬───┘
                          No │       │ Si
                   ┌─────────▼──┐    │
                   │ Sottoagente│    │
                   │ allinea    │────┘
                   └────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  FASE C — Riesame        │
                    │  · Rileggi codice        │
                    │  · Assunzioni nascoste?   │
                    │  · Test asseriscono?      │
                    │  · Naming ok?             │
                    └────────────┬─────────────┘
                                 │
                         ┌───────┴───────┐
                         │ Passa?        │
                         └───┬───────┬───┘
                          No │       │ Si
                   ┌─────────▼──┐    │
                   │ Correggi + │    │
                   │ ripeti C   │────┘
                   └────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Sotto-step VERIFICATO    │
                    │  → aggiorna progresso    │
                    └──────────────────────────┘
```

### Ciclo di verifica finale (completamento task)

```
                    ┌─────────────────────────────┐
                    │  Tutti i sotto-step          │
                    │  completati e verificati     │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  TABELLA TRACCIABILITA'       │
                    │                               │
                    │  Per ogni requisito:          │
                    │  · File + riga implementaz.   │
                    │  · Test che lo verifica        │
                    │  · Celle vuote = INCOMPLETA   │
                    └──────────────┬───────────────┘
                                   │
                           ┌───────┴───────┐
                           │ Tutto coperto?│
                           └───┬───────┬───┘
                            No │       │ Si
                     ┌─────────▼──┐    │
                     │ Sottoagente│    │
                     │ completa   │────┘
                     │ + ripeti   │
                     └────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │  TASK COMPLETATA             │
                    │  stato → completata          │
                    │  progresso → 100%            │
                    │  → suggerisci commit al dev  │
                    └─────────────────────────────┘
```

---

## Walkthrough passo-passo

### S0 — Onboard (Funzionale, sul Portale)

Mario Rossi (funzionale) accede al portale, clicca "Nuovo BR" e compila:

- **Nome**: `booking-v3`
- **Documenti**: carica `BR_Booking_v3.docx` e `Mockup_Wizard.png`
- **Team**: seleziona Marco (BE Senior), Luca (FE Mid), Anna (BE Junior)
- **TL/PM**: seleziona Davide

Il portale crea `brs/booking-v3/manifest.json` nel repo Git via GitHub API con `stato_pipeline: "onboard"`. Davide riceve una notifica.

---

### S1 — Review (TL/PM, su Claude Code)

Davide apre il terminale e dice:

> `br-pipeline`

La skill risponde:

```
Dashboard BR

| BR         | Stage   | Ultimo evento          | Azione suggerita       |
|------------|---------|------------------------|------------------------|
| booking-v3 | onboard | Documenti caricati (2h) | Lanciare review → S1   |

Vuoi lanciare il review per booking-v3?
```

Davide conferma. La pipeline:

1. Converte il DOCX in Markdown
2. Analizza la documentazione (intra-doc, inter-doc)
3. Fa il check leggero vs codice (entita', enum, API) usando agent Explore
4. Trova 2 problemi bloccanti e 4 non bloccanti
5. Propone assunzioni per i non bloccanti
6. Scrive tutto in `manifest.review.problemi[]` e `manifest.review.assunzioni[]`
7. Genera `brs/booking-v3/REVIEW_BR.md` (vista retrocompatibile)
8. Commit + push: `[br-pipeline] booking-v3: review completato (2 bloccanti, 4 non bloccanti)`

Output:

```
Review completato per booking-v3.

Esito: Con bloccanti
- Problemi bloccanti: 2
- Problemi non bloccanti: 4
- Assunzioni proposte: 4
- Disallineamenti codice: 1

Prossimo step: Il funzionale deve rispondere alle domande sul portale (S2).
```

---

### S2 — Clarify (Funzionale, sul Portale)

Mario riceve una notifica: "Review completato — 6 domande per te".

Accede a `/br/booking-v3/review` e vede le domande raggruppate per priorita':

- **Bloccanti** (banner rosso): 2 domande senza assunzione — deve rispondere
- **Non bloccanti**: 4 domande con l'assunzione proposta visibile ("se non rispondi, assumiamo X")

Mario risponde a 5 domande su 6 inline. Salva parzialmente e torna il giorno dopo per la sesta. Ogni salvataggio:

- Aggiorna `manifest.review.problemi[].risposta` via GitHub API
- Se il problema ha un'assunzione collegata, aggiorna automaticamente `assunzione.risposta_funzionale`
- Il primo salvataggio cambia `stato_pipeline` da `"review"` a `"clarify"`

Davide vede sulla sua dashboard: "booking-v3: 5 risposte ricevute".

---

### S3 — Analyze (TL/PM, su Claude Code)

Davide dice:

> `br-pipeline`

```
Dashboard BR

| BR         | Stage   | Ultimo evento              | Azione suggerita         |
|------------|---------|----------------------------|--------------------------|
| booking-v3 | clarify | 5 risposte ricevute (1h)   | Lanciare analisi → S3    |

Vuoi lanciare l'analisi per booking-v3?
```

Davide conferma. La pipeline:

**1. Incorpora risposte — rivalutazione interattiva**

Per ogni bloccante con risposta:

```
B-001 "Flusso annullamento":
Mario ha risposto: "L'annullamento genera un rimborso totale e notifica via email."
→ Consideri questo bloccante risolto? [si/no]
```

Per ogni assunzione con risposta diversa:

```
A-003: L'assunzione era "formato ISO 8601 (yyyy-MM-dd)"
Mario ha risposto: "Usiamo dd/MM/yyyy come nel resto del sistema"
→ Vuoi usare la risposta del funzionale? [si/no]
```

Davide conferma → assunzione A-003 rigettata, si usa il formato del funzionale.

**2. Esplora i codebase** con agent Explore (BE e FE in parallelo)

**3. Gap analysis**: identifica 8 gap

**4. Genera il piano** con stream, merge task e branch convention:

```
Stream: stream-fondazioni, stream-booking, stream-wizard-fe

| ID          | Stream             | Owner | Area | P  | Wave | Attivita                    | Branch                              | Effort |
|-------------|--------------------|-------|------|----|------|-----------------------------|-------------------------------------|--------|
| T-001       | stream-fondazioni  | Marco | BE   | P0 | 0    | Entita Booking + migration  | feature/booking-v3-entity-booking   | 3gg    |
| T-002       | stream-fondazioni  | Marco | BE   | P0 | 0    | Enum stati booking          | feature/booking-v3-enum-status      | 1gg    |
| T-MERGE-002 | stream-fondazioni  | Marco | BE   | P0 | 0→1  | Merge fondazioni in develop | —                                   | 0.5gg  |
| T-003       | stream-booking     | Marco | BE   | P1 | 1    | API CRUD booking            | feature/booking-v3-api-crud         | 4gg    |
| T-004       | stream-booking     | Anna  | BE   | P1 | 1    | Servizio annullamento       | feature/booking-v3-cancellation     | 2gg    |
| T-005       | stream-wizard-fe   | Luca  | FE   | P1 | 1    | Wizard creazione booking    | feature/booking-v3-wizard           | 5gg    |
| T-006       | stream-wizard-fe   | Luca  | FE   | P2 | 2    | Pagina lista booking        | feature/booking-v3-list-page        | 3gg    |
```

Commit + push, `stato_pipeline → "analyze"`.

---

### S4 — Approve (TL/PM, sul Portale)

Davide accede a `/br/booking-v3/piano`. Vede il piano completo: stream, task, wave, dipendenze, effort.

Rivede le assegnazioni. Nota che Anna (junior) ha T-004 (servizio annullamento) con Marco come reviewer — ok.

Clicca **"Approva piano"**. Da questo momento:

- `piano.approvato = true`
- Le task diventano visibili ai dev
- Marco, Luca e Anna ricevono notifica

---

### S5 — Execute (Dev, su Claude Code)

#### Marco inizia

Marco dice:

> `le mie task`

Alla prima volta, la pipeline chiede nome e path:

```
Come ti chiami? → Marco
Path per BE? → C:/repos/backend
```

Crea `.br-local.json` (gitignored). Poi mostra:

```
Le tue task (progresso aggregato da 1 branch remoto)

| BR         | Task       | Attivita                 | Wave | P  | Stato       | %  | Bloccata da  |
|------------|------------|--------------------------|------|----|-------------|----|--------------| 
| booking-v3 | T-001      | Entita Booking + migr.   | 0    | P0 | da_iniziare | 0  | —            |
| booking-v3 | T-002      | Enum stati booking       | 0    | P0 | da_iniziare | 0  | —            |
| booking-v3 | T-MERGE-002| Merge fondazioni         | 0→1  | P0 | da_iniziare | 0  | T-001, T-002 |
| booking-v3 | T-003      | API CRUD booking         | 1    | P1 | da_iniziare | 0  | T-MERGE-002  |

La prossima task disponibile e' T-001 — Entita Booking + migration (P0, wave 0).
Vuoi iniziare?
```

Marco conferma. La pipeline:

1. Crea branch `feature/booking-v3-entity-booking` nella repo BE
2. Scompone T-001 in sotto-step
3. Lancia un sottoagente: "Crea l'entita' Booking con campi id, utente, data_inizio, data_fine, stato, importo. Scrivi la migration. DEVI scrivere test compresi edge case."

Il sottoagente lavora e produce codice + test.

**Fase A — Verifica tecnica:**

```
✅ Test: 12 test (5 happy path, 5 edge case, 2 error case) — tutti verdi
✅ Build: compila
✅ Edge case coperti: date null, importo negativo, stato invalido, stringa utente vuota
```

**Fase B — Verifica coerenza col requisito:**

```
Requisito: "Entita Booking con campi: id, utente, data_inizio, data_fine, stato, importo"
✅ Tutti i campi implementati
✅ Tipi corretti (LocalDate per date, BigDecimal per importo)
✅ Migration allineata con l'entita'
```

**Fase C — Riesame finale:**

```
✅ Naming: PascalCase per l'entita', snake_case per le colonne DB
✅ Test asseriscono valori specifici (non solo "non null")
✅ Nessun valore hardcodato
✅ Formato data dd/MM/yyyy come da risposta del funzionale (A-003 rigettata)
```

**Ciclo di verifica finale:**

```
Verifica completamento T-001:

| # | Requisito              | Implementato | File                         | Test                            | ✓  |
|---|------------------------|--------------|------------------------------|---------------------------------|----|
| 1 | Entita Booking         | Si           | domain/Booking.java:15       | BookingTest#testCreate          | ✅ |
| 2 | Campo stato con enum   | Si           | domain/BookingStatus.java:1   | BookingTest#testStatusEnum      | ✅ |
| 3 | Migration              | Si           | migration/V5__booking.sql:1   | BookingIntTest#testMigration    | ✅ |
| 4 | Validazione date       | Si           | domain/Booking.java:35        | BookingTest#testInvalidDates    | ✅ |
| 5 | Formato dd/MM/yyyy     | Si           | domain/Booking.java:42        | BookingTest#testDateFormat      | ✅ |

Esito: COMPLETA — 5/5 requisiti coperti
```

```
La task T-001 e' completa e verificata.

- Requisiti coperti: 5/5
- Test: 12 totali (5 happy path, 5 edge case, 2 error case) — tutti verdi
- Build: compila
- Coerenza: verificata
- Riesame: superato

Suggerisco:
  git add src/main/java/domain/Booking.java ...
  git commit -m "feat(booking): add Booking entity with status enum and migration"
  git push origin feature/booking-v3-entity-booking

Quando hai committato, dimmelo e proseguo con T-002.
```

Marco committa, pusha, e prosegue con T-002 e poi T-MERGE-002.

#### Luca aspetta, poi si sblocca

Luca dice `le mie task`:

```
| booking-v3 | T-005 | Wizard creazione booking | 1 | P1 | da_iniziare | 0 | T-MERGE-002 |
| booking-v3 | T-006 | Pagina lista booking     | 2 | P2 | da_iniziare | 0 | T-005       |

Tutte le tue task sono bloccate da dipendenze non ancora completate.
T-MERGE-002 e' in corso al 50% (aggregato dal branch di Marco).
```

Quando Marco completa T-MERGE-002 e pusha, Luca riesegue `le mie task`. L'aggregazione cross-branch vede che T-MERGE-002 e' completata → T-005 si sblocca:

```
La prossima task disponibile e' T-005 — Wizard creazione booking (P1, wave 1).
Vuoi iniziare?
```

---

### S6 — Update (TL/PM, se il BR cambia)

A meta' sviluppo, il funzionale carica una nuova versione del BR con un campo aggiuntivo "note_speciali" nel booking. Davide dice:

> `br-pipeline`

```
Il BR booking-v3 ha nuovi documenti in docs/.
Vuoi lanciare l'aggiornamento?
```

La pipeline:

1. Analizza il delta: 1 requisito nuovo (campo note_speciali)
2. Crea task T-007 (BE, Marco, P1, wave 2) e T-008 (FE, Luca, P2, wave 2)
3. Le task completate restano completate — il progresso non si perde
4. Rigenera le viste MD

---

### S7 — Report (chiunque, sul Portale)

Davide accede alla dashboard. Il progresso e' aggregato da tutti i branch remoti:

```
booking-v3 — execute
Task: 3/7 completate (43%)
  ████████░░░░░░░░░░ 43%

Marco:  T-001 ✅  T-002 ✅  T-MERGE-002 ✅  T-003 ░░ 30%
Anna:   T-004 ░░ 10%
Luca:   T-005 ░░ 60%  T-006 ░░ 0%
```

Clicca "Esporta Excel" → scarica `AVANZAMENTO_booking-v3_2026-05-10.xlsx` con:

- **Foglio "Task"**: tutte le task con formattazione condizionale (verde = completata, blu = in corso, rosso = bloccata)
- **Foglio "Per Sviluppatore"**: Marco 3/4 task, Luca 0/2, Anna 0/1
- **Foglio "Riepilogo"**: progresso 43%, effort completato 4.5/18.5 gg, wave 0 al 100%, wave 1 al 30%, wave 2 al 0%

---

## Ruoli e dove lavorano

| Ruolo | Dove | Cosa fa |
|---|---|---|
| **Funzionale** | Solo portale | Crea BR, carica docs, risponde alle domande inline |
| **TL/PM** | CLI + portale | Lancia review/analisi dalla CLI, approva piano e monitora dal portale |
| **Dev** | Solo CLI | Dice `le mie task`, lavora con sottoagenti, committa e pusha |
| **Admin** | Solo portale | Gestisce utenti e ruoli |

## Chiave del sistema

- **manifest.json** e' la single source of truth — tutto il resto (portale, viste MD, Excel) e' una proiezione
- **Niente DOCX** — il funzionale risponde inline sul portale, zero conversioni
- **Gate esplicito** — i dev NON vedono le task finche' il TL/PM non approva il piano (S4)
- **Test obbligatori** — ogni sotto-step deve avere test con edge case; 3 fasi di verifica prima di completare
- **Aggregazione cross-branch** — il progresso di tutti e' visibile senza merge
