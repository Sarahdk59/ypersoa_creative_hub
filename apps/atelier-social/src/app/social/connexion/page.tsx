"use client";

/**
 * Connexion — Atelier Social (pilier 1 "Pourquoi Ypersoa").
 *
 * Trois onglets :
 *  - "Légende" : génère un post de marque (pas de produit, pas d'avis client
 *    précis) selon 4 angles : qui sommes-nous, lien, souvenir, présence.
 *  - "Visuel" : compose la carte Brand Book (fond marine fixe + chip rubrique
 *    + headline Newsreader 2 lignes + CTA rouge coquelicot) en Canvas,
 *    exportable en PNG — porte le composant SocialCard de app/brand/page.tsx §5.
 *  - "Carrousel" : 3 slides texte only (Hook marine → Développement teal →
 *    CTA rouge), version connexion (sans produit/photo) de la structure de
 *    carrousel du Brand Book §6.
 *
 * Cf. referentiels/charte_editoriale.json → piliers_editoriaux_hub.connexion.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Quote,
  FileText,
  Image as ImageIcon,
  Download,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { renderBrandCard, renderCarouselSlide, canvasToPngDownload, type FontChoice } from "@/lib/brand-card";
import { CustomColorPicker } from "@/components/social/ColorRemapRows";

const FONT_OPTIONS: { id: FontChoice; label: string }[] = [
  { id: "arial", label: "Arial Rounded" },
  { id: "cafeteria", label: "Cafeteria" },
];

function FontToggle({ value, onChange }: { value: FontChoice; onChange: (v: FontChoice) => void }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-brand-text mb-1">Police</div>
      <div className="flex gap-1.5">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              value === f.id
                ? "border-brand-text bg-brand-bg text-brand-text"
                : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Ligne de couleur réutilisable (Visuel + Carrousel) : swatches Brand Book +
 * bouton "+" qui ouvre un picker libre (roue native + hex + sous-tons, cf.
 * components/social/ColorRemapRows.tsx) — pour ne jamais être limitée aux
 * 6 couleurs du Brand Book.
 */
function BrandColorRow({ label, value, onPick }: { label: string; value: string; onPick: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="text-[11px] font-semibold text-brand-text mb-1">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {BRAND_SWATCHES.map((s) => (
          <button
            key={s.hex}
            type="button"
            title={s.nom}
            onClick={() => onPick(s.hex)}
            className={cn(
              "w-6 h-6 rounded-md border-2 transition-all",
              value.toLowerCase() === s.hex.toLowerCase() ? "border-brand-text" : "border-transparent"
            )}
            style={{ backgroundColor: s.hex }}
          />
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Couleur personnalisée"
          className={cn(
            "w-6 h-6 rounded-md shrink-0 flex items-center justify-center border border-dashed transition-all",
            open
              ? "border-brand-text text-brand-text bg-brand-bg"
              : "border-brand-muted/40 text-brand-muted hover:border-brand-text hover:text-brand-text"
          )}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {open && <CustomColorPicker initial={value} onApply={onPick} />}
    </div>
  );
}

/** Reprend un des 5 hooks générés dans l'onglet Légende pour l'envoyer comme texte sur un visuel. */
function HookPicker({ hooks, onPick }: { hooks: string[] | undefined; onPick: (hook: string) => void }) {
  if (!hooks || hooks.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold text-brand-muted uppercase mb-1">
        Utiliser un hook généré (onglet Légende)
      </div>
      <div className="flex flex-wrap gap-1">
        {hooks.map((hook, idx) => (
          <button
            key={idx}
            type="button"
            title={hook}
            onClick={() => onPick(hook)}
            className="px-2 py-1 rounded-md text-[10px] font-semibold border border-brand-muted/20 text-brand-muted hover:border-brand-rose hover:text-brand-rose transition-all"
          >
            {HOOK_LABELS[idx] || `#${idx + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}

type AngleId = "qui_sommes_nous" | "lien" | "souvenir" | "presence";

interface AngleOption {
  id: AngleId;
  nom: string;
  contexteUsage: string;
}

const ANGLES: AngleOption[] = [
  { id: "qui_sommes_nous", nom: "Qui sommes-nous", contexteUsage: "présentation atelier, équipe, promesse" },
  { id: "lien", nom: "Lien", contexteUsage: "couple, famille, amis proches" },
  { id: "souvenir", nom: "Souvenir / Occasion", contexteUsage: "naissance, diplôme, départ, anniversaire, fêtes" },
  { id: "presence", nom: "Présence", contexteUsage: "distance, expatrié, deuil" },
];

// Couleurs Brand Book v1.0 uniquement (jamais de terracotta — cf. app/brand/page.tsx §10).
const BRAND_SWATCHES = [
  { nom: "Marine", hex: "#16324C", ink: "#F4EEE2" },
  { nom: "Teal", hex: "#1E6E77", ink: "#F4EEE2" },
  { nom: "Crème", hex: "#F4EEE2", ink: "#16324C" },
  { nom: "Blush", hex: "#F4B4D2", ink: "#16324C" },
  { nom: "Ambre", hex: "#E0942E", ink: "#16324C" },
  { nom: "Sauge", hex: "#97A886", ink: "#16324C" },
];

interface CardDefaults {
  chipBg: string;
  chipInk: string;
  accentColor: string;
  headline: string;
  headlineAccent: string;
  cta: string;
}

// Valeurs par défaut par angle — éditables ensuite dans l'onglet Visuel.
const CARD_DEFAULTS: Record<AngleId, CardDefaults> = {
  qui_sommes_nous: {
    chipBg: "#1E6E77",
    chipInk: "#F4EEE2",
    accentColor: "#97A886",
    headline: "Une pièce unique,",
    headlineAccent: "brodée pour toi.",
    cta: "Je découvre →",
  },
  lien: {
    chipBg: "#F4B4D2",
    chipInk: "#16324C",
    accentColor: "#F4B4D2",
    headline: "Pas un cadeau.",
    headlineAccent: "Un lien, pour toujours.",
    cta: "Je crée le mien →",
  },
  souvenir: {
    chipBg: "#F4B4D2",
    chipInk: "#16324C",
    accentColor: "#97A886",
    headline: "Certains cadeaux",
    headlineAccent: "deviennent des souvenirs.",
    cta: "Je commande →",
  },
  presence: {
    chipBg: "#1E6E77",
    chipInk: "#F4EEE2",
    accentColor: "#F4B4D2",
    headline: "Même loin,",
    headlineAccent: "ta présence, brodée.",
    cta: "Je découvre →",
  },
};

interface CarouselDefaults {
  slide1Headline: string;
  slide1Accent: string;
  slide2Statement: string;
  slide3Headline: string;
  slide3Cta: string;
}

// Structure Brand Book §6 (Hook → Le choix → CTA), version texte only pour la connexion.
const CAROUSEL_DEFAULTS: Record<AngleId, CarouselDefaults> = {
  qui_sommes_nous: {
    slide1Headline: "Une pièce unique,",
    slide1Accent: "brodée pour toi.",
    slide2Statement:
      "Une petite équipe, un atelier dans les Hauts-de-France, une promesse simple : broder ce qui compte pour toi.",
    slide3Headline: "Rejoins l'histoire.",
    slide3Cta: "Je découvre →",
  },
  lien: {
    slide1Headline: "Pas un cadeau.",
    slide1Accent: "Un lien, pour toujours.",
    slide2Statement:
      "Deux prénoms, une date, un mot qu'on garde pour soi — brodé à la commande, ça devient un lien qu'on porte.",
    slide3Headline: "Choisis qui tu veux honorer.",
    slide3Cta: "Je crée le mien →",
  },
  souvenir: {
    slide1Headline: "Certains cadeaux",
    slide1Accent: "deviennent des souvenirs.",
    slide2Statement: "Une naissance, un diplôme, un départ : chaque étape mérite une trace qui dure.",
    slide3Headline: "Garde ce moment, brodé.",
    slide3Cta: "Je commande →",
  },
  presence: {
    slide1Headline: "Même loin,",
    slide1Accent: "ta présence, brodée.",
    slide2Statement: "Un prénom, une date, un mot : ça reste avec toi, même à des milliers de kilomètres.",
    slide3Headline: "Reste proche, même loin.",
    slide3Cta: "Je découvre →",
  },
};

const HOOK_LABELS = ["Émotion", "Question", "POV", "Humour", "Affirmation"];

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
  hooks?: string[];
  hashtagLigne?: string;
  brandSafety?: BrandSafety;
  source?: "openai" | "gemini" | "fallback";
  notice?: string;
}

export default function ConnexionPage() {
  const [tab, setTab] = useState<"legende" | "visuel" | "carrousel">("legende");
  const [angle, setAngle] = useState<AngleId>("qui_sommes_nous");
  const [data, setData] = useState<GenerateResponse | null>(null);

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
              Connexion
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
            <button
              type="button"
              onClick={() => setTab("carrousel")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                tab === "carrousel" ? "bg-white text-brand-rose shadow-sm" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Carrousel
            </button>
          </div>
        </div>
      </header>

      {tab === "legende" && <LegendeTab angle={angle} setAngle={setAngle} data={data} setData={setData} />}
      {tab === "visuel" && <VisuelTab angle={angle} setAngle={setAngle} data={data} />}
      {tab === "carrousel" && <CarouselTab angle={angle} setAngle={setAngle} data={data} />}
    </div>
  );
}

/* ============================================================
   Onglet Légende
   ============================================================ */

function LegendeTab({
  angle,
  setAngle,
  data,
  setData,
}: {
  angle: AngleId;
  setAngle: (v: AngleId) => void;
  data: GenerateResponse | null;
  setData: (v: GenerateResponse | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);
  const [dtfTeaser, setDtfTeaser] = useState(false);
  const [histoireClient, setHistoireClient] = useState("");

  async function onGenerate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);
    try {
      const res = await fetch("/api/connexion/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, dtfTeaser, histoireClient: histoireClient.trim() || undefined }),
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

  function handleCopyHook(hook: string, idx: number) {
    navigator.clipboard.writeText(hook);
    setCopiedHookIdx(idx);
    setTimeout(() => setCopiedHookIdx((cur) => (cur === idx ? null : cur)), 2000);
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
          <h2 className="font-serif text-lg">Post &laquo; Pourquoi Ypersoa &raquo;</h2>
        </div>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          Un post de marque, pas lié à un produit ni à un avis précis. Choisis l&apos;angle.
        </p>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              Angle
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ANGLES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAngle(a.id)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                    angle === a.id
                      ? "border-brand-text bg-brand-bg text-brand-text"
                      : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
                  )}
                >
                  {a.nom}
                  <div className="text-[10px] font-normal opacity-70 mt-0.5">{a.contexteUsage}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              Histoire cliente réelle (optionnel)
            </label>
            <textarea
              value={histoireClient}
              onChange={(e) => setHistoireClient(e.target.value)}
              placeholder="Colle une vraie histoire/anecdote cliente pour ancrer le post dedans (sinon le post reste générique à l'angle)."
              rows={3}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
            />
          </div>

          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={dtfTeaser}
              onChange={(e) => setDtfTeaser(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Teaser DTF — mentionner le lancement du DTF en octobre (séries uniques, sur-mesure) en plus de la
              broderie.
            </span>
          </label>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--brand-terracotta)" }}
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Génération…" : "Générer le post"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl p-3 flex items-start gap-2 text-xs bg-red-50 text-red-800 border border-red-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Colonne résultat */}
      <div className="space-y-3">
        <h2 className="font-serif text-lg mb-1">Légende</h2>
        <p className="text-xs text-brand-muted mb-2 leading-relaxed">
          Prête à coller dans Planable, avec 5 hooks alternatifs et les hashtags.
        </p>

        {!data && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
            Le post généré apparaîtra ici.
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
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{data.caption}</pre>
            </div>

            {data.hooks && data.hooks.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-brand-muted/10">
                  <Quote className="w-4 h-4 text-brand-rose" />
                  <h4 className="font-medium text-sm">5 hooks éditoriaux</h4>
                </div>
                <div className="space-y-1.5">
                  {data.hooks.map((hook, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-brand-bg/60 hover:bg-brand-rose/5 transition-colors group"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-rose mt-0.5 shrink-0 w-16">
                        {HOOK_LABELS[idx] || `#${idx + 1}`}
                      </span>
                      <p className="text-xs flex-1">{hook}</p>
                      <button
                        type="button"
                        onClick={() => handleCopyHook(hook, idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hover:text-brand-text shrink-0"
                        title="Copier"
                      >
                        {copiedHookIdx === idx ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.hashtagLigne && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
                <span className="text-[11px] font-semibold tracking-wide text-brand-muted uppercase">
                  Hashtags
                </span>
                <p className="text-xs mt-2 leading-relaxed">{data.hashtagLigne}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Onglet Visuel — carte Brand Book (app/brand/page.tsx §5)
   ============================================================ */

function VisuelTab({
  angle,
  setAngle,
  data,
}: {
  angle: AngleId;
  setAngle: (v: AngleId) => void;
  data: GenerateResponse | null;
}) {
  const activeAngle = ANGLES.find((a) => a.id === angle) ?? ANGLES[0];
  const defaults = CARD_DEFAULTS[angle];

  const [chipLabel, setChipLabel] = useState(activeAngle.nom);
  const [chipBg, setChipBg] = useState(defaults.chipBg);
  const [chipInk, setChipInk] = useState(defaults.chipInk);
  const [headline, setHeadline] = useState(defaults.headline);
  const [headlineAccent, setHeadlineAccent] = useState(defaults.headlineAccent);
  const [accentColor, setAccentColor] = useState(defaults.accentColor);
  const [cta, setCta] = useState(defaults.cta);
  const [fontChoice, setFontChoice] = useState<FontChoice>("arial");

  // Changer d'angle recharge les valeurs par défaut de cet angle (édition manuelle toujours possible ensuite).
  useEffect(() => {
    const d = CARD_DEFAULTS[angle];
    const a = ANGLES.find((x) => x.id === angle) ?? ANGLES[0];
    setChipLabel(a.nom);
    setChipBg(d.chipBg);
    setChipInk(d.chipInk);
    setHeadline(d.headline);
    setHeadlineAccent(d.headlineAccent);
    setAccentColor(d.accentColor);
    setCta(d.cta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 1080;
  const H = 1350;

  useEffect(() => {
    if (!canvasRef.current) return;
    renderBrandCard(canvasRef.current, {
      width: W,
      height: H,
      fontChoice,
      chipLabel,
      chipBg,
      chipInk,
      headline,
      headlineAccent,
      accentColor,
      cta,
    }).catch(() => undefined);
  }, [fontChoice, chipLabel, chipBg, chipInk, headline, headlineAccent, accentColor, cta]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safeAngle = angle.replace(/_/g, "-");
    canvasToPngDownload(canvasRef.current, `ypersoa_connexion_${safeAngle}_${Date.now()}.png`);
  };

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="grid grid-cols-12 gap-5">
        {/* COLONNE CONFIG */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold">Angle</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ANGLES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAngle(a.id)}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-semibold border transition-all",
                    angle === a.id
                      ? "border-brand-text bg-brand-bg text-brand-text"
                      : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
                  )}
                >
                  {a.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Chip (rubrique)
              </label>
              <input
                type="text"
                value={chipLabel}
                onChange={(e) => setChipLabel(e.target.value)}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>
            <BrandColorRow label="Couleur du chip" value={chipBg} onPick={setChipBg} />
            <BrandColorRow label="Couleur du texte du chip" value={chipInk} onPick={setChipInk} />

            <HookPicker
              hooks={data?.hooks}
              onPick={(hook) => {
                setHeadline(hook);
                setHeadlineAccent("");
              }}
            />

            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Headline — ligne 1
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                Headline — ligne 2 (italique, accent)
              </label>
              <input
                type="text"
                value={headlineAccent}
                onChange={(e) => setHeadlineAccent(e.target.value)}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>
            <BrandColorRow label="Couleur d'accent (ligne 2)" value={accentColor} onPick={setAccentColor} />

            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
                CTA
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
              />
            </div>

            <FontToggle value={fontChoice} onChange={setFontChoice} />
          </div>

          <p className="text-[11px] text-brand-muted leading-relaxed px-1">
            Format 4:5, fond marine fixe (épine dorsale du Brand Book — non recolorable). CTA en rouge coquelicot,
            jamais en terracotta.
          </p>
        </div>

        {/* STAGE */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-[#efe7d7] rounded-2xl p-6 flex items-center justify-center min-h-[480px]">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]"
              style={{ maxHeight: 560 }}
            />
          </div>
          <div className="flex items-center justify-center gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 px-6 transition-all"
              style={{ backgroundColor: "#C23A2D" }}
            >
              <Download className="w-4 h-4" />
              Télécharger PNG
            </button>
          </div>
          <p className="text-center text-[11px] text-brand-muted mt-3 max-w-[52ch] mx-auto">
            Fond marine · police {fontChoice === "arial" ? "Arial Rounded" : "Cafeteria"} · CTA rouge coquelicot —
            Brand Book v1.0.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Onglet Carrousel — 3 slides texte only (Brand Book §6, sans produit/photo)
   ============================================================ */

const SLIDE_BG = { hook: "#16324C", statement: "#1E6E77", cta: "#C23A2D" } as const;
const SLIDE_ACCENT_DEFAULT = "#97A886"; // sauge — même défaut que app/brand/page.tsx §6 slide 1
const CREME_INK = "#F4EEE2";

function CarouselTab({
  angle,
  setAngle,
  data,
}: {
  angle: AngleId;
  setAngle: (v: AngleId) => void;
  data: GenerateResponse | null;
}) {
  const defaults = CAROUSEL_DEFAULTS[angle];

  const [slide1Headline, setSlide1Headline] = useState(defaults.slide1Headline);
  const [slide1Accent, setSlide1Accent] = useState(defaults.slide1Accent);
  const [slide2Statement, setSlide2Statement] = useState(data?.hooks?.[4] ?? defaults.slide2Statement);
  const [slide3Headline, setSlide3Headline] = useState(defaults.slide3Headline);
  const [slide3Cta, setSlide3Cta] = useState(defaults.slide3Cta);
  const [fontChoice, setFontChoice] = useState<FontChoice>("arial");

  // Couleurs — pas réinitialisées au changement d'angle (choix visuel indépendant du texte).
  const [slide1Bg, setSlide1Bg] = useState<string>(SLIDE_BG.hook);
  const [slide1Ink, setSlide1Ink] = useState<string>(CREME_INK);
  const [slide1AccentColor, setSlide1AccentColor] = useState<string>(SLIDE_ACCENT_DEFAULT);
  const [slide2Bg, setSlide2Bg] = useState<string>(SLIDE_BG.statement);
  const [slide2Ink, setSlide2Ink] = useState<string>(CREME_INK);
  const [slide3Bg, setSlide3Bg] = useState<string>(SLIDE_BG.cta);
  const [slide3Ink, setSlide3Ink] = useState<string>(CREME_INK);

  // Changer d'angle recharge les valeurs par défaut (édition manuelle toujours possible ensuite).
  // Slide 2 se prefill sur le hook Affirmation déjà généré (onglet Légende) si disponible.
  useEffect(() => {
    const d = CAROUSEL_DEFAULTS[angle];
    setSlide1Headline(d.slide1Headline);
    setSlide1Accent(d.slide1Accent);
    setSlide2Statement(data?.hooks?.[4] ?? d.slide2Statement);
    setSlide3Headline(d.slide3Headline);
    setSlide3Cta(d.slide3Cta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle]);

  const canvas1 = useRef<HTMLCanvasElement>(null);
  const canvas2 = useRef<HTMLCanvasElement>(null);
  const canvas3 = useRef<HTMLCanvasElement>(null);
  const W = 1080;
  const H = 1350;

  useEffect(() => {
    if (!canvas1.current) return;
    renderCarouselSlide(canvas1.current, {
      width: W,
      height: H,
      fontChoice,
      bg: slide1Bg,
      ink: slide1Ink,
      index: "01",
      tag: "Hook",
      variant: "hook",
      headline: slide1Headline,
      headlineAccent: slide1Accent,
      accentColor: slide1AccentColor,
    }).catch(() => undefined);
  }, [fontChoice, slide1Headline, slide1Accent, slide1Bg, slide1Ink, slide1AccentColor]);

  useEffect(() => {
    if (!canvas2.current) return;
    renderCarouselSlide(canvas2.current, {
      width: W,
      height: H,
      fontChoice,
      bg: slide2Bg,
      ink: slide2Ink,
      index: "02",
      tag: "Développement",
      variant: "statement",
      statement: slide2Statement,
    }).catch(() => undefined);
  }, [fontChoice, slide2Statement, slide2Bg, slide2Ink]);

  useEffect(() => {
    if (!canvas3.current) return;
    renderCarouselSlide(canvas3.current, {
      width: W,
      height: H,
      fontChoice,
      bg: slide3Bg,
      ink: slide3Ink,
      index: "03",
      tag: "CTA",
      variant: "cta",
      headline: slide3Headline,
      ctaText: slide3Cta,
    }).catch(() => undefined);
  }, [fontChoice, slide3Headline, slide3Cta, slide3Bg, slide3Ink]);

  const safeAngle = angle.replace(/_/g, "-");
  const downloadAll = () => {
    if (canvas1.current) canvasToPngDownload(canvas1.current, `ypersoa_connexion_${safeAngle}_slide1_hook.png`);
    if (canvas2.current)
      setTimeout(() => canvas2.current && canvasToPngDownload(canvas2.current, `ypersoa_connexion_${safeAngle}_slide2_dev.png`), 200);
    if (canvas3.current)
      setTimeout(() => canvas3.current && canvasToPngDownload(canvas3.current, `ypersoa_connexion_${safeAngle}_slide3_cta.png`), 400);
  };

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2">Angle</div>
          <div className="flex flex-wrap gap-1.5">
            {ANGLES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAngle(a.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                  angle === a.id
                    ? "border-brand-text bg-brand-bg text-brand-text"
                    : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
                )}
              >
                {a.nom}
              </button>
            ))}
          </div>
        </div>
        <FontToggle value={fontChoice} onChange={setFontChoice} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Slide 1 — Hook */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas1} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker
              hooks={data?.hooks}
              onPick={(hook) => {
                setSlide1Headline(hook);
                setSlide1Accent("");
              }}
            />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">
              Ligne 1
            </label>
            <input
              type="text"
              value={slide1Headline}
              onChange={(e) => setSlide1Headline(e.target.value)}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">
              Ligne 2 (italique)
            </label>
            <input
              type="text"
              value={slide1Accent}
              onChange={(e) => setSlide1Accent(e.target.value)}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
            <BrandColorRow label="Fond" value={slide1Bg} onPick={setSlide1Bg} />
            <BrandColorRow label="Texte" value={slide1Ink} onPick={setSlide1Ink} />
            <BrandColorRow label="Accent (ligne 2)" value={slide1AccentColor} onPick={setSlide1AccentColor} />
          </div>
        </div>

        {/* Slide 2 — Développement */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas2} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker hooks={data?.hooks} onPick={(hook) => setSlide2Statement(hook)} />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">
              Texte
            </label>
            <textarea
              value={slide2Statement}
              onChange={(e) => setSlide2Statement(e.target.value)}
              rows={4}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
            />
            {data?.hooks && data.hooks[4] && (
              <p className="text-[10px] text-brand-muted italic">
                Prérempli avec le hook Affirmation généré dans l&apos;onglet Légende.
              </p>
            )}
            <BrandColorRow label="Fond" value={slide2Bg} onPick={setSlide2Bg} />
            <BrandColorRow label="Texte" value={slide2Ink} onPick={setSlide2Ink} />
          </div>
        </div>

        {/* Slide 3 — CTA */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas3} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker hooks={data?.hooks} onPick={(hook) => setSlide3Headline(hook)} />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">
              Headline
            </label>
            <input
              type="text"
              value={slide3Headline}
              onChange={(e) => setSlide3Headline(e.target.value)}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">CTA</label>
            <input
              type="text"
              value={slide3Cta}
              onChange={(e) => setSlide3Cta(e.target.value)}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
            <BrandColorRow label="Fond" value={slide3Bg} onPick={setSlide3Bg} />
            <BrandColorRow label="Texte" value={slide3Ink} onPick={setSlide3Ink} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mt-6">
        <button
          type="button"
          onClick={downloadAll}
          className="flex items-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 px-6 transition-all"
          style={{ backgroundColor: "#C23A2D" }}
        >
          <Download className="w-4 h-4" />
          Télécharger les 3 slides
        </button>
      </div>
      <p className="text-center text-[11px] text-brand-muted mt-3 max-w-[52ch] mx-auto">
        3 slides format 4:5 — Hook (marine) → Développement (teal) → CTA (rouge coquelicot), structure carrousel
        Brand Book §6 adaptée au pilier connexion (texte only, sans produit).
      </p>
    </main>
  );
}
