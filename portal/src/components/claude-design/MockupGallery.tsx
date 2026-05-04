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
