"use client";

/**
 * Réel — Atelier Social. Extrait de l'ancien onglet "Reels" de Connexion
 * (22/08/2026) : script de tournage texte only (direction visuelle +
 * voix-off/overlay par plan), jamais de génération vidéo — Sarah filme et
 * monte, l'outil fait le découpage. Même moteur que le mode Histoire
 * (POST /api/connexion/generate, reelsShotlist fait partie de la même
 * réponse), donc même sélecteur de pilier/brief.
 */

import { useState } from "react";
import {
  Check,
  Copy,
  AlertTriangle,
  Film,
  Sparkles,
  PackageOpen,
  MessageCircle,
  Images,
  Wand2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Pilier, FICHES_PREUVE, FICHES_COMMUNAUTE } from "@/lib/social/fiches-editoriales";
import { BrandSafetyBadge } from "@/components/social/BrandSafetyBadge";
import { ReelMediaPickerModal } from "@/components/social/ReelMediaPickerModal";
import type { MediaWithTags } from "@/types/mediatheque";

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

const PILIER_OPTIONS: { id: Pilier; label: string; icon: typeof Sparkles }[] = [
  { id: "connexion", label: "Connexion", icon: Sparkles },
  { id: "preuve", label: "Preuve", icon: PackageOpen },
  { id: "communaute", label: "Communauté", icon: MessageCircle },
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

/** Visuel attaché à un plan — soit choisi dans la médiathèque, soit généré (Gemini, image fixe). */
interface ShotVisual {
  url: string;
  kind: "media" | "generated";
  generating?: boolean;
  error?: string;
}

export function ReelWorkspace() {
  const [pilier, setPilier] = useState<Pilier>("connexion");
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
      <div className="inline-flex items-center bg-white border border-brand-muted/15 rounded-full p-1 gap-1 mb-4">
        {PILIER_OPTIONS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePilierChange(p.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                pilier === p.id ? "bg-brand-text text-white" : "text-brand-muted hover:text-brand-text"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {p.label}
            </button>
          );
        })}
      </div>

      <ReelsTab pilier={pilier} briefId={briefId} setBriefId={setBriefId} data={data} setData={setData} />
    </div>
  );
}

/**
 * Reels = script texte only (direction visuelle + voix-off/overlay par plan) —
 * jamais de génération vidéo. Sarah filme et monte, l'outil fait le découpage
 * pour ne plus partir d'une page blanche. Génère via /api/connexion/generate
 * (reelsShotlist fait partie de la même réponse que Légende, cf. mode Histoire).
 */
function ReelsTab({
  pilier,
  briefId,
  setBriefId,
  data,
  setData,
}: {
  pilier: Pilier;
  briefId: string;
  setBriefId: (v: string) => void;
  data: GenerateResponse | null;
  setData: (v: GenerateResponse | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [dtfTeaser, setDtfTeaser] = useState(false);
  const [histoireClient, setHistoireClient] = useState("");
  const [visuals, setVisuals] = useState<Record<number, ShotVisual>>({});
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const meta = PILIER_META[pilier];

  function handleSelectMedia(idx: number, media: MediaWithTags) {
    setVisuals((prev) => ({ ...prev, [idx]: { url: media.public_url, kind: "media" } }));
  }

  function handleClearVisual(idx: number) {
    setVisuals((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  async function handleGenerateVisual(idx: number, shot: ReelShot) {
    setVisuals((prev) => ({ ...prev, [idx]: { url: prev[idx]?.url ?? "", kind: "generated", generating: true } }));
    try {
      const res = await fetch("/api/social/reel-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: shot.texte ? `${shot.plan} — ${shot.texte}` : shot.plan }),
      });
      const json = (await res.json()) as { imageDataUrl?: string; message?: string };
      if (!res.ok || !json.imageDataUrl) throw new Error(json.message || "Génération impossible.");
      setVisuals((prev) => ({ ...prev, [idx]: { url: json.imageDataUrl as string, kind: "generated" } }));
    } catch (e) {
      setVisuals((prev) => ({
        ...prev,
        [idx]: { url: "", kind: "generated", error: e instanceof Error ? e.message : String(e) },
      }));
    }
  }

  async function onGenerate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCopiedAll(false);
    setVisuals({});
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

  function formatScript(shots: ReelShot[]): string {
    return shots
      .map((s, i) => `PLAN ${i + 1} — ${s.plan}${s.texte ? `\n"${s.texte}"` : "\n(silencieux)"}`)
      .join("\n\n");
  }

  function handleCopyAll() {
    if (!data?.reelsShotlist) return;
    navigator.clipboard.writeText(formatScript(data.reelsShotlist));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function handleCopyShot(shot: ReelShot, idx: number) {
    navigator.clipboard.writeText(shot.texte ? `${shot.plan}\n"${shot.texte}"` : shot.plan);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 2000);
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Colonne formulaire */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Film className="w-4 h-4" style={{ color: "#6E1F2E" }} />
          <h2 className="font-serif text-lg">Script Reels &laquo; {meta.postLabel} &raquo;</h2>
        </div>
        <p className="text-xs text-brand-muted mb-5 leading-relaxed">
          Découpage en 3-4 plans filmables — direction visuelle + voix-off/overlay. Toi tu filmes et montes.
        </p>

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

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-full py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#6E1F2E" }}
          >
            <Film className="w-4 h-4" />
            {loading ? "Génération…" : "Générer le script"}
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-serif text-lg">Plans</h2>
          {data?.reelsShotlist && data.reelsShotlist.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-rose hover:text-brand-rose-light transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copier le script
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-brand-muted mb-2 leading-relaxed">
          10-20 secondes, format 9:16 — chaque plan a sa direction et son texte (ou silence).
        </p>

        {!data && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
            Le script généré apparaîtra ici.
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-muted/10 text-center text-xs text-brand-muted">
            Génération en cours…
          </div>
        )}

        {data?.notice && (
          <div className="rounded-xl p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200">{data.notice}</div>
        )}

        <BrandSafetyBadge brandSafety={data?.brandSafety ?? null} />

        {data?.reelsShotlist && data.reelsShotlist.length > 0 && (
          <div className="space-y-2.5">
            {data.reelsShotlist.map((shot, idx) => {
              const visual = visuals[idx];
              return (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-brand-muted/10 flex gap-3">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                    style={{ backgroundColor: "#16324C", color: "#F4EEE2" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-brand-muted leading-relaxed">{shot.plan}</p>
                    {shot.texte ? (
                      <p className="font-serif italic text-sm mt-1.5 text-brand-text">&laquo; {shot.texte} &raquo;</p>
                    ) : (
                      <p className="text-[11px] italic text-brand-muted/60 mt-1.5">silencieux</p>
                    )}

                    {visual?.error && (
                      <p className="text-[11px] text-red-700 mt-2">{visual.error}</p>
                    )}

                    {visual?.url && !visual.generating && (
                      <div className="relative mt-2 w-24 rounded-lg overflow-hidden border border-brand-muted/15" style={{ aspectRatio: "9/16" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={visual.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleClearVisual(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                          title="Retirer ce visuel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setPickerIdx(idx)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-muted hover:text-brand-text transition-colors"
                      >
                        <Images className="w-3.5 h-3.5" />
                        Photothèque
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateVisual(idx, shot)}
                        disabled={visual?.generating}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-rose hover:text-brand-rose-light transition-colors disabled:opacity-50"
                      >
                        {visual?.generating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        {visual?.generating ? "Génération…" : "Générer un visuel"}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyShot(shot, idx)}
                    className="self-start text-brand-muted hover:text-brand-text shrink-0"
                    title="Copier ce plan"
                  >
                    {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pickerIdx !== null && (
        <ReelMediaPickerModal
          onClose={() => setPickerIdx(null)}
          onSelect={(media) => handleSelectMedia(pickerIdx, media)}
        />
      )}
    </main>
  );
}
