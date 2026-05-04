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
