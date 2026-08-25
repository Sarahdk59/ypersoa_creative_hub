"use client";

/**
 * Connexion — Atelier Social. Générateur multi-piliers (22/08/2026) : couvrait
 * uniquement le pilier Connexion (4 angles) ; couvre désormais aussi Preuve
 * et Communauté via leurs fiches (P1-P4/C1-C4, lib/social/fiches-editoriales),
 * qui n'avaient jusqu'ici aucun outil (colonne "à faire" du tableau des 6
 * piliers de la Playbook) — demande Sarah 22/08 : centraliser les 3 piliers
 * texte/engagement dans un seul générateur plutôt que de garder Connexion
 * isolée, et automatiser le découpage Reels/Carrousel en gardant sa voix.
 *
 * Un sélecteur de pilier (Connexion/Preuve/Communauté) précède les 4 onglets :
 *  - "Légende" : génère le post (caption + 5 hooks) selon l'angle (Connexion)
 *    ou la fiche (Preuve/Communauté) choisie.
 *  - "Visuel" : compose une carte Brand Book (fond à motif du moteur Fonds +
 *    chip rubrique + texte avec mots surlignables + CTA rouge coquelicot) en
 *    Canvas, exportable en PNG — porte le composant SocialCard de
 *    app/brand/page.tsx §5, fond et mise en couleur du texte rendus libres.
 *  - "Carrousel" : 3 slides texte only (Hook → Développement → CTA), version
 *    connexion (sans produit/photo) de la structure de carrousel du Brand
 *    Book §6 — fond et palette texte PARTAGÉS entre les 3 slides pour une
 *    identité visuelle cohérente ("même dynamique, même mood").
 *  - "Reels" (nouveau) : découpe le même contenu en 3-4 plans filmables
 *    (direction visuelle + voix-off/overlay) — Sarah filme et monte, l'outil
 *    fait le script. Pas de génération vidéo, uniquement le texte du script.
 *
 * Cf. referentiels/charte_editoriale.json → piliers_editoriaux_hub.connexion.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  AlertTriangle,
  Sparkles,
  Quote,
  FileText,
  Image as ImageIcon,
  Download,
  Layers,
  PackageOpen,
  MessageCircle,
  Plus,
  Wand2,
  RefreshCw,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  renderBrandCard,
  renderCarouselSlide,
  canvasToPngDownload,
  buildTextTokens,
  type FontChoice,
} from "@/lib/brand-card";
import { CustomColorPicker } from "@/components/social/ColorRemapRows";
import { BackgroundPicker } from "@/components/social/BackgroundPicker";
import { type SocialPaletteRef, allSwatches } from "@/lib/social-palette";
import { type Pilier, FICHES_PREUVE, FICHES_COMMUNAUTE } from "@/lib/social/fiches-editoriales";
import { BrandSafetyBadge } from "@/components/social/BrandSafetyBadge";

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

function toggleIdx(set: Set<number>, idx: number): Set<number> {
  const next = new Set(set);
  if (next.has(idx)) next.delete(idx);
  else next.add(idx);
  return next;
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

/**
 * Texte éditable + mots cliquables pour surligner individuellement un ou
 * plusieurs mots (couleur `accent` au rendu) — remplace l'ancien schéma figé
 * "ligne 1 encre / ligne 2 italique accent". Mêmes tokens (lib/brand-card.ts
 * buildTextTokens) que ceux dessinés sur le canvas, donc ce qu'on clique ici
 * correspond exactement à ce qui se surligne sur le visuel.
 */
function WordHighlighter({
  label,
  text,
  onTextChange,
  highlighted,
  onToggle,
  rows = 3,
}: {
  label: string;
  text: string;
  onTextChange: (v: string) => void;
  highlighted: Set<number>;
  onToggle: (idx: number) => void;
  rows?: number;
}) {
  const tokens = useMemo(() => buildTextTokens(text), [text]);
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase">{label}</label>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={rows}
        className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
      />
      {tokens.length > 0 && (
        <>
          <div className="text-[10px] text-brand-muted">Clique un ou plusieurs mots pour les mettre en couleur</div>
          <div className="flex flex-wrap gap-1">
            {tokens.map((tok) => (
              <button
                key={tok.idx}
                type="button"
                onClick={() => onToggle(tok.idx)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[11px] border transition-all",
                  highlighted.has(tok.idx)
                    ? "border-brand-rose bg-brand-rose/10 text-brand-rose font-semibold"
                    : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
                )}
              >
                {tok.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FontSizeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-brand-text">Taille du texte</span>
        <span className="text-[10px] text-brand-muted">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={60}
        max={160}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-brand-rose"
      />
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

/** Options du sélecteur de brief (angle Connexion, ou fiche Preuve/Communauté) — même forme dans les 3 cas. */
interface BriefOption {
  id: string;
  nom: string;
  contexteUsage: string;
}

function getBriefOptions(pilier: Pilier): BriefOption[] {
  if (pilier === "connexion") return ANGLES;
  const bank = pilier === "preuve" ? FICHES_PREUVE : FICHES_COMMUNAUTE;
  return bank.map((f) => ({ id: f.id, nom: f.nom, contexteUsage: f.frequence }));
}

function getBriefLabel(pilier: Pilier, briefId: string): string {
  return getBriefOptions(pilier).find((o) => o.id === briefId)?.nom ?? briefId;
}

/**
 * Sélecteur d'angle (connexion) / fiche (preuve, communauté) — partagé par les 4
 * onglets ("un angle facile" partout, demande Sarah). Repris du pattern
 * Légende/Reels (grandes cartes titre + contexteUsage) plutôt que les pills
 * plus pauvres qu'avaient Visuel/Carrousel.
 */
function BriefPicker({
  pilier,
  briefId,
  onSelect,
}: {
  pilier: Pilier;
  briefId: string;
  onSelect: (id: string) => void;
}) {
  const options = getBriefOptions(pilier);
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
        {pilier === "connexion" ? "Angle" : "Fiche"}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            className={cn(
              "text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all",
              briefId === o.id
                ? "border-brand-text bg-brand-bg text-brand-text"
                : "border-brand-muted/15 text-brand-muted hover:border-brand-muted/30"
            )}
          >
            {o.nom}
            <div className="text-[10px] font-normal opacity-70 mt-0.5">{o.contexteUsage}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const PILIER_OPTIONS: { id: Pilier; label: string; icon: typeof Sparkles; desc: string }[] = [
  { id: "connexion", label: "Connexion", icon: Sparkles, desc: "Post de marque — pas lié à un produit ni à un avis précis" },
  { id: "preuve", label: "Preuve", icon: PackageOpen, desc: "Ce qui est réel — matière, mains, atelier, une commande vraie" },
  { id: "communaute", label: "Communauté", icon: MessageCircle, desc: "Ce qui fait parler — avis, question, jamais de vente" },
];

const PILIER_META: Record<Pilier, { postLabel: string; postDesc: string; histoireLabel: string; histoirePlaceholder: string }> = {
  connexion: {
    postLabel: "Pourquoi Ypersoa",
    postDesc: "Un post de marque, pas lié à un produit ni à un avis précis. Choisis l'angle.",
    histoireLabel: "Raconte-moi ton histoire (optionnel)",
    histoirePlaceholder:
      "Même deux lignes suffisent — une vraie histoire cliente pour ancrer le post dedans (sinon le post reste générique à l'angle).",
  },
  preuve: {
    postLabel: "Preuve",
    postDesc: "Un post qui montre du réel — la matière, tes mains, l'atelier, une commande vraie. Choisis la fiche.",
    histoireLabel: "Détail réel à broder dans ce post (optionnel)",
    histoirePlaceholder:
      "Prénom du client, motif, nuance de fil, numéro de commande… (sinon le post reste générique à la fiche).",
  },
  communaute: {
    postLabel: "Communauté",
    postDesc: "Un post qui fait parler, pas qui vend. Choisis la fiche.",
    histoireLabel: "Ce que tu as vraiment en tête (optionnel)",
    histoirePlaceholder:
      "Ta vraie note, ton vrai avis, ton vrai doute du jour… (sinon le post reste générique à la fiche).",
  },
};

// Couleurs Brand Book v1.0 uniquement (jamais de terracotta — cf. app/brand/page.tsx §10).
const BRAND_SWATCHES = [
  { nom: "Marine", hex: "#16324C", ink: "#F4EEE2" },
  { nom: "Teal", hex: "#1E6E77", ink: "#F4EEE2" },
  { nom: "Crème", hex: "#F4EEE2", ink: "#16324C" },
  { nom: "Blush", hex: "#F4B4D2", ink: "#16324C" },
  { nom: "Ambre", hex: "#E0942E", ink: "#16324C" },
  { nom: "Sauge", hex: "#97A886", ink: "#16324C" },
];

/** Palette de secours affichée le temps que /api/social/palette réponde (même repli que /social/avis, /social/fonds). */
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

function usePalette() {
  const [palette, setPalette] = useState<SocialPaletteRef>(FALLBACK_PALETTE);
  useEffect(() => {
    fetch("/api/social/palette", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPalette(res.data as SocialPaletteRef);
      })
      .catch(() => undefined);
  }, []);
  return useMemo(() => allSwatches(palette), [palette]);
}

interface CardDefaults {
  chipBg: string;
  chipInk: string;
  ink: string;
  accent: string;
  text: string;
  cta: string;
}

// Valeurs par défaut par angle (Connexion) ou par fiche (Preuve/Communauté) — éditables ensuite dans l'onglet Visuel.
// Record<string, ...> (pas Record<AngleId, ...>) car les ids de fiche (P1, C1...) s'y ajoutent plus bas.
const CARD_DEFAULTS: Record<string, CardDefaults> = {
  qui_sommes_nous: {
    chipBg: "#1E6E77",
    chipInk: "#F4EEE2",
    ink: "#F4EEE2",
    accent: "#97A886",
    text: "Une pièce unique, brodée pour toi.",
    cta: "Je découvre →",
  },
  lien: {
    chipBg: "#F4B4D2",
    chipInk: "#16324C",
    ink: "#F4EEE2",
    accent: "#F4B4D2",
    text: "Pas un cadeau. Un lien, pour toujours.",
    cta: "Je crée le mien →",
  },
  souvenir: {
    chipBg: "#F4B4D2",
    chipInk: "#16324C",
    ink: "#F4EEE2",
    accent: "#97A886",
    text: "Certains cadeaux deviennent des souvenirs.",
    cta: "Je commande →",
  },
  presence: {
    chipBg: "#1E6E77",
    chipInk: "#F4EEE2",
    ink: "#F4EEE2",
    accent: "#F4B4D2",
    text: "Même loin, ta présence, brodée.",
    cta: "Je découvre →",
  },
  // Preuve (chip rouge coquelicot — cf. PillarBanner "Preuve" du Playbook).
  P1: { chipBg: "#C23A2D", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#97A886", text: "Ce qu'il y a vraiment dans le colis.", cta: "Je découvre →" },
  P2: { chipBg: "#C23A2D", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#97A886", text: "Ce que tu vois sur la photo, et ce qu'il s'est vraiment passé.", cta: "Je découvre →" },
  P3: { chipBg: "#C23A2D", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#97A886", text: "Étape 12 sur 47 avant que ce soit parfait.", cta: "Je découvre →" },
  P4: { chipBg: "#C23A2D", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#F4B4D2", text: "Elle voulait un motif qui lui ressemble.", cta: "Je crée le mien →" },
  // Communauté (chip teal — cf. PillarBanner "Communauté" du Playbook).
  C1: { chipBg: "#1E6E77", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#F4B4D2", text: "5 trucs que je me répète quand je doute sur une commande.", cta: "Dis-moi en commentaire" },
  C2: { chipBg: "#1E6E77", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#97A886", text: "Note à moi-même : la vraie pensée du jour.", cta: "Dis-moi si t'es pareille" },
  C3: { chipBg: "#1E6E77", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#F4B4D2", text: "Mon avis qui va pas plaire.", cta: "Je lis tout" },
  C4: { chipBg: "#1E6E77", chipInk: "#F4EEE2", ink: "#F4EEE2", accent: "#97A886", text: "Le guide pour que ta pièce brodée dure des années.", cta: "Commente ENTRETIEN" },
};

interface CarouselDefaults {
  slide1Text: string;
  slide2Text: string;
  slide3Headline: string;
  slide3Cta: string;
}

// Structure Brand Book §6 (Hook → Le choix → CTA), version texte only pour la connexion.
const CAROUSEL_DEFAULTS: Record<string, CarouselDefaults> = {
  qui_sommes_nous: {
    slide1Text: "Une pièce unique, brodée pour toi.",
    slide2Text:
      "Une petite équipe, un atelier dans les Hauts-de-France, une promesse simple : broder ce qui compte pour toi.",
    slide3Headline: "Rejoins l'histoire.",
    slide3Cta: "Je découvre →",
  },
  lien: {
    slide1Text: "Pas un cadeau. Un lien, pour toujours.",
    slide2Text:
      "Deux prénoms, une date, un mot qu'on garde pour soi — brodé à la commande, ça devient un lien qu'on porte.",
    slide3Headline: "Choisis qui tu veux honorer.",
    slide3Cta: "Je crée le mien →",
  },
  souvenir: {
    slide1Text: "Certains cadeaux deviennent des souvenirs.",
    slide2Text: "Une naissance, un diplôme, un départ : chaque étape mérite une trace qui dure.",
    slide3Headline: "Garde ce moment, brodé.",
    slide3Cta: "Je commande →",
  },
  presence: {
    slide1Text: "Même loin, ta présence, brodée.",
    slide2Text: "Un prénom, une date, un mot : ça reste avec toi, même à des milliers de kilomètres.",
    slide3Headline: "Reste proche, même loin.",
    slide3Cta: "Je découvre →",
  },
  P1: {
    slide1Text: "Ce qu'il y a vraiment dans le colis.",
    slide2Text: "Papier de soie, la pièce brodée à la commande, ton prénom dessus — le vrai déballage, filmé comme il est.",
    slide3Headline: "Tu veux voir le tien ?",
    slide3Cta: "Je découvre →",
  },
  P2: {
    slide1Text: "Ce que tu vois sur la photo, et ce qu'il s'est vraiment passé.",
    slide2Text: "La photo léchée, le chaos réel de l'atelier — les deux sont vrais. Brodé à la commande, ça prend du temps et quelques ratés avant d'être parfait.",
    slide3Headline: "Team photo ou team coulisses ?",
    slide3Cta: "Dis-moi en commentaire",
  },
  P3: {
    slide1Text: "Étape 12 sur 47 avant que ce soit parfait.",
    slide2Text: "Chaque motif brodé à la commande passe par des dizaines d'étapes avant de partir — la nuance, le fil, le geste juste.",
    slide3Headline: "À ton avis, quelle nuance ?",
    slide3Cta: "Dis-moi en commentaire",
  },
  P4: {
    slide1Text: "Elle voulait un motif qui lui ressemble.",
    slide2Text: "Une idée, un prénom, une couleur choisie — brodé à la commande, à son image. Chaque pièce raconte pourquoi elle existe.",
    slide3Headline: "Et toi, ce serait quoi TON motif ?",
    slide3Cta: "Je crée le mien →",
  },
  C1: {
    slide1Text: "5 trucs que je me répète quand je doute sur une commande.",
    slide2Text: "Le doute fait partie du métier — pas un obstacle, une preuve qu'on prend chaque commande au sérieux.",
    slide3Headline: "Laquelle te parle le plus ?",
    slide3Cta: "Dis-moi en commentaire",
  },
  C2: {
    slide1Text: "Note à moi-même : la vraie pensée du jour.",
    slide2Text: "Écrite comme je l'écris vraiment, dans mon vrai carnet d'atelier — pas une citation motivante.",
    slide3Headline: "Ça te parle ?",
    slide3Cta: "Dis-moi en commentaire",
  },
  C3: {
    slide1Text: "Mon avis qui va pas plaire.",
    slide2Text: "Une vraie opinion, celle qui dérange un peu — pas un consensus déguisé en punchline.",
    slide3Headline: "T'es d'accord ou pas ?",
    slide3Cta: "Je lis tout",
  },
  C4: {
    slide1Text: "Le guide pour que ta pièce brodée dure des années.",
    slide2Text: "Un cadeau utile, jamais une promo — le Club, c'est l'accès à ce qu'on sait sur l'entretien d'une pièce brodée.",
    slide3Headline: "Commente ENTRETIEN",
    slide3Cta: "Je te l'envoie",
  },
};

const HOOK_LABELS = ["Émotion", "Question", "POV", "Humour", "Affirmation"];
// Une couleur par registre, tirée des tokens réels (BRAND_SWATCHES / FALLBACK_PALETTE.saisonnier_officiel) — pas de hex inventé.
const HOOK_COLORS = ["#C23A2D", "#1E6E77", "#16324C", "#E0942E", "#7E2F3B"];

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

interface ReelShot {
  plan: string;
  texte: string;
}

interface GenerateResponse {
  ok: boolean;
  error?: string;
  caption?: string;
  hooks?: string[];
  reelsShotlist?: ReelShot[];
  hashtagLigne?: string;
  brandSafety?: BrandSafety;
  source?: "openai" | "gemini" | "fallback";
  notice?: string;
}

export function HistoireWorkspace() {
  const [pilier, setPilier] = useState<Pilier>("connexion");
  const [tab, setTab] = useState<"legende" | "visuel" | "carrousel">("legende");
  const [briefId, setBriefId] = useState<string>("qui_sommes_nous");
  const [data, setData] = useState<GenerateResponse | null>(null);

  function handlePilierChange(p: Pilier) {
    if (p === pilier) return;
    setPilier(p);
    setBriefId(getBriefOptions(p)[0].id);
    setData(null);
  }

  return (
    <div className="text-brand-text font-sans">
      {/* Sélecteur de pilier — 3 des 6 piliers du Playbook (Réassurance/Qualification/Occasions ont déjà leur propre outil).
          Cartes (pas pills) avec sous-texte : cliquer ici change toute la banque de fiches en dessous, pas un simple filtre d'affichage. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {PILIER_OPTIONS.map((p) => {
          const Icon = p.icon;
          const isOn = p.id === pilier;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePilierChange(p.id)}
              className={cn(
                "text-left rounded-xl border p-3 flex items-start gap-2.5 transition-all bg-white",
                isOn
                  ? "border-brand-text shadow-[0_1px_2px_rgba(22,50,76,.05),0_6px_16px_rgba(22,50,76,.06)]"
                  : "border-brand-muted/15 hover:border-brand-muted/30 hover:-translate-y-0.5"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-lg grid place-items-center shrink-0 transition-colors",
                  isOn ? "bg-brand-text text-white" : "bg-brand-bg text-brand-muted"
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[13px] font-semibold", isOn ? "text-brand-text" : "text-brand-muted")}>
                  {p.label}
                </span>
                <span className="block text-[11px] text-brand-muted/80 leading-snug mt-0.5">{p.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center bg-hub-bg-alt rounded-full p-0.5 border border-hub-border w-fit mb-4">
          <button
            type="button"
            onClick={() => setTab("legende")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              tab === "legende" ? "bg-white text-hub-teal shadow-sm" : "text-hub-foreground/55 hover:text-hub-foreground"
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
              tab === "visuel" ? "bg-white text-hub-teal shadow-sm" : "text-hub-foreground/55 hover:text-hub-foreground"
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
              tab === "carrousel" ? "bg-white text-hub-teal shadow-sm" : "text-hub-foreground/55 hover:text-hub-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Carrousel
          </button>
      </div>

      {tab === "legende" && (
        <LegendeTab
          pilier={pilier}
          briefId={briefId}
          setBriefId={setBriefId}
          data={data}
          setData={setData}
          onOpenVisuel={() => setTab("visuel")}
        />
      )}
      {tab === "visuel" && <VisuelTab pilier={pilier} briefId={briefId} setBriefId={setBriefId} data={data} />}
      {tab === "carrousel" && <CarouselTab pilier={pilier} briefId={briefId} setBriefId={setBriefId} data={data} />}
    </div>
  );
}

/* ============================================================
   Onglet Légende
   ============================================================ */

function LegendeTab({
  pilier,
  briefId,
  setBriefId,
  data,
  setData,
  onOpenVisuel,
}: {
  pilier: Pilier;
  briefId: string;
  setBriefId: (v: string) => void;
  data: GenerateResponse | null;
  setData: (v: GenerateResponse | null) => void;
  onOpenVisuel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHookIdx, setCopiedHookIdx] = useState<number | null>(null);
  const [dtfTeaser, setDtfTeaser] = useState(false);
  const [histoireClient, setHistoireClient] = useState("");
  const [selectedHookIdx, setSelectedHookIdx] = useState(0);
  const meta = PILIER_META[pilier];

  async function onGenerate(develop = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    setSelectedHookIdx(0);
    try {
      const res = await fetch("/api/connexion/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilier,
          angle: pilier === "connexion" ? briefId : undefined,
          ficheId: pilier === "connexion" ? undefined : briefId,
          dtfTeaser: pilier === "connexion" ? dtfTeaser : undefined,
          histoireClient: histoireClient.trim() || undefined,
          develop: develop || undefined,
        }),
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
    <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Colonne formulaire */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
            style={{ color: "#C23A2D" }}
          >
            ⌘
          </span>
          <h2 className="font-serif text-lg">Post &laquo; {meta.postLabel} &raquo;</h2>
        </div>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">{meta.postDesc}</p>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10 space-y-4">
          <BriefPicker pilier={pilier} briefId={briefId} onSelect={setBriefId} />

          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-brand-muted uppercase mb-1.5">
              {meta.histoireLabel}
            </label>
            <textarea
              value={histoireClient}
              onChange={(e) => setHistoireClient(e.target.value)}
              placeholder={meta.histoirePlaceholder}
              rows={3}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50 resize-y"
            />
          </div>

          {pilier === "connexion" && (
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
          )}

          {!data ? (
            <button
              type="button"
              onClick={() => onGenerate()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#C23A2D" }}
            >
              <Sparkles className="w-4 h-4" />
              {loading ? "Génération…" : "Générer le post"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onGenerate(true)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2.5 border border-brand-muted/20 text-brand-text hover:border-brand-text transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Étoffer le post
              </button>
              <button
                type="button"
                onClick={() => onGenerate()}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2.5 border border-brand-muted/20 text-brand-text hover:border-brand-text transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Régénérer
              </button>
            </div>
          )}
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

        {loading && !data && (
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

            <BrandSafetyBadge brandSafety={data.brandSafety ?? null} />

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
                  <h4 className="font-medium text-sm">Tes 5 voix</h4>
                  <span className="text-[10px] text-brand-muted ml-auto">Choisis celle qui te ressemble</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {data.hooks.map((hook, idx) => {
                    const vc = HOOK_COLORS[idx] || "#C23A2D";
                    const selected = selectedHookIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedHookIdx(idx)}
                        className="relative text-left p-2.5 rounded-lg border bg-brand-bg/40 hover:bg-brand-bg transition-all group"
                        style={{ borderColor: selected ? vc : "rgba(22,50,76,.12)" }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: vc }} />
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: selected ? vc : "var(--brand-muted, rgba(22,50,76,.45))" }}
                          >
                            {HOOK_LABELS[idx] || `#${idx + 1}`}
                          </span>
                          <Heart
                            className="w-3 h-3 ml-auto shrink-0"
                            style={{ color: selected ? vc : "rgba(22,50,76,.15)" }}
                            fill={selected ? vc : "none"}
                          />
                        </div>
                        <p className="text-xs leading-snug pr-1">{hook}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyHook(hook, idx);
                          }}
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-brand-muted hover:text-brand-text"
                          title="Copier"
                        >
                          {copiedHookIdx === idx ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <HookPreview
              pilier={pilier}
              briefId={briefId}
              hook={data.hooks?.[selectedHookIdx]}
              onOpenVisuel={onOpenVisuel}
            />

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

/**
 * Mini aperçu visuel de l'onglet Légende — "voir le rendu via fonds" (demande Sarah).
 * Ne réinvente rien : pilote le même moteur que l'onglet Visuel (renderBrandCard +
 * BackgroundPicker/fonds-engine), juste avec un jeu de props réduit (chip = brief,
 * texte = hook sélectionné, couleurs = CARD_DEFAULTS déjà utilisées par Visuel).
 * C'est la concrétisation du "1 moteur, N formulaires".
 */
function HookPreview({
  pilier,
  briefId,
  hook,
  onOpenVisuel,
}: {
  pilier: Pilier;
  briefId: string;
  hook: string | undefined;
  onOpenVisuel: () => void;
}) {
  const swatches = usePalette();
  const defaults = CARD_DEFAULTS[briefId] ?? CARD_DEFAULTS.qui_sommes_nous;
  const chipLabel = getBriefLabel(pilier, briefId);
  const text = hook || defaults.text;
  const [backgroundSvg, setBackgroundSvg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokens = useMemo(() => buildTextTokens(text), [text]);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderBrandCard(canvasRef.current, {
      width: 480,
      height: 600,
      fontChoice: "arial",
      fontScale: 1,
      backgroundSvg: backgroundSvg || undefined,
      chipLabel,
      chipBg: defaults.chipBg,
      chipInk: defaults.chipInk,
      tokens,
      highlighted: new Set(),
      ink: defaults.ink,
      accent: defaults.accent,
      cta: defaults.cta,
    }).catch(() => undefined);
  }, [backgroundSvg, chipLabel, defaults, tokens]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold tracking-wide text-brand-muted uppercase">Aperçu visuel</span>
        <button
          type="button"
          onClick={onOpenVisuel}
          className="text-[11px] font-semibold text-brand-rose hover:text-brand-rose-light transition-colors"
        >
          Personnaliser dans Visuel →
        </button>
      </div>
      <div className="flex gap-4 flex-wrap items-start">
        <canvas
          ref={canvasRef}
          className="rounded-lg shrink-0 shadow-[0_6px_20px_rgba(22,50,76,0.14)]"
          style={{ width: 168, height: 210 }}
        />
        <div className="flex-1 min-w-[180px]">
          <div className="text-[10px] font-semibold text-brand-muted uppercase mb-1.5">Fond (moteur Fonds)</div>
          <BackgroundPicker
            swatches={swatches}
            formatId="p45"
            defaultBg={defaults.chipBg}
            onOutputChange={setBackgroundSvg}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Onglet Visuel — carte Brand Book (app/brand/page.tsx §5)
   ============================================================ */

function VisuelTab({
  pilier,
  briefId,
  setBriefId,
  data,
}: {
  pilier: Pilier;
  briefId: string;
  setBriefId: (v: string) => void;
  data: GenerateResponse | null;
}) {
  const swatches = usePalette();
  const defaults = CARD_DEFAULTS[briefId];

  const [chipLabel, setChipLabel] = useState(getBriefLabel(pilier, briefId));
  const [chipBg, setChipBg] = useState(defaults.chipBg);
  const [chipInk, setChipInk] = useState(defaults.chipInk);
  const [text, setText] = useState(defaults.text);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [ink, setInk] = useState(defaults.ink);
  const [accent, setAccent] = useState(defaults.accent);
  const [cta, setCta] = useState(defaults.cta);
  const [fontChoice, setFontChoice] = useState<FontChoice>("arial");
  const [fontScale, setFontScale] = useState(1);
  const [backgroundSvg, setBackgroundSvg] = useState("");

  // Changer de brief (angle ou fiche) recharge les valeurs par défaut correspondantes (édition manuelle toujours possible ensuite).
  useEffect(() => {
    const d = CARD_DEFAULTS[briefId];
    if (!d) return;
    setChipLabel(getBriefLabel(pilier, briefId));
    setChipBg(d.chipBg);
    setChipInk(d.chipInk);
    setText(d.text);
    setHighlighted(new Set());
    setInk(d.ink);
    setAccent(d.accent);
    setCta(d.cta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilier, briefId]);

  // Le texte a changé (saisie manuelle ou hook repris) : les indices de mots ne correspondent plus, on réinitialise.
  useEffect(() => setHighlighted(new Set()), [text]);

  const tokens = useMemo(() => buildTextTokens(text), [text]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 1080;
  const H = 1350;

  useEffect(() => {
    if (!canvasRef.current) return;
    renderBrandCard(canvasRef.current, {
      width: W,
      height: H,
      fontChoice,
      fontScale,
      backgroundSvg: backgroundSvg || undefined,
      chipLabel,
      chipBg,
      chipInk,
      tokens,
      highlighted,
      ink,
      accent,
      cta,
    }).catch(() => undefined);
  }, [fontChoice, fontScale, backgroundSvg, chipLabel, chipBg, chipInk, tokens, highlighted, ink, accent, cta]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const safeId = briefId.replace(/_/g, "-");
    canvasToPngDownload(canvasRef.current, `ypersoa_${pilier}_${safeId}_${Date.now()}.png`);
  };

  return (
    <main>
      <div className="grid grid-cols-12 gap-5">
        {/* COLONNE CONFIG */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
            <BriefPicker pilier={pilier} briefId={briefId} onSelect={setBriefId} />
          </div>

          <div className="bg-white border border-brand-muted/15 rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2">Fond</div>
            <BackgroundPicker swatches={swatches} formatId="p45" defaultBg="#16324C" onOutputChange={setBackgroundSvg} />
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

            <HookPicker hooks={data?.hooks} onPick={(hook) => setText(hook)} />

            <WordHighlighter
              label="Texte"
              text={text}
              onTextChange={setText}
              highlighted={highlighted}
              onToggle={(idx) => setHighlighted((h) => toggleIdx(h, idx))}
            />
            <BrandColorRow label="Couleur du texte" value={ink} onPick={setInk} />
            <BrandColorRow label="Couleur des mots surlignés" value={accent} onPick={setAccent} />
            <FontSizeSlider value={fontScale} onChange={setFontScale} />

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
            Format 4:5. CTA en rouge coquelicot, jamais en terracotta (règle Brand Book).
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
            Fond du moteur Fonds · police {fontChoice === "arial" ? "Arial Rounded" : "Cafeteria"} · CTA rouge
            coquelicot — Brand Book v1.0.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   Onglet Carrousel — 3 slides texte only (Brand Book §6, sans produit/photo)
   ============================================================ */

const FALLBACK_SLIDE_BG = "#16324C";

function CarouselTab({
  pilier,
  briefId,
  setBriefId,
  data,
}: {
  pilier: Pilier;
  briefId: string;
  setBriefId: (v: string) => void;
  data: GenerateResponse | null;
}) {
  const swatches = usePalette();
  const defaults = CAROUSEL_DEFAULTS[briefId];

  const [slide1Text, setSlide1Text] = useState(defaults.slide1Text);
  const [slide1Highlighted, setSlide1Highlighted] = useState<Set<number>>(new Set());
  const [slide2Text, setSlide2Text] = useState(data?.hooks?.[4] ?? defaults.slide2Text);
  const [slide2Highlighted, setSlide2Highlighted] = useState<Set<number>>(new Set());
  const [slide3Headline, setSlide3Headline] = useState(defaults.slide3Headline);
  const [slide3Highlighted, setSlide3Highlighted] = useState<Set<number>>(new Set());
  const [slide3Cta, setSlide3Cta] = useState(defaults.slide3Cta);
  const [fontChoice, setFontChoice] = useState<FontChoice>("arial");

  // Fond + palette texte PARTAGÉS entre les 3 slides — garantit "même dynamique, même mood, mêmes couleurs".
  const [backgroundSvg, setBackgroundSvg] = useState("");
  const [sharedInk, setSharedInk] = useState("#F4EEE2");
  const [sharedAccent, setSharedAccent] = useState("#97A886");

  const [slide1Scale, setSlide1Scale] = useState(1);
  const [slide2Scale, setSlide2Scale] = useState(1);
  const [slide3Scale, setSlide3Scale] = useState(1);

  // Changer de brief (angle ou fiche) recharge les valeurs par défaut (édition manuelle toujours possible ensuite).
  // Slide 2 se prefill sur le hook Affirmation déjà généré (onglet Légende) si disponible.
  // Couleurs/fond partagés et tailles NE sont PAS réinitialisés (choix visuel indépendant du texte).
  useEffect(() => {
    const d = CAROUSEL_DEFAULTS[briefId];
    if (!d) return;
    setSlide1Text(d.slide1Text);
    setSlide2Text(data?.hooks?.[4] ?? d.slide2Text);
    setSlide3Headline(d.slide3Headline);
    setSlide3Cta(d.slide3Cta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilier, briefId]);

  useEffect(() => setSlide1Highlighted(new Set()), [slide1Text]);
  useEffect(() => setSlide2Highlighted(new Set()), [slide2Text]);
  useEffect(() => setSlide3Highlighted(new Set()), [slide3Headline]);

  const slide1Tokens = useMemo(() => buildTextTokens(slide1Text), [slide1Text]);
  const slide2Tokens = useMemo(() => buildTextTokens(slide2Text), [slide2Text]);
  const slide3Tokens = useMemo(() => buildTextTokens(slide3Headline), [slide3Headline]);

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
      fontScale: slide1Scale,
      backgroundSvg: backgroundSvg || undefined,
      bg: FALLBACK_SLIDE_BG,
      ink: sharedInk,
      accent: sharedAccent,
      index: "01",
      tag: "Hook",
      variant: "hook",
      tokens: slide1Tokens,
      highlighted: slide1Highlighted,
    }).catch(() => undefined);
  }, [fontChoice, slide1Scale, backgroundSvg, sharedInk, sharedAccent, slide1Tokens, slide1Highlighted]);

  useEffect(() => {
    if (!canvas2.current) return;
    renderCarouselSlide(canvas2.current, {
      width: W,
      height: H,
      fontChoice,
      fontScale: slide2Scale,
      backgroundSvg: backgroundSvg || undefined,
      bg: FALLBACK_SLIDE_BG,
      ink: sharedInk,
      accent: sharedAccent,
      index: "02",
      tag: "Développement",
      variant: "statement",
      tokens: slide2Tokens,
      highlighted: slide2Highlighted,
    }).catch(() => undefined);
  }, [fontChoice, slide2Scale, backgroundSvg, sharedInk, sharedAccent, slide2Tokens, slide2Highlighted]);

  useEffect(() => {
    if (!canvas3.current) return;
    renderCarouselSlide(canvas3.current, {
      width: W,
      height: H,
      fontChoice,
      fontScale: slide3Scale,
      backgroundSvg: backgroundSvg || undefined,
      bg: FALLBACK_SLIDE_BG,
      ink: sharedInk,
      accent: sharedAccent,
      index: "03",
      tag: "CTA",
      variant: "cta",
      tokens: slide3Tokens,
      highlighted: slide3Highlighted,
      ctaText: slide3Cta,
    }).catch(() => undefined);
  }, [fontChoice, slide3Scale, backgroundSvg, sharedInk, sharedAccent, slide3Tokens, slide3Highlighted, slide3Cta]);

  const safeId = briefId.replace(/_/g, "-");
  const downloadAll = () => {
    if (canvas1.current) canvasToPngDownload(canvas1.current, `ypersoa_${pilier}_${safeId}_slide1_hook.png`);
    if (canvas2.current)
      setTimeout(
        () => canvas2.current && canvasToPngDownload(canvas2.current, `ypersoa_${pilier}_${safeId}_slide2_dev.png`),
        200
      );
    if (canvas3.current)
      setTimeout(
        () => canvas3.current && canvasToPngDownload(canvas3.current, `ypersoa_${pilier}_${safeId}_slide3_cta.png`),
        400
      );
  };

  return (
    <main>
      <div className="bg-white border border-brand-muted/15 rounded-2xl p-4 mb-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <BriefPicker pilier={pilier} briefId={briefId} onSelect={setBriefId} />
          </div>
          <FontToggle value={fontChoice} onChange={setFontChoice} />
        </div>

        <p className="text-[11px] text-brand-muted">
          Fond et palette texte partagés entre les 3 slides — même identité visuelle sur tout le carrousel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-brand-muted font-semibold mb-2">Fond</div>
            <BackgroundPicker swatches={swatches} formatId="p45" defaultBg="#16324C" onOutputChange={setBackgroundSvg} />
          </div>
          <BrandColorRow label="Couleur du texte" value={sharedInk} onPick={setSharedInk} />
          <BrandColorRow label="Couleur des mots surlignés" value={sharedAccent} onPick={setSharedAccent} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Slide 1 — Hook */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas1} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker hooks={data?.hooks} onPick={(hook) => setSlide1Text(hook)} />
            <WordHighlighter
              label="Texte"
              text={slide1Text}
              onTextChange={setSlide1Text}
              highlighted={slide1Highlighted}
              onToggle={(idx) => setSlide1Highlighted((h) => toggleIdx(h, idx))}
              rows={2}
            />
            <FontSizeSlider value={slide1Scale} onChange={setSlide1Scale} />
          </div>
        </div>

        {/* Slide 2 — Développement */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas2} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker hooks={data?.hooks} onPick={(hook) => setSlide2Text(hook)} />
            <WordHighlighter
              label="Texte"
              text={slide2Text}
              onTextChange={setSlide2Text}
              highlighted={slide2Highlighted}
              onToggle={(idx) => setSlide2Highlighted((h) => toggleIdx(h, idx))}
              rows={4}
            />
            {data?.hooks && data.hooks[4] && (
              <p className="text-[10px] text-brand-muted italic">
                Prérempli avec le hook Affirmation généré dans l&apos;onglet Légende.
              </p>
            )}
            <FontSizeSlider value={slide2Scale} onChange={setSlide2Scale} />
          </div>
        </div>

        {/* Slide 3 — CTA */}
        <div className="space-y-3">
          <div className="bg-[#efe7d7] rounded-2xl p-4 flex items-center justify-center">
            <canvas ref={canvas3} className="max-w-full h-auto rounded-lg shadow-[0_8px_30px_rgba(22,50,76,0.14)]" style={{ maxHeight: 400 }} />
          </div>
          <div className="bg-white border border-brand-muted/15 rounded-2xl p-3 space-y-2">
            <HookPicker hooks={data?.hooks} onPick={(hook) => setSlide3Headline(hook)} />
            <WordHighlighter
              label="Headline"
              text={slide3Headline}
              onTextChange={setSlide3Headline}
              highlighted={slide3Highlighted}
              onToggle={(idx) => setSlide3Highlighted((h) => toggleIdx(h, idx))}
              rows={2}
            />
            <FontSizeSlider value={slide3Scale} onChange={setSlide3Scale} />
            <label className="block text-[10px] font-semibold tracking-wide text-brand-muted uppercase">CTA</label>
            <input
              type="text"
              value={slide3Cta}
              onChange={(e) => setSlide3Cta(e.target.value)}
              className="w-full p-2 rounded-lg border border-brand-muted/20 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-rose/50"
            />
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
        3 slides format 4:5 — Hook → Développement → CTA (rouge coquelicot), fond et palette texte partagés,
        structure carrousel Brand Book §6 adaptée au pilier connexion (texte only, sans produit).
      </p>
    </main>
  );
}
