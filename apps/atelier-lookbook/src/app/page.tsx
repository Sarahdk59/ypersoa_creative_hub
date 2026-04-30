"use client";

import { useState, useEffect } from "react";
import { Sparkles, Heart, Loader2, AlertCircle, FolderOpen, Download, Package, X, FolderOutput } from "lucide-react";
import { AmbianceExtraite, Lookbook } from "@/lib/types";
import { setLookbookActiveAmbiance, listRecentLookbooks, getLookbookFull, isAmbianceActive, extendLookbookAmbiance } from "@/lib/lookbooks-client";
import { setImageValide, deleteLookbookImage } from "@/lib/images-client";
import { downloadSingleImage, downloadLookbookAsZip, buildImageFilename } from "@/lib/download";
import { CastingPicker, CastingMode } from "@/components/CastingPicker";

interface ResponseImage {
  image_id?: string;
  storage_path?: string;
  position: number;
  famille: string;
  url: string | null;
  canonique_injecte: string | null;
  prompt_en: string;
  valide: boolean;
}

interface GenerateResponse {
  ok: true;
  lookbook_id: string;
  titre: string;
  slug: string;
  tags: string[];
  ambiance_extraite: AmbianceExtraite;
  canoniques_inclus: string[];
  images: ResponseImage[];
  stats: { requested: number; succeeded: number; failed: number };
  llm_model_used: string;
  duration_ms: number;
}

const FAMILLE_LABELS: Record<string, string> = {
  canonique_humain: "Canonique humain",
  scene_large: "Scène large",
  texture_detail: "Texture / détail",
  objet_prop: "Objet / prop",
  atmosphere: "Atmosphère",
};

export default function Home() {
  const [brief, setBrief] = useState("");
  const [count, setCount] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ambianceArchivageDate, setAmbianceArchivageDate] = useState<string | null>(null);
  const [recentLookbooks, setRecentLookbooks] = useState<Lookbook[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [castingMode, setCastingMode] = useState<CastingMode>("auto");
  const [pinnedCanoniques, setPinnedCanoniques] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [zippingId, setZippingId] = useState<string | null>(null);

  useEffect(() => {
    listRecentLookbooks(12).then(setRecentLookbooks).catch(() => undefined);
  }, [result]);

  const handleGenerate = async () => {
    if (!brief.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setIsFavorite(false);
    setSelectedImageIds(new Set());
    try {
      const res = await fetch("/api/generate-lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim(),
          count,
          pinned_canoniques: castingMode === "pin" ? pinnedCanoniques : [],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Génération échouée");
      setResult(data as GenerateResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const toggleImageSelected = (imageId: string | undefined) => {
    if (!imageId) return;
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const handleReopenLookbook = async (id: string) => {
    setReopeningId(id);
    setError(null);
    try {
      const { lookbook, images } = await getLookbookFull(id);
      const reconstructed: GenerateResponse = {
        ok: true,
        lookbook_id: lookbook.id,
        titre: lookbook.titre,
        slug: lookbook.slug,
        tags: lookbook.tags,
        ambiance_extraite: lookbook.ambiance_extraite as AmbianceExtraite,
        canoniques_inclus: lookbook.canoniques_inclus,
        images: images.map((img) => ({
          image_id: img.id,
          storage_path: img.image_storage_path || undefined,
          position: img.position,
          famille: img.famille,
          url: img.image_url,
          canonique_injecte: img.canonique_injecte,
          prompt_en: img.prompt_en,
          valide: img.valide,
        })),
        stats: {
          requested: images.length,
          succeeded: images.filter((i) => i.image_url).length,
          failed: images.filter((i) => !i.image_url).length,
        },
        llm_model_used: lookbook.llm_model_used || "—",
        duration_ms: 0,
      };
      setBrief(lookbook.brief_original);
      setIsFavorite(isAmbianceActive(lookbook));
      setAmbianceArchivageDate(
        isAmbianceActive(lookbook) ? lookbook.date_archivage : null
      );
      setResult(reconstructed);
      setSelectedImageIds(new Set());
      setShowLibrary(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReopeningId(null);
    }
  };

  const handleDownloadFromLibrary = async (id: string) => {
    setZippingId(id);
    setError(null);
    try {
      const { lookbook, images } = await getLookbookFull(id);
      await downloadLookbookAsZip({
        titre: lookbook.titre,
        slug: lookbook.slug,
        brief: lookbook.brief_original,
        tags: lookbook.tags,
        ambiance: lookbook.ambiance_extraite as AmbianceExtraite | null,
        canoniquesInclus: lookbook.canoniques_inclus,
        llmModelUsed: lookbook.llm_model_used || "—",
        images: images.map((img) => ({
          position: img.position,
          famille: img.famille,
          url: img.image_url,
          canonique_injecte: img.canonique_injecte,
          prompt_en: img.prompt_en,
          valide: img.valide,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setZippingId(null);
    }
  };

  const handleToggleFav = async () => {
    if (!result) return;
    try {
      const next = await setLookbookActiveAmbiance(result.lookbook_id, !isFavorite);
      setIsFavorite(next.isActive);
      setAmbianceArchivageDate(next.dateArchivage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const formatActiveUntil = (iso: string | null): string => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const handleExtendAmbiance = async () => {
    if (!result || !isFavorite) return;
    try {
      const next = await extendLookbookAmbiance(result.lookbook_id);
      setAmbianceArchivageDate(next.dateArchivage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleImageValide = async (img: ResponseImage) => {
    if (!result || !img.image_id) return;
    const newVal = !img.valide;
    try {
      await setImageValide(img.image_id, newVal);
      setResult({
        ...result,
        images: result.images.map((i) =>
          i.image_id === img.image_id ? { ...i, valide: newVal } : i
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteImage = async (img: ResponseImage) => {
    if (!result || !img.image_id) return;
    if (!confirm(`Supprimer la slide #${img.position} ? Cette action est irréversible.`)) return;
    try {
      await deleteLookbookImage(img.image_id, img.storage_path || null);
      setResult({
        ...result,
        images: result.images.filter((i) => i.image_id !== img.image_id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDownloadOne = async (img: ResponseImage) => {
    if (!result || !img.url) return;
    const fn = buildImageFilename(result.slug, img.position, result.images.length, img.famille);
    try {
      await downloadSingleImage(img.url, fn);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownloadZip = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadLookbookAsZip({
        titre: result.titre,
        slug: result.slug,
        brief,
        tags: result.tags,
        ambiance: result.ambiance_extraite,
        canoniquesInclus: result.canoniques_inclus,
        llmModelUsed: result.llm_model_used,
        images: result.images,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSelection = async () => {
    if (!result || selectedImageIds.size === 0) return;
    setDownloading(true);
    try {
      const subset = result.images.filter((i) => i.image_id && selectedImageIds.has(i.image_id));
      await downloadLookbookAsZip({
        titre: `${result.titre} (sélection)`,
        slug: `${result.slug}-selection-${subset.length}`,
        brief,
        tags: result.tags,
        ambiance: result.ambiance_extraite,
        canoniquesInclus: result.canoniques_inclus,
        llmModelUsed: result.llm_model_used,
        images: subset,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#1E2D4A",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Atelier Lookbook
          </h1>
          <button
            onClick={() => setShowLibrary((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-rose hover:bg-brand-rose/10 px-3 py-1.5 rounded-full border border-brand-rose/20"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Bibliothèque ({recentLookbooks.length})
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {!result && !generating && (
          <section className="max-w-2xl mx-auto mt-12">
            <h2 className="font-serif text-3xl font-medium text-brand-text mb-2">
              Quel est ton brief ?
            </h2>
            <p className="text-brand-muted text-sm mb-6">
              Tape un brief poétique court — l&apos;IA décompose ton intention en 12-20 visuels d&apos;ambiance saisonnière Ypersoa.
            </p>

            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="ex: Vacances à Porto Vecchio • Rouge amour passion • Nuit à Londres • Saint-Valentin Dimanche matin"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-brand-muted/20 bg-white focus:outline-none focus:ring-2 focus:ring-brand-rose/30 resize-none text-base"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-brand-muted">{brief.length}/200</span>
              <div className="flex items-center gap-2 text-xs text-brand-muted">
                <span>Nombre d&apos;images :</span>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="px-2 py-1 border border-brand-muted/20 rounded-md bg-white text-xs"
                >
                  <option value={4}>4 (preview rapide)</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={20}>20 (full)</option>
                </select>
              </div>
            </div>

            <CastingPicker
              mode={castingMode}
              pinnedIds={pinnedCanoniques}
              onModeChange={setCastingMode}
              onPinnedChange={setPinnedCanoniques}
            />

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!brief.trim() || generating}
              className="primary-button w-full mt-6 flex items-center justify-center gap-2 text-sm py-3"
            >
              <Sparkles className="w-4 h-4" />
              Générer le lookbook ({count} images)
            </button>
            <p className="text-[11px] text-brand-muted text-center mt-2">
              ~{Math.round(count * 0.3)}-{Math.round(count * 0.6)} min selon la charge Gemini.
            </p>
          </section>
        )}

        {generating && (
          <section className="max-w-2xl mx-auto mt-12 text-center">
            <Loader2 className="w-10 h-10 text-brand-rose animate-spin mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-medium mb-2">Génération en cours…</h2>
            <p className="text-brand-muted text-sm">
              Étape 1/2 : décomposition du brief par GPT.
              <br />Étape 2/2 : Gemini génère les {count} images en parallèle.
            </p>
            <p className="text-xs text-brand-muted mt-4 italic">
              Brief : « {brief} »
            </p>
          </section>
        )}

        {result && (
          <section>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-serif text-3xl font-medium text-brand-text">
                  {result.titre}
                </h2>
                <p className="text-brand-muted text-sm mt-1 italic">« {brief} »</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {result.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-wider bg-brand-sage/10 text-brand-sage px-2 py-0.5 rounded-full font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-brand-muted mt-2">
                  {result.stats.succeeded}/{result.stats.requested} images · modèle {result.llm_model_used} · {Math.round(result.duration_ms / 1000)}s
                </p>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={handleToggleFav}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    isFavorite
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-white text-rose-500 border-rose-200 hover:bg-rose-50"
                  }`}
                  title={
                    isFavorite
                      ? "Cliquer pour désactiver — ce lookbook est ambiance de référence dans Shooting & Social"
                      : "Activer cette ambiance comme référence pendant 7 jours dans Shooting & Social"
                  }
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-white" : ""}`} />
                  {isFavorite
                    ? `Active${ambianceArchivageDate ? ` jusqu'au ${formatActiveUntil(ambianceArchivageDate)}` : ""}`
                    : "Activer ambiance (7j)"}
                </button>
                {isFavorite && (
                  <button
                    onClick={handleExtendAmbiance}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                    title="Prolonger l'activation de 7 jours supplémentaires"
                  >
                    +7j
                  </button>
                )}
                <button
                  onClick={handleDownloadZip}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-brand-rose/20 bg-white text-brand-rose hover:bg-brand-rose/5 disabled:opacity-50"
                  title="Télécharger le lookbook complet (.zip avec images, ambiance, lookbook.html)"
                >
                  <Package className="w-4 h-4" />
                  {downloading ? "Préparation..." : "Télécharger lookbook (.zip)"}
                </button>
              </div>
            </div>

            {result.ambiance_extraite && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-5 bg-white rounded-2xl border border-brand-muted/10">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Palette</h3>
                  <div className="flex gap-2">
                    {result.ambiance_extraite.palette.map((hex) => (
                      <div key={hex} className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-full shadow-sm border border-black/5"
                          style={{ backgroundColor: hex }}
                        />
                        <span className="text-[9px] text-brand-muted font-mono">{hex}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Lieux</h3>
                  <p className="text-sm text-brand-text">{result.ambiance_extraite.lieux.join(" · ")}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Lumière</h3>
                  <p className="text-sm text-brand-text">{result.ambiance_extraite.lumiere}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Grain</h3>
                  <p className="text-sm text-brand-text">{result.ambiance_extraite.grain}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Props</h3>
                  <p className="text-sm text-brand-text">{result.ambiance_extraite.props.join(" · ")}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-2">Postures</h3>
                  <p className="text-sm text-brand-text">{result.ambiance_extraite.postures}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {result.images.map((img) => {
                const isSelected = img.image_id ? selectedImageIds.has(img.image_id) : false;
                return (
                <div
                  key={img.image_id || img.position}
                  className={`group relative aspect-[4/5] bg-white rounded-xl overflow-hidden border-2 shadow-sm ${
                    isSelected
                      ? "border-brand-rose ring-2 ring-brand-rose/30"
                      : img.valide
                      ? "border-rose-500"
                      : "border-brand-muted/10"
                  }`}
                >
                  {img.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={`Slide ${img.position}`} className="w-full h-full object-cover" />
                  )}
                  {/* Checkbox sélection (toujours visible) */}
                  {img.image_id && (
                    <label
                      className="absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 bg-white/95 rounded-full shadow cursor-pointer hover:scale-110 transition-transform"
                      title={isSelected ? "Désélectionner" : "Sélectionner pour télécharger"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleImageSelected(img.image_id)}
                        className="sr-only"
                      />
                      <span
                        className={`block w-3.5 h-3.5 rounded-sm border-2 ${
                          isSelected
                            ? "bg-brand-rose border-brand-rose"
                            : "border-brand-muted/40"
                        }`}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 12 12" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M2.5 6.5L5 9L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </label>
                  )}
                  <div className="absolute top-2 left-10 flex flex-col gap-1">
                    <div className="bg-white/90 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-brand-rose">
                      {FAMILLE_LABELS[img.famille] || img.famille}
                    </div>
                    {img.valide && (
                      <div className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1">
                        <Heart className="w-2.5 h-2.5 fill-white" /> Validée
                      </div>
                    )}
                  </div>
                  {img.canonique_injecte && (
                    <div className="absolute top-2 right-2 bg-brand-sage/90 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                      {img.canonique_injecte}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    #{img.position}
                  </div>

                  {/* Actions au survol : ❤️ valider, ⬇ télécharger, ✕ supprimer */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleToggleImageValide(img)}
                      className={`p-2 rounded-full shadow-lg hover:scale-110 transition-all ${
                        img.valide
                          ? "bg-rose-500 text-white"
                          : "bg-white/95 text-rose-500"
                      }`}
                      title={img.valide ? "Retirer la validation" : "Valider cette image"}
                    >
                      <Heart className={`w-4 h-4 ${img.valide ? "fill-white" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleDownloadOne(img)}
                      className="p-2 rounded-full shadow-lg bg-white/95 text-brand-text hover:scale-110 transition-all"
                      title="Télécharger cette image"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(img)}
                      className="p-2 rounded-full shadow-lg bg-white/95 text-slate-600 hover:bg-red-500 hover:text-white hover:scale-110 transition-all"
                      title="Supprimer cette image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>

            {selectedImageIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-brand-text text-white rounded-full shadow-2xl px-5 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                <span className="text-sm font-semibold">
                  {selectedImageIds.size} image{selectedImageIds.size > 1 ? "s" : ""} sélectionnée{selectedImageIds.size > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setSelectedImageIds(new Set())}
                  className="text-xs text-white/70 hover:text-white"
                >
                  Tout désélectionner
                </button>
                <button
                  onClick={handleDownloadSelection}
                  disabled={downloading}
                  className="flex items-center gap-1.5 bg-brand-rose hover:bg-brand-rose/90 px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50"
                >
                  <Package className="w-3.5 h-3.5" />
                  {downloading ? "Préparation..." : "Télécharger sélection (.zip)"}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setResult(null);
                setBrief("");
                setIsFavorite(false);
              }}
              className="mt-8 text-sm font-semibold text-brand-rose hover:underline"
            >
              ← Nouveau lookbook
            </button>
          </section>
        )}

        {showLibrary && (
          <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-brand-muted/10 p-5 overflow-y-auto z-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">Bibliothèque</h3>
              <button onClick={() => setShowLibrary(false)} className="text-brand-muted text-sm">Fermer</button>
            </div>
            {recentLookbooks.length === 0 ? (
              <p className="text-xs text-brand-muted italic">Aucun lookbook encore. Génère ton premier brief.</p>
            ) : (
              <div className="space-y-3">
                {recentLookbooks.map((lb) => (
                  <div key={lb.id} className="p-3 rounded-lg border border-brand-muted/10 bg-brand-bg/50">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-brand-text">{lb.titre}</h4>
                      {lb.is_favorite && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-brand-muted mt-1 italic line-clamp-2">« {lb.brief_original} »</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lb.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] uppercase bg-brand-sage/10 text-brand-sage px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-[9px] text-brand-muted mt-1">
                      {new Date(lb.created_at).toLocaleString("fr-FR")} · {lb.statut}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleReopenLookbook(lb.id)}
                        disabled={reopeningId === lb.id}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold bg-white border border-brand-rose/30 text-brand-rose hover:bg-brand-rose/5 disabled:opacity-50"
                      >
                        {reopeningId === lb.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FolderOutput className="w-3 h-3" />
                        )}
                        Rouvrir
                      </button>
                      <button
                        onClick={() => handleDownloadFromLibrary(lb.id)}
                        disabled={zippingId === lb.id}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold bg-brand-rose text-white hover:bg-brand-rose/90 disabled:opacity-50"
                      >
                        {zippingId === lb.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Package className="w-3 h-3" />
                        )}
                        .zip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
