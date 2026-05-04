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
