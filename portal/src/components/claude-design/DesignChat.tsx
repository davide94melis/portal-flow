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
