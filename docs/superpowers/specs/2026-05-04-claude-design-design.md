# Claude Design — Design Spec

Data: 2026-05-04

## Obiettivo

Implementare la funzionalita' "Crea con Claude Design" nel portale BR. Il funzionale descrive le schermate in una chat iterativa con Claude, che genera mockup come HTML/React + Tailwind. Il portale mostra una live preview, e il funzionale puo' iterare fino a ottenere il risultato desiderato. Il mockup finale viene convertito in PNG server-side con Puppeteer e allegato al BR nel repo Git.

## Decisioni chiave

| Aspetto | Scelta |
|---|---|
| Output Claude | HTML self-contained con Tailwind CDN |
| Rendering PNG | Server-side con Puppeteer (dev: full, prod: @sparticuz/chromium) |
| UX | Chat iterativa con live preview |
| Design system | Color picker (4 colori) + descrizione libera in chat |
| Multi-mockup | Si, piu' sessioni per BR, modificabili riaprendo la conversazione |
| Storage conversazioni | Redis (Upstash) |
| Storage PNG | Git repo (come mockup uploadati) |
| Integrazione Claude | Vercel AI SDK + useChat + @ai-sdk/anthropic |
| Modello | Claude Opus 4.6 (claude-opus-4-20250514) |

---

## Architettura

### Flusso utente

```
Funzionale apre "Crea con Claude Design" nel form BR
         |
         v
+-----------------------------+
|  Color Picker Panel         |
|  (primario, secondario,     |
|   sfondo, testo)            |
+------------+----------------+
             |
             v
+--------------------------------------------------+
|                  Claude Design Studio             |
|                                                   |
|  +---------------+      +-----------------------+ |
|  |   Chat         |      |   Live Preview        | |
|  |               |      |   (iframe con HTML     | |
|  |  "Crea un     |      |    generato da Claude) | |
|  |   form di     |  --> |                       | |
|  |   login..."   |      |   +----------------+  | |
|  |               |      |   |  Email         |  | |
|  |  Claude:      |      |   |  Password      |  | |
|  |  "Ecco il     |      |   |  [Login]       |  | |
|  |   form..."    |      |   +----------------+  | |
|  +---------------+      +-----------------------+ |
|                                                   |
|  [Salva come mockup]    [Nuova schermata]         |
+---------------------------------------------------+
         |
         | "Salva"
         v
+-----------------------------+
|  Server: Puppeteer          |
|  HTML -> PNG screenshot     |
|  PNG -> upload su Git repo  |
|  Conversazione -> Redis     |
+-----------------------------+
```

### Componenti tecnici

| Componente | Tipo | Responsabilita' |
|---|---|---|
| `ClaudeDesignStudio` | Client component | Layout split chat + preview, gestione sessioni |
| `DesignChat` | Client component | Chat UI con `useChat`, invio messaggi |
| `DesignPreview` | Client component | Iframe sandboxed che renderizza l'HTML di Claude |
| `ColorPickerPanel` | Client component | 4 color picker (primario, secondario, sfondo, testo) |
| `MockupGallery` | Client component | Lista mockup salvati per il BR, con riapertura sessione |
| `/api/claude-design/chat` | Route Handler | Streaming chat con Claude via AI SDK |
| `/api/claude-design/render` | Route Handler | HTML -> PNG con Puppeteer, upload su Git |
| `/api/claude-design/sessions` | Route Handler | CRUD sessioni in Redis |

### Data flow

1. Il funzionale sceglie i colori nel color picker
2. Scrive il messaggio nella chat
3. Il client chiama `/api/claude-design/chat` via `useChat` (streaming SSE)
4. Il Route Handler costruisce il system prompt con: colori scelti + istruzioni per generare HTML self-contained con Tailwind CDN
5. Claude risponde in streaming — il testo appare nella chat
6. Il client estrae il blocco HTML dalla risposta (delimitato da code fence)
7. L'HTML viene iniettato nell'iframe di preview in tempo reale
8. Il funzionale itera: "sposta il bottone", "cambia il colore", ecc.
9. Quando salva: POST a `/api/claude-design/render` con l'HTML finale
10. Puppeteer renderizza e cattura PNG -> upload su Git via Octokit
11. La sessione (messaggi + HTML corrente + colori) viene salvata in Redis

---

## Modello dati

### Sessione Claude Design (Redis)

```typescript
interface DesignSession {
  id: string;                    // UUID
  projectSlug: string;
  brName: string;
  title: string;                 // "Lista ordini", "Form login", ecc.
  colors: {
    primary: string;             // hex, es. "#3B82F6"
    secondary: string;
    background: string;
    text: string;
  };
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  currentHtml: string | null;    // ultimo HTML generato da Claude
  savedAsPng: boolean;           // se e' stato esportato come PNG
  pngPath: string | null;        // path nel repo Git
  createdAt: string;             // ISO date
  updatedAt: string;
}
```

**Chiave Redis**: `design-session:{projectSlug}:{brName}:{sessionId}`

**Indice per BR**: `design-sessions:{projectSlug}:{brName}` -> Set di session ID

### Cosa va dove

| Dato | Storage | Perche' |
|---|---|---|
| Messaggi chat | Redis | Read/write frequenti durante la sessione |
| Colori scelti | Redis (nella sessione) | Parte del contesto della sessione |
| HTML corrente | Redis (nella sessione) | Cambia ad ogni iterazione |
| PNG finale | Git repo (`brs/{nome}/mockups/`) | Artefatto permanente del BR |
| Riferimento nel manifest | `manifest.json` -> `documenti[]` | Il mockup appare nella lista documenti del BR con tipo "mockup" |

### Aggiornamento manifest

Quando il funzionale salva un mockup, viene aggiunto a `manifest.documenti[]`:

```json
{
  "originale": "mockups/lista-ordini.png",
  "convertito": null,
  "tipo": "mockup"
}
```

---

## System prompt Claude

Costruito dinamicamente per ogni sessione. Tre blocchi:

**Blocco 1 — Ruolo e output format**

```
Sei un UI designer esperto. Generi mockup come codice HTML self-contained.

Regole:
- Genera SEMPRE un singolo blocco HTML completo dentro un code fence ```html
- Usa Tailwind CSS via CDN (link nel <head>)
- L'HTML deve essere self-contained: nessun file esterno oltre Tailwind CDN
- Viewport: 1280x800px (desktop)
- Usa solo font di sistema (Inter, system-ui)
- Nessun JavaScript — solo HTML e CSS
- Ogni risposta include il mockup COMPLETO aggiornato, non patch parziali
```

**Blocco 2 — Design system (dai color picker)**

```
Design system del progetto:
- Colore primario: {primary}
- Colore secondario: {secondary}
- Sfondo: {background}
- Testo: {text}

Usa questi colori in modo coerente. Il primario per CTA e accenti,
il secondario per elementi secondari, sfondo e testo come base.
```

**Blocco 3 — Contesto**

```
Stai lavorando al mockup "{session.title}" per il BR "{brName}".
Se l'utente chiede modifiche, rigenera l'HTML completo con le modifiche applicate.
```

### Parametri chiamata

```typescript
const result = streamText({
  model: anthropic("claude-opus-4-20250514"),
  system: buildSystemPrompt(session.colors, session.title, brName),
  messages: session.messages,
  maxTokens: 8192,
});
```

### Estrazione HTML

Il client cerca il pattern ` ```html ... ``` ` nella risposta streaming. Quando trova un blocco completo, lo inietta nell'iframe di preview. Il testo fuori dal code fence viene mostrato come messaggio chat. Fallback: cerca `<html` o `<!DOCTYPE` nel testo.

### Aggiornamento colori mid-session

Se il funzionale cambia un colore nel picker durante la chat, il system prompt viene ricostruito con i nuovi colori alla prossima chiamata.

---

## Pipeline rendering

### Flusso

```
POST /api/claude-design/render { sessionId, projectSlug, brName }
  |
  v
1. Legge session da Redis -> prende currentHtml
2. Lancia Puppeteer headless
3. Apre pagina vuota, setta viewport 1280x800
4. Inietta l'HTML (page.setContent)
5. Attende rendering completo (networkidle)
6. Screenshot -> Buffer PNG
7. Upload PNG su Git repo via Octokit
8. Aggiorna manifest.documenti[] con il nuovo mockup
9. Aggiorna sessione in Redis (savedAsPng: true, pngPath)
10. Risponde con { pngPath, success: true }
```

### Ambiente

| Ambiente | Approccio |
|---|---|
| Sviluppo locale | `puppeteer` con Chromium bundled |
| Vercel / produzione | `puppeteer-core` + `@sparticuz/chromium` (~50MB) |

```typescript
async function getBrowser() {
  if (process.env.NODE_ENV === "development") {
    const puppeteer = await import("puppeteer");
    return puppeteer.launch();
  }
  const chromium = await import("@sparticuz/chromium");
  const puppeteer = await import("puppeteer-core");
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}
```

### Naming PNG

Pattern: `mockups/{session.title slugificato}.png`

Se il funzionale salva di nuovo dopo modifiche, il PNG viene sovrascritto (stesso path, Octokit passa lo SHA esistente). La versione precedente resta nella git history.

---

## UI e componenti

### Punto di ingresso

Claude Design si integra nello step 3 del form BR (`br/nuovo/page.tsx`), sostituendo il placeholder "Prossimamente". Click su "Crea con Claude Design" apre una modale fullscreen.

### Layout Studio

```
+----------------------------------------------------------------+
|  <- Torna al BR          Claude Design — "Lista ordini"    [x] |
+-----------+----------------------------------------------------+
|           |                                                     |
|  SIDEBAR  |              PREVIEW AREA                           |
|           |                                                     |
| +-------+ |   +------------------------------------------+     |
| |Colori | |   |                                          |     |
| |       | |   |     HTML renderizzato in iframe           |     |
| | # Pri | |   |     sandboxed (1280x800)                 |     |
| | # Sec | |   |                                          |     |
| | # Bg  | |   |                                          |     |
| | # Txt | |   |                                          |     |
| +-------+ |   +------------------------------------------+     |
|           |                                                     |
| +-------+ |   +------------------------------------------+     |
| |Mockup | |   |  Chat                                     |     |
| |salvati| |   |                                           |     |
| |       | |   |  Tu: "Crea un form di login con email     |     |
| | Login | |   |       e password"                         |     |
| | Lista | |   |                                           |     |
| +-------+ |   |  Claude: "Ecco il form di login..."       |     |
|           |   |                                           |     |
| [+ Nuovo] |   |  [___________________________] [Invia]    |     |
| [Salva]   |   +------------------------------------------+     |
+-----------+----------------------------------------------------+
```

**Sidebar**: color picker (4 input colore), lista mockup salvati (click per riaprire), bottone nuovo, bottone salva.

**Preview**: iframe sandboxed con l'HTML generato. Si aggiorna in tempo reale durante lo streaming.

**Chat**: interfaccia chat powered by `useChat`. L'HTML nei code fence viene estratto e inviato alla preview, non mostrato raw.

### Integrazione con il form BR

Quando il funzionale chiude lo studio e torna al form:
- I mockup salvati come PNG appaiono nella lista file dello step 3
- Puo' riaprire lo studio per modificarli o crearne di nuovi
- Al submit del BR, i PNG sono gia' nel repo — non serve ulteriore upload

---

## Edge case e sicurezza

### Gestione errori

| Scenario | Comportamento |
|---|---|
| Claude non genera HTML valido | Preview mostra "Nessuna preview disponibile". Chat continua. |
| Claude genera HTML senza code fence | Fallback: cerca `<html` o `<!DOCTYPE` nel testo. |
| Puppeteer fallisce | Errore UI: "Errore nel salvataggio, riprova". HTML resta in Redis. |
| Upload Git fallisce | Errore UI, retry possibile. Sessione Redis intatta. |
| Sessione Redis scaduta/persa | Lista mockup vuota. PNG gia' salvati restano nel repo. |
| API key Claude mancante | Errore al primo messaggio: "Configurazione Claude mancante." |

### Sicurezza iframe

```html
<iframe
  sandbox="allow-same-origin"
  srcdoc={currentHtml}
  style={{ width: 1280, height: 800 }}
/>
```

No `allow-scripts`, no `allow-forms`. Solo rendering visuale.

### TTL Redis

Nessuna scadenza automatica. Le sessioni restano finche' il BR esiste.

### Limiti

- HTML: ~30KB max (8192 tokens). Sufficiente per qualsiasi schermata.
- PNG: 200-500KB tipico a 1280x800. Nessun problema per Git.
- Sessioni per BR: nessun limite artificiale.

---

## Dipendenze da aggiungere

```
ai                  → Vercel AI SDK
@ai-sdk/anthropic   → Provider Anthropic per AI SDK
puppeteer           → Dev locale (Chromium bundled)
puppeteer-core      → Produzione (senza Chromium bundled)
@sparticuz/chromium  → Chromium per ambienti serverless
```

---

## Fuori scope

- Design system condiviso tra BR (ogni sessione ha i suoi colori)
- Mockup responsive (solo desktop 1280x800)
- Esportazione in formati diversi da PNG
- Collaborazione real-time tra piu' funzionali sulla stessa sessione
- Generazione di codice React riutilizzabile (solo mockup visuale)
