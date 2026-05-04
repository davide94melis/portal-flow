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
