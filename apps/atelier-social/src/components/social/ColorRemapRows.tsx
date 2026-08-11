"use client";

/**
 * UI de recoloration partagée — Atelier Social.
 *
 * Extrait de /social/fonds pour être réutilisé ailleurs (ex. carte visuelle
 * du générateur d'avis) : "couleur détectée dans un SVG → remappe sur une
 * couleur de la palette (ou couleur libre / sous-ton)".
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Swatch } from "@/lib/social-palette";
import type { DetectedColor } from "@/lib/fonds-engine";
import { shadesOf } from "@/lib/fonds-engine";
import { cn } from "@/lib/utils";

export function SwatchButton({
  hex,
  label,
  selected,
  onClick,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "w-6 h-6 rounded-md shrink-0 transition-all shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]",
        selected ? "ring-2 ring-offset-1 ring-brand-text scale-105" : "hover:scale-110"
      )}
      style={{ background: hex }}
    />
  );
}

/**
 * Mini-picker de couleur libre : roue native + hex tapé + rampe de sous-tons
 * (mêmes teinte/saturation, luminosité variable) générée en direct.
 */
export function CustomColorPicker({ initial, onApply }: { initial: string; onApply: (hex: string) => void }) {
  const [color, setColor] = useState(/^#[0-9a-fA-F]{6}$/.test(initial) ? initial : "#8899aa");
  const shades = useMemo(() => shadesOf(color, 7), [color]);
  return (
    <div className="mt-1.5 p-2 rounded-lg bg-brand-bg/60 border border-brand-muted/15 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-7 h-7 rounded-md border border-brand-muted/20 cursor-pointer shrink-0"
        />
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="flex-1 min-w-0 text-[10px] font-mono p-1.5 rounded-md border border-brand-muted/20 bg-white focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
        />
        <button
          type="button"
          onClick={() => onApply(color)}
          className="text-[10px] font-semibold px-2 py-1.5 rounded-md bg-brand-text text-brand-bg shrink-0 hover:opacity-80"
        >
          Appliquer
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-brand-muted shrink-0">Sous-tons</span>
        {shades.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onApply(s)}
            title={s}
            className="w-5 h-5 rounded shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-110 transition-transform"
            style={{ background: s }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Liste "couleur détectée → remappe sur la palette (ou garde l'originale)".
 * "+" ouvre un picker libre (couleur exacte ou sous-ton) pour la ligne.
 */
export function ColorRemapRows({
  originals,
  colorMap,
  swatches,
  onPick,
  onKeep,
}: {
  originals: DetectedColor[];
  colorMap: Record<string, string | null>;
  swatches: Swatch[];
  onPick: (hex: string, target: string) => void;
  onKeep: (hex: string) => void;
}) {
  const [openHex, setOpenHex] = useState<string | null>(null);
  if (originals.length === 0) {
    return (
      <p className="text-xs text-brand-muted">
        Aucune couleur détectée. Vérifie que le SVG utilise des aplats (hex ou rgb).
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {originals.map((o) => (
        <div key={o.hex}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md shrink-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ background: o.hex }}
              title={o.hex}
            />
            <span className="text-[10px] text-brand-muted font-mono w-14 shrink-0">{o.hex}</span>
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {swatches.map((s) => (
                <SwatchButton
                  key={s.id}
                  hex={s.hex}
                  label={s.nom}
                  selected={(colorMap[o.hex] || "").toLowerCase() === s.hex.toLowerCase()}
                  onClick={() => onPick(o.hex, s.hex)}
                />
              ))}
              <button
                type="button"
                onClick={() => onKeep(o.hex)}
                title="Garder la couleur d'origine"
                className={cn(
                  "w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[9px] font-bold border",
                  !colorMap[o.hex]
                    ? "border-brand-text bg-brand-bg text-brand-text"
                    : "border-brand-muted/20 text-brand-muted bg-brand-bg/40"
                )}
              >
                =
              </button>
              <button
                type="button"
                onClick={() => setOpenHex((cur) => (cur === o.hex ? null : o.hex))}
                title="Couleur personnalisée / sous-tons"
                className={cn(
                  "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed transition-all",
                  openHex === o.hex
                    ? "border-brand-text text-brand-text bg-brand-bg"
                    : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
                )}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {openHex === o.hex && (
            <CustomColorPicker
              initial={colorMap[o.hex] || o.hex}
              onApply={(hex) => onPick(o.hex, hex)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
