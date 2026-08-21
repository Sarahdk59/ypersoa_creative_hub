"use client";

/**
 * Avis — Atelier Social.
 *
 * Deux usages :
 *  - "Légende" : colle l'avis client + prénom + produit acheté + occasion →
 *    génère la légende Instagram complète (squelette verrouillé : étoiles +
 *    merci, citation, histoire courte, phrase-pont personnalisation, CTA,
 *    hashtags).
 *  - "Visuel" : compose la carte avis (fond recolorable du moteur Fonds +
 *    cadre + étoiles + citation avec mots surlignables + logo Ypersoa) en
 *    Canvas, exportable en PNG — remplace la composition manuelle Illustrator.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Nunito } from "next/font/google";
import {
  ArrowLeft,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type SocialPaletteRef, allSwatches } from "@/lib/social-palette";
import { type FormatId, FORMATS } from "@/lib/fonds-engine";
import { BackgroundPicker } from "@/components/social/BackgroundPicker";
import { SwatchButton } from "@/components/social/ColorRemapRows";
import {
  type AvisCardColors,
  type AvisCardFontChoice,
  buildQuoteTokens,
  renderAvisCard,
  canvasToPngDownload,
} from "@/lib/avis-card";

// Chargée pour que la police "Nunito" (repli web d'"Arial Rounded MT Bold" —
// cf. lib/avis-card.ts) soit disponible côté navigateur ; appliquée nulle
// part en CSS, seul le Canvas de l'onglet Visuel la référence par son nom.
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800", "900"], display: "swap" });
void nunito;

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

interface GenerateResponse {
  ok: boolean;
  error?: string;
  caption?: string;
  hashtagLigne?: string;
  brandSafety?: BrandSafety;
  source?: "openai" | "gemini" | "fallback";
  notice?: string;
}

/** Palette de secours affichée le temps que /api/social/palette réponde (même socle que /social/fonds). */
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

export default function AvisPage() {
  const [tab, setTab] = useState<"legende" | "visuel">("legende");

  // Champs partagés entre les deux onglets.
  const [prenom, setPrenom] = useState("");
  const [avis, setAvis] = useState("");

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
              Avis
            </h1>
          </div>
          <div className="flex items-center bg-brand-muted/10 rounded-full p-0.5 border border-brand-muted/15">
            <button
              type="button"
              onClick={() => setTab("legende")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "legende" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Légende
            </button>
            <button
              type="button"
              onClick={() => setTab("visuel")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "visuel" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Visuel
            </button>
          </div>
        </div>
      </header>

      {tab === "legende" ? (
        <LegendeTab prenom={prenom} setPrenom={setPrenom} avis={avis} setAvis={setAvis} />
      ) : (
        <VisuelTab prenom={prenom} setPrenom={setPrenom} avis={avis} setAvis={setAvis} />
      )}
    </div>
  );
}

/* ============================================================
   Onglet Légende
   ============================================================ */

function LegendeTab({
  prenom,
  setPrenom,
  avis,
  setAvis,
}: {
  prenom: string;
  setPrenom: (v: string) => void;
  avis: string;
  setAvis: (v: string) => void;
}) {
  const [produit, setProduit] = useState("");
  const [occasion, setOccasion] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = prenom.trim().length > 0 && avis.trim().length > 0 && !loading;

  async function onGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);
    try {
      const res = await fetch("/api/avis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom, avis, produit, occasion }),
      });
      const json = (await res.json()) as GenerateResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || "Génération impossible.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!data?.caption) return;
    navigator.clipboard.writeText(data.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Colonne formulaire */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ color: "var(--brand-terracotta)" }}
          >
            ⌘
          </span>
          <h2 className="font-serif text-lg">Générateur d&apos;avis</h2>
        </div>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          Colle l&apos;avis, dis ce que la cliente a offert et pourquoi. La légende se
          compose autour de ton squelette verrouillé.
        </p>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              Prénom de la cliente
            </label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Aurélie"
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              L&apos;avis, tel quel
            </label>
            <textarea
              value={avis}
              onChange={(e) => setAvis(e.target.value)}
              placeholder="Vraiment top ! J'adore le rendu."
              rows={3}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              Produit acheté
            </label>
            <input
              type="text"
              value={produit}
              onChange={(e) => setProduit(e.target.value)}
              placeholder="Sweat « maman de ❤️❤️❤️ »"
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              Occasion / pourquoi
            </label>
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Anniversaire de sa meilleure amie"
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--brand-terracotta)" }}
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Génération…" : "Générer la légende"}
          </button>

          <p className="text-[11px] text-brand-muted leading-relaxed">
            Prénom + avis suffisent. Le produit et l&apos;occasion rendent la légende
            plus forte.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl p-3 flex items-start gap-2 text-xs bg-red-50 text-red-800 border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Colonne résultat */}
      <div>
        <h2 className="font-serif text-lg mb-1">Légende</h2>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          Prête à coller sous le visuel — génère-le dans l&apos;onglet Visuel, ou colle-le
          sous ta composition existante.
        </p>

        {!data && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
            La légende générée apparaîtra ici.
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
            Génération en cours…
          </div>
        )}

        {data && data.caption && (
          <div className="space-y-3">
            {data.notice && (
              <div className="rounded-xl p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200">
                {data.notice}
              </div>
            )}

            {data.brandSafety && (
              <div
                className={cn(
                  "rounded-xl p-3 flex items-start gap-2 text-xs",
                  data.brandSafety.safe
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                )}
              >
                {data.brandSafety.safe ? (
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {data.brandSafety.safe
                      ? "Brand-safe ✓"
                      : `${data.brandSafety.criticalViolations.length} violation(s) critique(s)`}
                  </p>
                  {data.brandSafety.warnings.length > 0 && (
                    <p className="mt-0.5 opacity-80">
                      {data.brandSafety.warnings.length} vouvoiement détecté(s) — à relire.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wide text-brand-muted uppercase">
                  Légende Instagram
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-rose hover:text-brand-rose-light transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {data.caption}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Onglet Visuel
   ============================================================ */

function VisuelTab({
  prenom,
  setPrenom,
  avis,
  setAvis,
}: {
  prenom: string;
  setPrenom: (v: string) => void;
  avis: string;
  setAvis: (v: string) => void;
}) {
  const [palette, setPalette] = useState<SocialPaletteRef>(FALLBACK_PALETTE);
  useEffect(() => {
    fetch("/api/social/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPalette(res.data as SocialPaletteRef);
      })
      .catch(() => undefined);
  }, []);
  const swatches = useMemo(() => allSwatches(palette), [palette]);

  const [formatId, setFormatId] = useState<FormatId>("p34");
  const fmt = FORMATS.find((x) => x.id === formatId) ?? FORMATS[4];

  const [backgroundSvg, setBackgroundSvg] = useState<string>("");

  const [colors, setColors] = useState<AvisCardColors>({
    border: "#C23A2D",
    stars: "#D98A3D",
    text: "#16324C",
    accent: "#C23A2D",
    cardFill: "#FBF8F2",
  });
  const [fontChoice, setFontChoice] = useState<AvisCardFontChoice>("arial");

  const tokens = useMemo(() => buildQuoteTokens(avis), [avis]);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  useEffect(() => setHighlighted(new Set()), [avis]);

  const toggleWord = (idx: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canRender = prenom.trim().length > 0 && tokens.length > 0 && !!backgroundSvg;

  useEffect(() => {
    if (!canRender || !canvasRef.current) return;
    let cancelled = false;
    renderAvisCard(canvasRef.current, {
      width: fmt.w,
      height: fmt.h,
      backgroundSvg,
      tokens,
      highlighted,
      prenom,
      colors,
      fontChoice,
    }).catch(() => {
      if (!cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [canRender, backgroundSvg, tokens, highlighted, prenom, colors, fontChoice, fmt.w, fmt.h]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safePrenom = prenom.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "avis";
    canvasToPngDownload(canvasRef.current, `ypersoa_avis_${safePrenom}_${fmt.id}.png`);
  };

  const colorRow = (
    label: string,
    key: keyof AvisCardColors
  ) => (
    <div>
      <div className="text-[11px] font-semibold text-brand-text mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((s) => (
          <SwatchButton
            key={s.id}
            hex={s.hex}
            label={s.nom}
            selected={colors[key].toLowerCase() === s.hex.toLowerCase()}
            onClick={() => setColors((c) => ({ ...c, [key]: s.hex }))}
          />
        ))}
      </div>
    </div>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="grid grid-cols-12 gap-5">
        {/* COLONNE CONFIG */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Prénom de la cliente
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Aurélie"
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                L&apos;avis, tel quel
              </label>
              <textarea
                value={avis}
                onChange={(e) => setAvis(e.target.value)}
                placeholder="Vraiment top ! J'adore le rendu."
                rows={3}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
              />
            </div>
            {tokens.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                  Mots en avant — clique pour surligner
                </div>
                <div className="flex flex-wrap gap-1">
                  {tokens.map((t) => (
                    <button
                      key={t.idx}
                      type="button"
                      onClick={() => toggleWord(t.idx)}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-semibold border transition-all",
                        highlighted.has(t.idx)
                          ? "text-white border-transparent"
                          : "border-brand-muted/20 text-brand-text bg-brand-bg/40 hover:border-brand-muted/40"
                      )}
                      style={highlighted.has(t.idx) ? { backgroundColor: colors.accent } : undefined}
                    >
                      {t.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
            <BackgroundPicker
              swatches={swatches}
              formatId={formatId}
              defaultBg={colors.cardFill}
              onOutputChange={setBackgroundSvg}
            />
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">
              Couleurs de la carte
            </div>
            {colorRow("Cadre + logo", "border")}
            {colorRow("Étoiles", "stars")}
            {colorRow("Texte", "text")}
            {colorRow("Accent (mots en avant)", "accent")}
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">Typographie de la carte</div>
            <div className="flex gap-1.5">
              {(["arial", "cafeteria"] as const).map((choice) => (
                <button key={choice} type="button" onClick={() => setFontChoice(choice)} className={cn("px-3 py-2 rounded-lg text-xs font-semibold border transition-all", fontChoice === choice ? "border-brand-text bg-brand-bg text-brand-text" : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30")}>
                  {choice === "arial" ? "Arial Rounded" : "Cafeteria"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2.5">
              Format
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setFormatId(x.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left",
                    formatId === x.id
                      ? "border-brand-text bg-brand-bg text-brand-text"
                      : "border-brand-muted/15 bg-brand-bg/40 text-brand-muted hover:border-brand-muted/30"
                  )}
                >
                  {x.nm}
                  <div className="text-[10px] font-normal opacity-70">{x.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STAGE */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#efe7d7] rounded-2xl p-6 flex items-center justify-center min-h-[480px]">
            {canRender ? (
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]"
                style={{ maxHeight: 560 }}
              />
            ) : (
              <p className="text-xs text-brand-muted text-center max-w-[30ch]">
                Renseigne le prénom et l&apos;avis pour voir la carte apparaître.
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!canRender}
              className="primary-button flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Télécharger PNG
            </button>
          </div>
          <p className="text-center text-[11px] text-brand-muted mt-3 max-w-[52ch] mx-auto">
            Fond recolorable (moteur Fonds) · texte {fontChoice === "arial" ? "Arial Rounded" : "Cafeteria"} · logo Ypersoa ·
            clique un mot dans la citation pour le surligner.
          </p>
        </div>
      </div>
    </main>
  );
}
