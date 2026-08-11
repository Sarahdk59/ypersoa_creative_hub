"use client";

/**
 * Sélecteur de fond réutilisable — Atelier Social.
 *
 * Encapsule le moteur "Fonds" (thématique → template procédural ou motif
 * signature recolorable) pour être piloté depuis n'importe quelle page (ex.
 * carte visuelle Avis) : le composant gère sa propre UI catégorie/template/
 * couleurs et remonte le SVG final (déjà recadré au format demandé) au
 * parent via `onOutputChange`.
 */

import { useEffect, useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import type { Swatch } from "@/lib/social-palette";
import {
  type FormatId,
  type GeneratorState,
  type DetectedColor,
  type MotifLibItem,
  FORMATS,
  CATEGORIES,
  ROLE_LABEL,
  buildGeneratorSVG,
  detectColors,
  sanitizeSvg,
  ensureBackground,
  fitToFormat,
} from "@/lib/fonds-engine";
import { SwatchButton, CustomColorPicker, ColorRemapRows } from "@/components/social/ColorRemapRows";
import { cn } from "@/lib/utils";

export function BackgroundPicker({
  swatches,
  formatId,
  defaultBg,
  onOutputChange,
}: {
  swatches: Swatch[];
  formatId: FormatId;
  /** Couleur de fond par défaut pour les templates "Uni"/procéduraux au montage. */
  defaultBg: string;
  onOutputChange: (svg: string) => void;
}) {
  const fmt = FORMATS.find((x) => x.id === formatId) ?? FORMATS[0];
  const [gen, setGen] = useState<GeneratorState>({
    categoryId: "rayures",
    templateId: "signature-diag-1",
    fond: defaultBg,
    motif: "#16324C",
    secondaire: "#A75F59",
    density: 52,
    size: 60,
    seed: 1,
    format: formatId,
  });
  const [customRoleOpen, setCustomRoleOpen] = useState<string | null>(null);

  // Le format cible peut changer depuis le parent (sélecteur de format) —
  // resynchronise gen.format, dont buildGeneratorSVG dépend pour W×H.
  useEffect(() => {
    setGen((g) => (g.format === formatId ? g : { ...g, format: formatId }));
  }, [formatId]);

  const activeCategory = CATEGORIES.find((c) => c.id === gen.categoryId) ?? CATEGORIES[0];
  const activeTemplate =
    activeCategory.templates.find((t) => t.id === gen.templateId) ?? activeCategory.templates[0];

  const selectCategory = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setGen((g) => ({ ...g, categoryId: catId, templateId: cat.templates[0].id }));
  };

  const [motifsLib, setMotifsLib] = useState<MotifLibItem[]>([]);
  const [motifsLoaded, setMotifsLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/social/motifs-fonds", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setMotifsLib(res.data as MotifLibItem[]);
          setMotifsLoaded(true);
        }
      })
      .catch(() => undefined);
  }, []);

  const [svgInput, setSvgInput] = useState<string>("");
  const [originals, setOriginals] = useState<DetectedColor[]>([]);
  const [colorMap, setColorMap] = useState<Record<string, string | null>>({});

  // Charge le fichier "asset" du template actif dans le moteur de recoloration.
  useEffect(() => {
    if (!activeTemplate.asset) return;
    const item = motifsLib.find((m) => m.filename === activeTemplate.asset);
    if (!item) return;
    const content = ensureBackground(item.content, defaultBg);
    setSvgInput(content);
    const found = detectColors(content);
    setOriginals(found);
    setColorMap((prev) => {
      const nm: Record<string, string | null> = {};
      found.forEach((o) => (nm[o.hex] = prev[o.hex] ?? null));
      return nm;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplate.asset, motifsLib]);

  const genSvg = useMemo(() => buildGeneratorSVG(gen), [gen]);

  const cleanedInput = useMemo(() => sanitizeSvg(svgInput), [svgInput]);
  const recoloredSvg = useMemo(() => {
    let out = cleanedInput;
    originals.forEach((o, i) => {
      o.raws.forEach((r) => {
        out = out.split(r).join(`§§${i}§§`);
      });
    });
    originals.forEach((o, i) => {
      const tgt = colorMap[o.hex] || o.hex;
      out = out.split(`§§${i}§§`).join(tgt);
    });
    return out;
  }, [cleanedInput, originals, colorMap]);

  const output = useMemo(() => {
    // Procédural : buildGeneratorSVG produit déjà le format cible (gen.format synchronisé ci-dessus).
    if (activeTemplate.asset) return fitToFormat(recoloredSvg, fmt.w, fmt.h);
    return genSvg;
  }, [activeTemplate.asset, recoloredSvg, genSvg, fmt.w, fmt.h]);

  useEffect(() => {
    if (!activeTemplate.asset || svgInput) onOutputChange(output);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output, activeTemplate.asset, svgInput]);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
          Thématique du fond
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCategory(c.id)}
              className={cn(
                "py-2 rounded-lg text-xs font-semibold border transition-all",
                gen.categoryId === c.id
                  ? "border-brand-text bg-brand-bg text-brand-text"
                  : "border-brand-muted/15 bg-brand-bg/40 text-brand-muted hover:border-brand-muted/30"
              )}
            >
              {c.nm}
            </button>
          ))}
        </div>
        {activeCategory.templates.length > 1 && (
          <select
            value={gen.templateId}
            onChange={(e) => setGen((g) => ({ ...g, templateId: e.target.value }))}
            className="mt-2 w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
          >
            {activeCategory.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nm}
              </option>
            ))}
          </select>
        )}
        {activeTemplate.asset && !motifsLoaded && (
          <p className="text-[10px] text-brand-muted italic mt-1.5">Chargement du motif…</p>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
          Couleurs du fond
        </div>
        {activeTemplate.asset ? (
          <ColorRemapRows
            originals={originals}
            colorMap={colorMap}
            swatches={swatches}
            onPick={(hex, target) => setColorMap((m) => ({ ...m, [hex]: target }))}
            onKeep={(hex) => setColorMap((m) => ({ ...m, [hex]: null }))}
          />
        ) : (
          <div className="space-y-2.5">
            {activeTemplate.roles.map((role) => (
              <div key={role}>
                <div className="text-[11px] font-semibold text-brand-text mb-1">{ROLE_LABEL[role]}</div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {swatches.map((s) => (
                    <SwatchButton
                      key={s.id}
                      hex={s.hex}
                      label={s.nom}
                      selected={gen[role].toLowerCase() === s.hex.toLowerCase()}
                      onClick={() => setGen((g) => ({ ...g, [role]: s.hex }))}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomRoleOpen((cur) => (cur === role ? null : role))}
                    className={cn(
                      "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed text-[10px] transition-all",
                      customRoleOpen === role
                        ? "border-brand-text text-brand-text bg-brand-bg"
                        : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
                    )}
                  >
                    +
                  </button>
                </div>
                {customRoleOpen === role && (
                  <CustomColorPicker
                    initial={gen[role]}
                    onApply={(hex) => setGen((g) => ({ ...g, [role]: hex }))}
                  />
                )}
              </div>
            ))}
            {activeTemplate.sliders.length > 0 && (
              <div className="space-y-2 pt-1">
                {activeTemplate.sliders.includes("density") && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold shrink-0">Densité</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={gen.density}
                      onChange={(e) => setGen((g) => ({ ...g, density: +e.target.value }))}
                      className="flex-1 accent-brand-rose"
                    />
                  </div>
                )}
                {activeTemplate.sliders.includes("size") && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold shrink-0">Taille</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={gen.size}
                      onChange={(e) => setGen((g) => ({ ...g, size: +e.target.value }))}
                      className="flex-1 accent-brand-rose"
                    />
                  </div>
                )}
              </div>
            )}
            {activeTemplate.seeded && (
              <button
                type="button"
                onClick={() => setGen((g) => ({ ...g, seed: g.seed + 1 }))}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-muted/20 hover:border-brand-text transition-all"
              >
                <Shuffle className="w-3 h-3" />
                Nouveau tirage
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
