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
