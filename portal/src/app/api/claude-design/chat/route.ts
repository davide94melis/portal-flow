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
