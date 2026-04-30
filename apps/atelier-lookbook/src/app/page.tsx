"use client";

import { useState, useEffect } from "react";
import { Sparkles, Heart, Loader2, AlertCircle, FolderOpen } from "lucide-react";
import { AmbianceExtraite, Lookbook } from "@/lib/types";
import { toggleLookbookFavorite, listRecentLookbooks } from "@/lib/lookbooks-client";

interface GenerateResponse {
  ok: true;
  lookbook_id: string;
  titre: string;
  slug: string;
  tags: string[];
  ambiance_extraite: AmbianceExtraite;
  canoniques_inclus: string[];
  images: Array<{
    position: number;
    famille: string;
    url: string | null;
    canonique_injecte: string | null;
    prompt_en: string;
  }>;
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
  const [recentLookbooks, setRecentLookbooks] = useState<Lookbook[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    listRecentLookbooks(12).then(setRecentLookbooks).catch(() => undefined);
  }, [result]);

  const handleGenerate = async () => {
    if (!brief.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setIsFavorite(false);
    try {
      const res = await fetch("/api/generate-lookbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim(), count }),
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

  const handleToggleFav = async () => {
    if (!result) return;
    try {
      await toggleLookbookFavorite(result.lookbook_id, isFavorite);
      setIsFavorite(!isFavorite);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 w-full bg-white/80 backdrop-blur-md border-b border-brand-muted/10 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-rose rounded-full flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold tracking-tight text-brand-text leading-none">
                Ypersoa
              </h1>
              <p className="text-[10px] text-brand-sage uppercase tracking-widest mt-0.5 font-bold">
                Atelier Lookbook
              </p>
            </div>
          </div>
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

              <button
                onClick={handleToggleFav}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  isFavorite
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-rose-500 border-rose-200 hover:bg-rose-50"
                }`}
                title={
                  isFavorite
                    ? "Liké — ce lookbook apparaît comme décor dans Atelier Shooting"
                    : "Liker pour exposer ce lookbook comme décor dans Atelier Shooting"
                }
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-white" : ""}`} />
                {isFavorite ? "Liké (décor exposé)" : "Liker comme décor"}
              </button>
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
              {result.images.map((img) => (
                <div
                  key={img.position}
                  className="group relative aspect-[4/5] bg-white rounded-xl overflow-hidden border border-brand-muted/10 shadow-sm"
                >
                  {img.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={`Slide ${img.position}`} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase text-brand-rose">
                    {FAMILLE_LABELS[img.famille] || img.famille}
                  </div>
                  {img.canonique_injecte && (
                    <div className="absolute top-2 right-2 bg-brand-sage/90 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                      {img.canonique_injecte}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    #{img.position}
                  </div>
                </div>
              ))}
            </div>

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

        {showLibrary && recentLookbooks.length > 0 && (
          <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-brand-muted/10 p-5 overflow-y-auto z-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold">Bibliothèque</h3>
              <button onClick={() => setShowLibrary(false)} className="text-brand-muted text-sm">Fermer</button>
            </div>
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
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
