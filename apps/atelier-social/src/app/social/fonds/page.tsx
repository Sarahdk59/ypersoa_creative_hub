"use client";

/**
 * Fonds — Atelier Social.
 *
 * Deux usages :
 *  - "Générer un fond" : thématiques de motifs (rayures, pois, carreaux, cœurs,
 *    étoiles, fleurs, léopard, vagues…), chaque thématique proposant un
 *    déroulant de templates. Tout est procédural et déterministe (même tirage =
 *    même rendu), recolorable sur la palette du Hub.
 *  - "Recolorer un SVG" : colle un motif illustré (oiseau, tulipes, cœur-prénoms…)
 *    fourni en fichier — le moteur détecte ses couleurs et les remappe sur la palette.
 *
 * La palette (socle brand book + amplificateurs saisonniers propres à l'Atelier
 * Social, ex. kaki "Rentrée") est chargée depuis /api/social/palette —
 * cf. referentiels/social_palette.json.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette as PaletteIcon,
  Shuffle,
  Download,
  Plus,
  X,
  Wand2,
  Layers,
} from "lucide-react";
import {
  type SocialPaletteRef,
  type Swatch,
  allSwatches,
  isValidHex,
} from "@/lib/social-palette";
import { cn } from "@/lib/utils";
import {
  type FormatId,
  type GeneratorState,
  type Role,
  type DetectedColor,
  type MotifLibItem,
  FORMATS,
  ROLE_LABEL,
  CATEGORIES,
  buildGeneratorSVG,
  shadesOf,
  detectColors,
  sanitizeSvg,
  namespaceSvgIds,
  recolorSvg,
  forPreview,
  svgDims,
  ensureBackground,
  fitToFormat,
  downloadSvg,
  downloadPngFromSvg,
} from "@/lib/fonds-engine";
import { SwatchButton, CustomColorPicker, ColorRemapRows } from "@/components/social/ColorRemapRows";

/** Palette de secours affichée le temps que /api/social/palette réponde. */
const FALLBACK_PALETTE: SocialPaletteRef = {
  _meta: { schema_version: 1, referentiel: "social_palette", description: "" },
  socle: [
    { id: "marine", nom: "Marine", hex: "#16324C", role: "dominante" },
    { id: "teal", nom: "Teal", hex: "#1E6E77", role: "primaire" },
    { id: "creme", nom: "Crème", hex: "#F4EEE2", role: "fond" },
    { id: "terracotta", nom: "Terracotta", hex: "#A75F59", role: "accent" },
  ],
  saisonnier_officiel: [
    { id: "rouge", nom: "Rouge", hex: "#C23A2D" },
    { id: "blush", nom: "Blush", hex: "#F4B4D2" },
    { id: "sauge", nom: "Sauge", hex: "#9CAE92" },
    { id: "ambre", nom: "Ocre / Ambre", hex: "#D98A3D" },
    { id: "moutarde", nom: "Moutarde", hex: "#C9A227" },
    { id: "bleu_paon", nom: "Bleu paon", hex: "#2E6E8E" },
    { id: "bordeaux", nom: "Bordeaux", hex: "#7E2F3B" },
  ],
  amplificateurs: [],
};

/* ============================================================
   Composant
   ============================================================ */

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <rect width="400" height="500" fill="#F4EEE2"/>
  <g fill="none" stroke="#16324C" stroke-width="16">
    <circle cx="200" cy="180" r="74"/>
    <circle cx="274" cy="254" r="74"/>
    <circle cx="200" cy="328" r="74"/>
    <circle cx="126" cy="254" r="74"/>
  </g>
  <path d="M200 452 l-2-1.8C176 432 160 420 160 398 c0-14 11-24 24-24 8 0 15 4 16 10 1-6 8-10 16-10 13 0 24 10 24 24 0 22-16 34-40 52z" fill="#A75F59"/>
</svg>`;

export default function FondsPage() {
  const [tab, setTab] = useState<"generate" | "recolor">("generate");
  const [palette, setPalette] = useState<SocialPaletteRef>(FALLBACK_PALETTE);
  const [paletteLoaded, setPaletteLoaded] = useState(false);

  const refreshPalette = () => {
    fetch("/api/social/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setPalette(res.data as SocialPaletteRef);
          setPaletteLoaded(true);
        }
      })
      .catch(() => undefined);
  };
  useEffect(refreshPalette, []);

  const swatches = useMemo(() => allSwatches(palette), [palette]);

  // --- Générateur ---
  const [gen, setGen] = useState<GeneratorState>({
    categoryId: "pois",
    templateId: "disperse",
    fond: "#F4EEE2",
    motif: "#16324C",
    secondaire: "#A75F59",
    density: 52,
    size: 60,
    seed: 1,
    format: "p45",
  });
  const [customRoleOpen, setCustomRoleOpen] = useState<Role | null>(null);
  const activeCategory = CATEGORIES.find((c) => c.id === gen.categoryId) ?? CATEGORIES[0];
  const activeTemplate =
    activeCategory.templates.find((t) => t.id === gen.templateId) ?? activeCategory.templates[0];
  const fmt = FORMATS.find((x) => x.id === gen.format)!;
  const genSvg = useMemo(() => buildGeneratorSVG(gen), [gen]);

  const selectCategory = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setGen((g) => ({ ...g, categoryId: catId, templateId: cat.templates[0].id }));
  };

  // --- Recoloration (partagée : onglet "Recolorer un SVG" + templates "asset" du générateur) ---
  const [svgInput, setSvgInput] = useState(SAMPLE_SVG);
  const [originals, setOriginals] = useState<DetectedColor[]>(detectColors(SAMPLE_SVG));
  const [colorMap, setColorMap] = useState<Record<string, string | null>>({});
  // Nom du fichier bibliothèque actuellement chargé (pour nommer l'export) — null si contenu tapé/collé à la main.
  const [loadedFilename, setLoadedFilename] = useState<string | null>(null);

  // Bibliothèque de motifs (assets/motifs-fonds-svg/) — chargée une fois au montage,
  // nécessaire aussi bien pour l'onglet Recolorer que pour les templates "asset" du générateur.
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

  /**
   * Charge un contenu SVG dans le moteur de recoloration, immédiatement (sans
   * debounce) — utilisé au clic sur une vignette ou à la sélection d'un
   * template "asset". setState fonctionnel : jamais de closure périmée sur
   * colorMap, donc pas de race condition avec le debounce de la textarea.
   */
  const loadMotifIntoRecolor = (rawContent: string, filename?: string) => {
    // Fond synthétique si le fichier n'en a pas (silhouettes isolées type
    // Tourbillon/Oiseau/Bulle) — pour que le fond devienne éditable aussi.
    const content = ensureBackground(rawContent, "#F4EEE2");
    setSvgInput(content);
    setLoadedFilename(filename ?? null);
    const found = detectColors(content);
    setOriginals(found);
    setColorMap((prev) => {
      const nm: Record<string, string | null> = {};
      found.forEach((o) => (nm[o.hex] = prev[o.hex] ?? null));
      return nm;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const found = detectColors(svgInput);
      setOriginals(found);
      setColorMap((prev) => {
        const nm: Record<string, string | null> = {};
        found.forEach((o) => (nm[o.hex] = prev[o.hex] ?? null));
        return nm;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [svgInput]);

  // Un template "asset" est sélectionné dans le générateur → on charge le
  // fichier correspondant dans le même moteur de recoloration que l'onglet dédié.
  useEffect(() => {
    if (tab !== "generate" || !activeTemplate.asset) return;
    const item = motifsLib.find((m) => m.filename === activeTemplate.asset);
    if (item) loadMotifIntoRecolor(item.content, item.filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeTemplate.asset, motifsLib]);

  const cleanedInput = useMemo(() => sanitizeSvg(svgInput), [svgInput]);
  const recoloredSvg = useMemo(
    () => recolorSvg(cleanedInput, originals, colorMap),
    [cleanedInput, originals, colorMap]
  );
  const recoloredDims = useMemo(() => svgDims(recoloredSvg), [recoloredSvg]);

  // Template "asset" choisi dans le générateur : on recadre au format choisi.
  // Onglet Recolorer (paste libre) : export tel quel, à sa taille native.
  const assetInGenerator = tab === "generate" && !!activeTemplate.asset;
  const assetOutput = useMemo(
    () => (assetInGenerator ? fitToFormat(recoloredSvg, fmt.w, fmt.h) : recoloredSvg),
    [assetInGenerator, recoloredSvg, fmt.w, fmt.h]
  );
  const assetOutputDims = assetInGenerator ? { w: fmt.w, h: fmt.h } : recoloredDims;
  const assetPreview = useMemo(
    () => forPreview(namespaceSvgIds(assetOutput, "stage")),
    [assetOutput]
  );

  // --- Amplificateurs (ajout / suppression) ---
  const [ampOpen, setAmpOpen] = useState(false);
  const [ampNom, setAmpNom] = useState("");
  const [ampHex, setAmpHex] = useState("#6B6B47");
  const [ampOccasion, setAmpOccasion] = useState("");
  const [ampSaving, setAmpSaving] = useState(false);
  const [ampError, setAmpError] = useState<string | null>(null);

  const submitAmplificateur = async () => {
    setAmpError(null);
    if (!ampNom.trim()) {
      setAmpError("Nom requis.");
      return;
    }
    if (!isValidHex(ampHex)) {
      setAmpError("Hex invalide.");
      return;
    }
    setAmpSaving(true);
    try {
      const res = await fetch("/api/social/palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: ampNom.trim(), hex: ampHex, occasion: ampOccasion.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Échec de l'ajout");
      refreshPalette();
      setAmpNom("");
      setAmpOccasion("");
      setAmpOpen(false);
    } catch (e) {
      setAmpError(e instanceof Error ? e.message : "Échec de l'ajout");
    } finally {
      setAmpSaving(false);
    }
  };

  const deleteAmplificateur = async (id: string) => {
    await fetch(`/api/social/palette?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    refreshPalette();
  };

  /* ---------- UI helpers ---------- */

  function PaletteGroup({ title, items }: { title: string; items: Swatch[] }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-2.5 last:mb-0">
        <div className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1.5">
          {title}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <div key={s.id} className="group relative">
              <div
                className="w-6 h-6 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
                style={{ background: s.hex }}
                title={`${s.nom} · ${s.hex}`}
              />
              {s.group === "amplificateur" && (
                <button
                  type="button"
                  onClick={() => deleteAmplificateur(s.id)}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white border border-brand-muted/30 text-brand-muted hover:text-brand-rouge hover:border-brand-rouge/40 items-center justify-center hidden group-hover:flex"
                  title={`Supprimer ${s.nom}`}
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vrai si l'aperçu/export doit passer par le moteur de recoloration plutôt
  // que par buildGeneratorSVG : onglet Recolorer, ou template "asset" actif.
  const isAssetActive = tab === "recolor" || assetInGenerator;
  const exportBaseName = (loadedFilename ?? "motif-recolore").replace(/\.svg$/i, "");

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/social"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Atelier Social
            </Link>
            <div className="w-px h-4 bg-brand-muted/20" />
            <h1
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--hub-foreground)",
                margin: 0,
              }}
            >
              Fonds
            </h1>
          </div>
          <div className="flex items-center bg-brand-muted/10 rounded-full p-0.5 border border-brand-muted/15">
            <button
              type="button"
              onClick={() => setTab("generate")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "generate" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Générer un fond
            </button>
            <button
              type="button"
              onClick={() => setTab("recolor")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "recolor" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Recolorer un SVG
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          {/* COLONNE CONFIG */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Palette (partagée entre les 2 modes) */}
            <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold flex items-center gap-1.5">
                  <PaletteIcon className="w-3.5 h-3.5" />
                  Palette
                </div>
                <button
                  type="button"
                  onClick={() => setAmpOpen((o) => !o)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-rose hover:opacity-70"
                >
                  <Plus className="w-3 h-3" />
                  Amplificateur
                </button>
              </div>

              <PaletteGroup title="Socle brand book" items={swatches.filter((s) => s.group === "socle")} />
              <PaletteGroup
                title="Saisonnier officiel"
                items={swatches.filter((s) => s.group === "saisonnier")}
              />
              <PaletteGroup
                title="Mes amplificateurs (atelier social)"
                items={swatches.filter((s) => s.group === "amplificateur")}
              />
              {!paletteLoaded && (
                <p className="text-[10px] text-brand-muted italic mt-1">Chargement de la palette…</p>
              )}

              {ampOpen && (
                <div className="mt-3 pt-3 border-t border-brand-muted/15 space-y-2">
                  <p className="text-[10px] text-brand-muted leading-snug">
                    Une couleur saisonnière propre à l&apos;atelier social (ex. kaki pour la rentrée) —
                    pas remontée au brand book, juste gardée ici pour régénérer une série de posts.
                  </p>
                  <input
                    value={ampNom}
                    onChange={(e) => setAmpNom(e.target.value)}
                    placeholder="Nom — ex. Rentrée · Kaki"
                    className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={ampHex}
                      onChange={(e) => setAmpHex(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-brand-muted/20 shrink-0 cursor-pointer"
                    />
                    <input
                      value={ampHex}
                      onChange={(e) => setAmpHex(e.target.value)}
                      placeholder="#6B6B47"
                      className="flex-1 p-2 rounded-lg border border-brand-muted/20 bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                    />
                  </div>
                  <input
                    value={ampOccasion}
                    onChange={(e) => setAmpOccasion(e.target.value)}
                    placeholder="Occasion — optionnel (ex. rentree_scolaire)"
                    className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                  {ampError && <p className="text-[11px] text-brand-rouge">{ampError}</p>}
                  <button
                    type="button"
                    onClick={submitAmplificateur}
                    disabled={ampSaving}
                    className="w-full primary-button text-xs py-2 disabled:opacity-50"
                  >
                    {ampSaving ? "Ajout…" : "Ajouter à la palette"}
                  </button>
                </div>
              )}
            </div>

            {tab === "generate" ? (
              <>
                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Thématique
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
                    <div className="mt-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                        Template — {activeCategory.nm}
                      </div>
                      <select
                        value={gen.templateId}
                        onChange={(e) => setGen((g) => ({ ...g, templateId: e.target.value }))}
                        className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                      >
                        {activeCategory.templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nm}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                    Couleurs du motif
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
                    activeTemplate.roles.map((role) => (
                      <div key={role}>
                        <div className="text-[11px] font-semibold text-brand-text mb-1">
                          {ROLE_LABEL[role]}
                        </div>
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
                            title="Couleur personnalisée / sous-tons"
                            className={cn(
                              "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed transition-all",
                              customRoleOpen === role
                                ? "border-brand-text text-brand-text bg-brand-bg"
                                : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
                            )}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {customRoleOpen === role && (
                          <CustomColorPicker
                            initial={gen[role]}
                            onApply={(hex) => setGen((g) => ({ ...g, [role]: hex }))}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!activeTemplate.asset && (activeTemplate.sliders.length > 0 || activeTemplate.seeded) && (
                  <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
                    <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
                      Réglages
                    </div>
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
                        <span className="text-[11px] text-brand-muted tabular-nums w-7 text-right">
                          {gen.density}
                        </span>
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
                        <span className="text-[11px] text-brand-muted tabular-nums w-7 text-right">
                          {gen.size}
                        </span>
                      </div>
                    )}
                    {activeTemplate.seeded && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <label className="text-xs font-semibold shrink-0">Tirage</label>
                        <button
                          type="button"
                          onClick={() => setGen((g) => ({ ...g, seed: g.seed + 1 }))}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-muted/20 hover:border-brand-text transition-all"
                        >
                          <Shuffle className="w-3 h-3" />
                          Nouveau
                        </button>
                        <span className="text-[11px] text-brand-muted tabular-nums">#{gen.seed}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Format
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setGen((g) => ({ ...g, format: x.id }))}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left",
                          gen.format === x.id
                            ? "border-brand-text bg-brand-bg text-brand-text"
                            : "border-brand-muted/15 bg-brand-bg/40 text-brand-muted hover:border-brand-muted/30"
                        )}
                      >
                        {x.nm}
                        <div className="text-[10px] font-normal opacity-70">{x.sub}</div>
                      </button>
                    ))}
                  </div>
                  {activeTemplate.asset && (
                    <p className="text-[10px] text-brand-muted italic mt-2">
                      Motif signature — recadré au centre pour remplir le format choisi.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Bibliothèque de motifs {motifsLoaded && `(${motifsLib.length})`}
                  </div>
                  {!motifsLoaded ? (
                    <p className="text-xs text-brand-muted italic">Chargement…</p>
                  ) : motifsLib.length === 0 ? (
                    <p className="text-xs text-brand-muted">
                      Aucun motif dans <code className="text-[10px]">assets/motifs-fonds-svg/</code>.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                      {motifsLib.map((m) => (
                        <button
                          key={m.filename}
                          type="button"
                          onClick={() => loadMotifIntoRecolor(m.content, m.filename)}
                          title={m.label}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-1 transition-all",
                            svgInput === m.content
                              ? "border-brand-text bg-brand-bg"
                              : "border-brand-muted/15 bg-brand-bg/40 hover:border-brand-muted/40"
                          )}
                        >
                          <div
                            className="w-full aspect-square rounded-md overflow-hidden bg-white flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                            dangerouslySetInnerHTML={{
                              __html: forPreview(
                                namespaceSvgIds(sanitizeSvg(m.content), m.filename.replace(/[^a-zA-Z0-9]/g, "_"))
                              ),
                            }}
                          />
                          <span className="text-[9px] text-brand-muted text-center leading-tight line-clamp-1 w-full">
                            {m.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Colle ton SVG
                  </div>
                  <textarea
                    value={svgInput}
                    onChange={(e) => setSvgInput(e.target.value)}
                    spellCheck={false}
                    className="w-full h-32 font-mono text-[11px] rounded-lg border border-brand-muted/20 bg-brand-bg/40 p-3 resize-y focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
                  />
                </div>

                <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
                    Couleurs détectées → remappe
                  </div>
                  <ColorRemapRows
                    originals={originals}
                    colorMap={colorMap}
                    swatches={swatches}
                    onPick={(hex, target) => setColorMap((m) => ({ ...m, [hex]: target }))}
                    onKeep={(hex) => setColorMap((m) => ({ ...m, [hex]: null }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* STAGE */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-[#efe7d7] rounded-2xl p-6 flex items-center justify-center min-h-[480px]">
              <div
                className="max-w-full max-h-[560px] [&>svg]:max-w-full [&>svg]:max-h-[560px] [&>svg]:h-auto [&>svg]:rounded-lg [&>svg]:shadow-[0_8px_30px_rgba(22,50,76,0.14)]"
                dangerouslySetInnerHTML={{
                  __html: isAssetActive ? assetPreview : genSvg,
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={() =>
                  isAssetActive
                    ? downloadPngFromSvg(
                        assetOutput,
                        assetOutputDims.w,
                        assetOutputDims.h,
                        `ypersoa_${exportBaseName}${assetInGenerator ? `_${fmt.id}` : ""}.png`
                      )
                    : downloadPngFromSvg(
                        genSvg,
                        fmt.w,
                        fmt.h,
                        `ypersoa_fond_${gen.categoryId}-${gen.templateId}_${fmt.id}.png`
                      )
                }
                className="primary-button flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Télécharger PNG
              </button>
              <button
                type="button"
                onClick={() =>
                  isAssetActive
                    ? downloadSvg(assetOutput, `ypersoa_${exportBaseName}${assetInGenerator ? `_${fmt.id}` : ""}.svg`)
                    : downloadSvg(genSvg, `ypersoa_fond_${gen.categoryId}-${gen.templateId}_${fmt.id}.svg`)
                }
                className="flex items-center gap-2 text-sm font-semibold text-brand-text border border-brand-text/60 rounded-full px-5 py-3 hover:bg-brand-text hover:text-brand-bg transition-all"
              >
                Télécharger SVG
              </button>
            </div>
            <p className="text-center text-[11px] text-brand-muted mt-3 max-w-[52ch] mx-auto">
              Vectoriel · couleurs exactes de ta palette · déterministe — mêmes réglages, même rendu.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
