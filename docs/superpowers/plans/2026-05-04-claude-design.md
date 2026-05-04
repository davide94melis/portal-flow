# Claude Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the funzionale to generate UI mockups via a chat interface with Claude, preview them live, and save them as PNGs attached to the BR.

**Architecture:** A fullscreen studio with chat (AI SDK `useChat`) + live preview (sandboxed iframe) + color picker. Claude generates self-contained HTML+Tailwind. Server-side Puppeteer renders HTML to PNG, which gets uploaded to the Git repo. Conversations persist in Redis.

**Tech Stack:** Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`), Puppeteer, Upstash Redis, Next.js 16, Tailwind 4.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `portal/src/types/design-session.ts` | `DesignSession` and `DesignColors` types |
| `portal/src/lib/design-sessions.ts` | Redis CRUD for design sessions |
| `portal/src/lib/html-extract.ts` | Extract HTML code blocks from Claude responses |
| `portal/src/lib/system-prompt.ts` | Build the Claude Design system prompt |
| `portal/src/lib/renderer.ts` | Puppeteer HTML-to-PNG rendering |
| `portal/src/app/api/claude-design/sessions/route.ts` | GET (list) / POST (create) sessions |
| `portal/src/app/api/claude-design/sessions/[sessionId]/route.ts` | GET / PATCH / DELETE single session |
| `portal/src/app/api/claude-design/chat/route.ts` | Streaming chat with Claude |
| `portal/src/app/api/claude-design/render/route.ts` | HTML to PNG + Git upload |
| `portal/src/components/claude-design/ClaudeDesignStudio.tsx` | Main studio layout (modale fullscreen) |
| `portal/src/components/claude-design/DesignChat.tsx` | Chat UI with `useChat` |
| `portal/src/components/claude-design/DesignPreview.tsx` | Sandboxed iframe preview |
| `portal/src/components/claude-design/ColorPickerPanel.tsx` | 4 color pickers |
| `portal/src/components/claude-design/MockupGallery.tsx` | List saved sessions, reopen |

### Modified files

| File | Change |
|---|---|
| `portal/package.json` | Add dependencies |
| `portal/src/app/br/nuovo/page.tsx` | Replace placeholder with studio integration |
| `portal/src/middleware.ts` | Allow `/api/claude-design/*` for funzionale |

---

## Task 1: Install dependencies

**Files:**
- Modify: `portal/package.json`

- [ ] **Step 1: Install AI SDK and Anthropic provider**

```bash
cd portal && npm install ai @ai-sdk/anthropic @ai-sdk/react
```

- [ ] **Step 2: Install Puppeteer for local dev**

```bash
cd portal && npm install puppeteer
```

- [ ] **Step 3: Install Puppeteer for production**

```bash
cd portal && npm install puppeteer-core @sparticuz/chromium
```

- [ ] **Step 4: Verify package.json has all new deps**

```bash
cd portal && node -e "const p=require('./package.json'); const deps={...p.dependencies}; ['ai','@ai-sdk/anthropic','@ai-sdk/react','puppeteer','puppeteer-core','@sparticuz/chromium'].forEach(d => console.log(d, deps[d] ? 'OK' : 'MISSING'))"
```

Expected: all OK

- [ ] **Step 5: Add ANTHROPIC_API_KEY to .env.local**

Add to `portal/.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

- [ ] **Step 6: Commit**

```bash
cd portal && git add package.json package-lock.json && git commit -m "feat(claude-design): add AI SDK, Anthropic, and Puppeteer dependencies"
```

---

## Task 2: Design session types

**Files:**
- Create: `portal/src/types/design-session.ts`

- [ ] **Step 1: Create the types file**

```typescript
// portal/src/types/design-session.ts

export interface DesignColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface DesignMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DesignSession {
  id: string;
  projectSlug: string;
  brName: string;
  title: string;
  colors: DesignColors;
  messages: DesignMessage[];
  currentHtml: string | null;
  savedAsPng: boolean;
  pngPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSessionSummary {
  id: string;
  title: string;
  savedAsPng: boolean;
  pngPath: string | null;
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/types/design-session.ts && git commit -m "feat(claude-design): add DesignSession types"
```

---

## Task 3: HTML extraction utility

**Files:**
- Create: `portal/src/lib/html-extract.ts`

- [ ] **Step 1: Create the extraction function**

```typescript
// portal/src/lib/html-extract.ts

export function extractHtmlFromMarkdown(text: string): string | null {
  const fenceMatch = text.match(/```html\s*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const doctypeMatch = text.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
  if (doctypeMatch) return doctypeMatch[1].trim();

  const htmlTagMatch = text.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/lib/html-extract.ts && git commit -m "feat(claude-design): add HTML extraction utility"
```

---

## Task 4: System prompt builder

**Files:**
- Create: `portal/src/lib/system-prompt.ts`

- [ ] **Step 1: Create the system prompt builder**

```typescript
// portal/src/lib/system-prompt.ts

import type { DesignColors } from "@/types/design-session";

export function buildSystemPrompt(
  colors: DesignColors,
  title: string,
  brName: string
): string {
  return `Sei un UI designer esperto. Generi mockup come codice HTML self-contained.

Regole:
- Genera SEMPRE un singolo blocco HTML completo dentro un code fence \`\`\`html
- Usa Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script> nel <head>
- L'HTML deve essere self-contained: nessun file esterno oltre Tailwind CDN
- Viewport: 1280x800px (desktop). Usa min-height: 800px sul body
- Usa solo font di sistema: Inter, system-ui, sans-serif
- Nessun JavaScript — solo HTML e CSS/Tailwind classes
- Ogni risposta include il mockup COMPLETO aggiornato, non patch parziali
- Rispondi in italiano

Design system del progetto:
- Colore primario: ${colors.primary}
- Colore secondario: ${colors.secondary}
- Sfondo: ${colors.background}
- Testo: ${colors.text}

Usa questi colori in modo coerente. Il primario per CTA e accenti, il secondario per elementi secondari, sfondo e testo come base. Puoi usare varianti (piu' chiare/scure) dei colori forniti.

Stai lavorando al mockup "${title}" per il BR "${brName}".
Se l'utente chiede modifiche, rigenera l'HTML completo con le modifiche applicate.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/lib/system-prompt.ts && git commit -m "feat(claude-design): add system prompt builder"
```

---

## Task 5: Design sessions Redis CRUD

**Files:**
- Create: `portal/src/lib/design-sessions.ts`

- [ ] **Step 1: Create the Redis CRUD module**

```typescript
// portal/src/lib/design-sessions.ts

import { redis } from "./redis";
import type {
  DesignSession,
  DesignSessionSummary,
  DesignColors,
  DesignMessage,
} from "@/types/design-session";

function sessionKey(projectSlug: string, brName: string, sessionId: string) {
  return `design-session:${projectSlug}:${brName}:${sessionId}`;
}

function indexKey(projectSlug: string, brName: string) {
  return `design-sessions:${projectSlug}:${brName}`;
}

export async function createDesignSession(
  projectSlug: string,
  brName: string,
  title: string,
  colors: DesignColors
): Promise<DesignSession> {
  const session: DesignSession = {
    id: crypto.randomUUID(),
    projectSlug,
    brName,
    title,
    colors,
    messages: [],
    currentHtml: null,
    savedAsPng: false,
    pngPath: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey(projectSlug, brName, session.id), session);
  await redis.sadd(indexKey(projectSlug, brName), session.id);

  return session;
}

export async function getDesignSession(
  projectSlug: string,
  brName: string,
  sessionId: string
): Promise<DesignSession | null> {
  return redis.get<DesignSession>(sessionKey(projectSlug, brName, sessionId));
}

export async function updateDesignSession(
  projectSlug: string,
  brName: string,
  sessionId: string,
  updates: Partial<Pick<DesignSession, "title" | "colors" | "messages" | "currentHtml" | "savedAsPng" | "pngPath">>
): Promise<DesignSession | null> {
  const session = await getDesignSession(projectSlug, brName, sessionId);
  if (!session) return null;

  const updated: DesignSession = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey(projectSlug, brName, sessionId), updated);
  return updated;
}

export async function deleteDesignSession(
  projectSlug: string,
  brName: string,
  sessionId: string
): Promise<void> {
  await redis.del(sessionKey(projectSlug, brName, sessionId));
  await redis.srem(indexKey(projectSlug, brName), sessionId);
}

export async function listDesignSessions(
  projectSlug: string,
  brName: string
): Promise<DesignSessionSummary[]> {
  const ids = await redis.smembers(indexKey(projectSlug, brName));
  const summaries: DesignSessionSummary[] = [];

  for (const id of ids) {
    const session = await redis.get<DesignSession>(
      sessionKey(projectSlug, brName, id)
    );
    if (session) {
      summaries.push({
        id: session.id,
        title: session.title,
        savedAsPng: session.savedAsPng,
        pngPath: session.pngPath,
        updatedAt: session.updatedAt,
      });
    }
  }

  return summaries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function appendMessage(
  projectSlug: string,
  brName: string,
  sessionId: string,
  message: DesignMessage,
  currentHtml?: string | null
): Promise<DesignSession | null> {
  const session = await getDesignSession(projectSlug, brName, sessionId);
  if (!session) return null;

  session.messages.push(message);
  if (currentHtml !== undefined) {
    session.currentHtml = currentHtml;
  }
  session.updatedAt = new Date().toISOString();

  await redis.set(sessionKey(projectSlug, brName, sessionId), session);
  return session;
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/lib/design-sessions.ts && git commit -m "feat(claude-design): add design sessions Redis CRUD"
```

---

## Task 6: Sessions API route (list + create)

**Files:**
- Create: `portal/src/app/api/claude-design/sessions/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// portal/src/app/api/claude-design/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createDesignSession,
  listDesignSessions,
} from "@/lib/design-sessions";
import type { DesignColors } from "@/types/design-session";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const projectSlug = req.nextUrl.searchParams.get("projectSlug");
  const brName = req.nextUrl.searchParams.get("brName");

  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const sessions = await listDesignSessions(projectSlug, brName);
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { projectSlug, brName, title, colors } = (await req.json()) as {
    projectSlug: string;
    brName: string;
    title: string;
    colors: DesignColors;
  };

  if (!projectSlug || !brName || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const defaultColors: DesignColors = {
    primary: "#3B82F6",
    secondary: "#6B7280",
    background: "#FFFFFF",
    text: "#1F2937",
  };

  const designSession = await createDesignSession(
    projectSlug,
    brName,
    title,
    colors || defaultColors
  );

  return NextResponse.json(designSession, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/app/api/claude-design/sessions/route.ts && git commit -m "feat(claude-design): add sessions list/create API"
```

---

## Task 7: Single session API route (get + update + delete)

**Files:**
- Create: `portal/src/app/api/claude-design/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// portal/src/app/api/claude-design/sessions/[sessionId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDesignSession,
  updateDesignSession,
  deleteDesignSession,
} from "@/lib/design-sessions";

function parseQuery(req: NextRequest) {
  const projectSlug = req.nextUrl.searchParams.get("projectSlug");
  const brName = req.nextUrl.searchParams.get("brName");
  return { projectSlug, brName };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName } = parseQuery(req);
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const designSession = await getDesignSession(projectSlug, brName, sessionId);
  if (!designSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(designSession);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName, ...updates } = await req.json();
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const updated = await updateDesignSession(projectSlug, brName, sessionId, updates);
  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName } = parseQuery(req);
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  await deleteDesignSession(projectSlug, brName, sessionId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/app/api/claude-design/sessions/\\[sessionId\\]/route.ts && git commit -m "feat(claude-design): add single session get/update/delete API"
```

---

## Task 8: Chat streaming API route

**Files:**
- Create: `portal/src/app/api/claude-design/chat/route.ts`

- [ ] **Step 1: Create the chat route handler**

```typescript
// portal/src/app/api/claude-design/chat/route.ts

import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDesignSession, appendMessage } from "@/lib/design-sessions";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { extractHtmlFromMarkdown } from "@/lib/html-extract";
import type { DesignColors } from "@/types/design-session";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const {
    messages,
    sessionId,
    projectSlug,
    brName,
    colors,
    title,
  } = (await req.json()) as {
    messages: UIMessage[];
    sessionId: string;
    projectSlug: string;
    brName: string;
    colors: DesignColors;
    title: string;
  };

  const designSession = await getDesignSession(projectSlug, brName, sessionId);
  if (!designSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt(colors, title, brName);

  const result = streamText({
    model: anthropic("claude-opus-4-20250514"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxTokens: 8192,
    async onFinish({ text }) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        const userText = lastUserMsg.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || "";
        await appendMessage(projectSlug, brName, sessionId, {
          role: "user",
          content: userText,
        });
      }

      const html = extractHtmlFromMarkdown(text);
      await appendMessage(projectSlug, brName, sessionId, {
        role: "assistant",
        content: text,
      }, html);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/app/api/claude-design/chat/route.ts && git commit -m "feat(claude-design): add streaming chat API route with Claude Opus 4.6"
```

---

## Task 9: Puppeteer renderer

**Files:**
- Create: `portal/src/lib/renderer.ts`

- [ ] **Step 1: Create the renderer module**

```typescript
// portal/src/lib/renderer.ts

import type { Browser } from "puppeteer-core";

export async function renderHtmlToPng(html: string): Promise<Buffer> {
  let browser: Browser;

  if (process.env.NODE_ENV === "development") {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({ headless: true });
  } else {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/lib/renderer.ts && git commit -m "feat(claude-design): add Puppeteer HTML-to-PNG renderer"
```

---

## Task 10: Render API route (HTML to PNG + Git upload)

**Files:**
- Create: `portal/src/app/api/claude-design/render/route.ts`

- [ ] **Step 1: Create the render route handler**

```typescript
// portal/src/app/api/claude-design/render/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDesignSession, updateDesignSession } from "@/lib/design-sessions";
import { getProject, updateManifest } from "@/lib/manifest";
import { uploadFile } from "@/lib/github";
import { renderHtmlToPng } from "@/lib/renderer";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId, projectSlug, brName } = (await req.json()) as {
    sessionId: string;
    projectSlug: string;
    brName: string;
  };

  const designSession = await getDesignSession(projectSlug, brName, sessionId);
  if (!designSession || !designSession.currentHtml) {
    return NextResponse.json(
      { error: "Session not found or no HTML to render" },
      { status: 404 }
    );
  }

  const project = await getProject(projectSlug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const pngBuffer = await renderHtmlToPng(designSession.currentHtml);

  const slug = slugify(designSession.title);
  const pngPath = `brs/${brName}/mockups/${slug}.png`;

  const repo = {
    owner: project.repoOwner,
    name: project.repoName,
    branch: project.branch,
  };

  await uploadFile(
    repo,
    pngPath,
    pngBuffer,
    `[br-portal] ${brName}: mockup ${designSession.title}`
  );

  await updateManifest(projectSlug, brName, (m) => {
    const existing = m.documenti.findIndex(
      (d) => d.originale === `mockups/${slug}.png`
    );
    if (existing === -1) {
      m.documenti.push({
        originale: `mockups/${slug}.png`,
        convertito: null,
        tipo: "mockup",
      });
    }
    return m;
  }, `mockup ${designSession.title} saved`);

  await updateDesignSession(projectSlug, brName, sessionId, {
    savedAsPng: true,
    pngPath,
  });

  return NextResponse.json({ pngPath, success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/app/api/claude-design/render/route.ts && git commit -m "feat(claude-design): add render API route (HTML to PNG + Git upload)"
```

---

## Task 11: ColorPickerPanel component

**Files:**
- Create: `portal/src/components/claude-design/ColorPickerPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// portal/src/components/claude-design/ColorPickerPanel.tsx

"use client";

import type { DesignColors } from "@/types/design-session";

interface Props {
  colors: DesignColors;
  onChange: (colors: DesignColors) => void;
}

const FIELDS: { key: keyof DesignColors; label: string }[] = [
  { key: "primary", label: "Primario" },
  { key: "secondary", label: "Secondario" },
  { key: "background", label: "Sfondo" },
  { key: "text", label: "Testo" },
];

export function ColorPickerPanel({ colors, onChange }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Colori</h3>
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2">
          <input
            type="color"
            value={colors[key]}
            onChange={(e) => onChange({ ...colors, [key]: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded border border-border"
          />
          <div className="flex-1">
            <p className="text-xs font-medium">{label}</p>
            <p className="text-xs text-muted">{colors[key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/components/claude-design/ColorPickerPanel.tsx && git commit -m "feat(claude-design): add ColorPickerPanel component"
```

---

## Task 12: DesignPreview component

**Files:**
- Create: `portal/src/components/claude-design/DesignPreview.tsx`

- [ ] **Step 1: Create the component**

```tsx
// portal/src/components/claude-design/DesignPreview.tsx

"use client";

interface Props {
  html: string | null;
}

export function DesignPreview({ html }: Props) {
  if (!html) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-surface/50">
        <p className="text-sm text-muted">
          Descrivi la schermata nella chat per vedere la preview.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <iframe
        sandbox="allow-same-origin"
        srcDoc={html}
        className="h-full w-full"
        style={{ minHeight: 500 }}
        title="Mockup preview"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/components/claude-design/DesignPreview.tsx && git commit -m "feat(claude-design): add DesignPreview component"
```

---

## Task 13: MockupGallery component

**Files:**
- Create: `portal/src/components/claude-design/MockupGallery.tsx`

- [ ] **Step 1: Create the component**

```tsx
// portal/src/components/claude-design/MockupGallery.tsx

"use client";

import type { DesignSessionSummary } from "@/types/design-session";

interface Props {
  sessions: DesignSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export function MockupGallery({ sessions, activeSessionId, onSelect, onNew }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Mockup</h3>
      {sessions.length === 0 ? (
        <p className="text-xs text-muted">Nessun mockup creato.</p>
      ) : (
        <div className="space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                s.id === activeSessionId
                  ? "bg-primary text-white"
                  : "hover:bg-surface"
              }`}
            >
              <p className="truncate font-medium">{s.title}</p>
              <p
                className={`text-xs ${
                  s.id === activeSessionId ? "text-white/70" : "text-muted"
                }`}
              >
                {s.savedAsPng ? "Salvato" : "Bozza"}
              </p>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onNew}
        className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
      >
        + Nuovo mockup
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/components/claude-design/MockupGallery.tsx && git commit -m "feat(claude-design): add MockupGallery component"
```

---

## Task 14: DesignChat component

**Files:**
- Create: `portal/src/components/claude-design/DesignChat.tsx`

- [ ] **Step 1: Create the component**

```tsx
// portal/src/components/claude-design/DesignChat.tsx

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";
import type { DesignColors } from "@/types/design-session";

interface Props {
  sessionId: string;
  projectSlug: string;
  brName: string;
  title: string;
  colors: DesignColors;
  onHtmlUpdate: (html: string | null) => void;
}

export function DesignChat({
  sessionId,
  projectSlug,
  brName,
  title,
  colors,
  onHtmlUpdate,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/claude-design/chat",
      body: { sessionId, projectSlug, brName, colors, title },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const textParts = lastAssistant.parts?.filter(
      (p): p is { type: "text"; text: string } => p.type === "text"
    );
    if (!textParts?.length) return;

    const fullText = textParts.map((p) => p.text).join("");
    const fenceMatch = fullText.match(/```html\s*\n([\s\S]*?)```/);
    if (fenceMatch) {
      onHtmlUpdate(fenceMatch[1].trim());
    }
  }, [messages, onHtmlUpdate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  function renderContent(text: string) {
    return text.replace(/```html\s*\n[\s\S]*?```/g, "").trim();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Descrivi la schermata che vuoi creare...
          </p>
        )}
        {messages.map((msg) => {
          const textParts = msg.parts?.filter(
            (p): p is { type: "text"; text: string } => p.type === "text"
          );
          const fullText = textParts?.map((p) => p.text).join("") || "";
          const displayText =
            msg.role === "assistant" ? renderContent(fullText) : fullText;
          if (!displayText) return null;

          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-surface text-foreground"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{displayText}</pre>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-surface px-4 py-2 text-sm text-muted">
              Generando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descrivi la schermata..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Invia
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/components/claude-design/DesignChat.tsx && git commit -m "feat(claude-design): add DesignChat component with useChat streaming"
```

---

## Task 15: ClaudeDesignStudio component

**Files:**
- Create: `portal/src/components/claude-design/ClaudeDesignStudio.tsx`

- [ ] **Step 1: Create the main studio component**

```tsx
// portal/src/components/claude-design/ClaudeDesignStudio.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { ColorPickerPanel } from "./ColorPickerPanel";
import { DesignChat } from "./DesignChat";
import { DesignPreview } from "./DesignPreview";
import { MockupGallery } from "./MockupGallery";
import type { DesignColors, DesignSession, DesignSessionSummary } from "@/types/design-session";

interface Props {
  projectSlug: string;
  brName: string;
  onClose: () => void;
  onMockupSaved: (pngPath: string) => void;
}

export function ClaudeDesignStudio({
  projectSlug,
  brName,
  onClose,
  onMockupSaved,
}: Props) {
  const [sessions, setSessions] = useState<DesignSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<DesignSession | null>(null);
  const [colors, setColors] = useState<DesignColors>({
    primary: "#3B82F6",
    secondary: "#6B7280",
    background: "#FFFFFF",
    text: "#1F2937",
  });
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, [projectSlug, brName]);

  async function loadSessions() {
    const res = await fetch(
      `/api/claude-design/sessions?projectSlug=${projectSlug}&brName=${brName}`
    );
    if (res.ok) setSessions(await res.json());
  }

  async function handleSelectSession(sessionId: string) {
    const res = await fetch(
      `/api/claude-design/sessions/${sessionId}?projectSlug=${projectSlug}&brName=${brName}`
    );
    if (res.ok) {
      const session: DesignSession = await res.json();
      setActiveSession(session);
      setColors(session.colors);
      setCurrentHtml(session.currentHtml);
    }
  }

  async function handleCreateSession() {
    if (!newTitle.trim()) return;

    const res = await fetch("/api/claude-design/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug, brName, title: newTitle.trim(), colors }),
    });

    if (res.ok) {
      const session: DesignSession = await res.json();
      setActiveSession(session);
      setCurrentHtml(null);
      setShowNewDialog(false);
      setNewTitle("");
      await loadSessions();
    }
  }

  async function handleSave() {
    if (!activeSession || !currentHtml) return;
    setSaving(true);

    try {
      const res = await fetch("/api/claude-design/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          projectSlug,
          brName,
        }),
      });

      if (res.ok) {
        const { pngPath } = await res.json();
        onMockupSaved(pngPath);
        await loadSessions();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleColorsChange(newColors: DesignColors) {
    setColors(newColors);
    if (activeSession) {
      await fetch(`/api/claude-design/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug, brName, colors: newColors }),
      });
    }
  }

  const handleHtmlUpdate = useCallback((html: string | null) => {
    setCurrentHtml(html);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={onClose}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Torna al BR
        </button>
        <h2 className="text-sm font-medium">
          Claude Design{activeSession ? ` — ${activeSession.title}` : ""}
        </h2>
        <button
          onClick={onClose}
          className="text-sm text-muted hover:text-foreground"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-6 overflow-auto border-r border-border p-4">
          <ColorPickerPanel colors={colors} onChange={handleColorsChange} />

          <MockupGallery
            sessions={sessions}
            activeSessionId={activeSession?.id ?? null}
            onSelect={handleSelectSession}
            onNew={() => setShowNewDialog(true)}
          />

          {activeSession && currentHtml && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-lg bg-success px-3 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salva come PNG"}
            </button>
          )}
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Preview */}
          <div className="flex-1 overflow-auto p-4">
            <DesignPreview html={currentHtml} />
          </div>

          {/* Chat */}
          <div className="h-80 shrink-0 border-t border-border">
            {activeSession ? (
              <DesignChat
                sessionId={activeSession.id}
                projectSlug={projectSlug}
                brName={brName}
                title={activeSession.title}
                colors={colors}
                onHtmlUpdate={handleHtmlUpdate}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted">
                  Crea un nuovo mockup per iniziare.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New session dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">Nuovo mockup</h3>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nome della schermata (es. Login, Dashboard)"
              className="mb-4 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewDialog(false);
                  setNewTitle("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newTitle.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Crea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/components/claude-design/ClaudeDesignStudio.tsx && git commit -m "feat(claude-design): add ClaudeDesignStudio main component"
```

---

## Task 16: Integrate with BR form

**Files:**
- Modify: `portal/src/app/br/nuovo/page.tsx:26` — add state for studio
- Modify: `portal/src/app/br/nuovo/page.tsx:263-269` — replace placeholder with studio

- [ ] **Step 1: Add imports and state**

At the top of `portal/src/app/br/nuovo/page.tsx`, add the import:

```typescript
import { ClaudeDesignStudio } from "@/components/claude-design/ClaudeDesignStudio";
```

After the existing state declarations (line 26), add:

```typescript
const [showStudio, setShowStudio] = useState(false);
const [savedMockupPaths, setSavedMockupPaths] = useState<string[]>([]);
```

- [ ] **Step 2: Replace the placeholder**

Replace the "Prossimamente" placeholder block (lines 264-269) with:

```tsx
<>
  <button
    type="button"
    onClick={() => setShowStudio(true)}
    className="w-full rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary hover:bg-surface/50"
  >
    <p className="text-sm font-medium text-primary">Apri Claude Design Studio</p>
    <p className="mt-1 text-xs text-muted">
      Genera mockup descrivendo le schermate a Claude.
    </p>
  </button>
  {savedMockupPaths.length > 0 && (
    <div className="mt-2 space-y-1">
      {savedMockupPaths.map((path, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            PNG
          </span>
          <span className="flex-1 truncate">{path.split("/").pop()}</span>
        </div>
      ))}
    </div>
  )}
</>
```

- [ ] **Step 3: Add the studio modal**

Before the closing `</div>` of the page component (before line 294), add:

```tsx
{showStudio && projectSlug && nome && (
  <ClaudeDesignStudio
    projectSlug={projectSlug}
    brName={nome.toLowerCase().replace(/\s+/g, "-")}
    onClose={() => setShowStudio(false)}
    onMockupSaved={(path) => {
      setSavedMockupPaths((prev) =>
        prev.includes(path) ? prev : [...prev, path]
      );
    }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add portal/src/app/br/nuovo/page.tsx && git commit -m "feat(claude-design): integrate studio into BR creation form"
```

---

## Task 17: Update middleware

**Files:**
- Modify: `portal/src/middleware.ts:19-26`

- [ ] **Step 1: Add Claude Design API to public paths**

In the early-return block of the middleware (line 19-27), add `/api/claude-design` to the list of paths that skip the redirect check. The API routes already check auth internally.

Add `pathname.startsWith("/api/claude-design") ||` to the condition:

```typescript
if (
  pathname.startsWith("/login") ||
  pathname.startsWith("/api/auth") ||
  pathname.startsWith("/api/seed") ||
  pathname.startsWith("/api/claude-design") ||
  pathname.startsWith("/_next") ||
  pathname === "/favicon.ico"
) {
  return NextResponse.next();
}
```

- [ ] **Step 2: Commit**

```bash
git add portal/src/middleware.ts && git commit -m "feat(claude-design): allow claude-design API routes in middleware"
```

---

## Task 18: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd portal && npm run dev
```

- [ ] **Step 2: Test the full flow**

1. Login as a funzionale user
2. Go to `/br/nuovo`
3. Select a project, enter a BR name, advance to step 3
4. Click "Crea con Claude Design" — verify the "Apri Claude Design Studio" button appears
5. Click it — verify the fullscreen studio opens
6. Create a new mockup session with a title
7. Set colors via the color picker
8. Type a description (e.g. "Crea un form di login con email e password")
9. Verify Claude responds with streaming text
10. Verify the live preview shows the rendered HTML
11. Click "Salva come PNG" — verify it completes
12. Close the studio — verify the PNG filename appears in the form
13. Reopen the studio — verify the session appears in the gallery and can be reopened

- [ ] **Step 3: Verify Git uploads**

Check the target repo — the PNG should be in `brs/{nome}/mockups/{title-slug}.png` and the manifest should have the new document entry.
