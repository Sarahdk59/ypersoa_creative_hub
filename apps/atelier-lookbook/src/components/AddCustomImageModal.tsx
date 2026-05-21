"use client";

/**
 * Modal "+ Ajouter une image" dans le lookbook.
 *
 * 3 modes :
 *  - "Catalogue" : pioche dans catalog_shots Supabase (shoots Atelier Shooting +
 *    slides Atelier Social rangées via le bouton 📁). Permet de filtrer par
 *    destinataire/occasion.
 *  - "Motif macro" : pioche dans les PNG macro brodés du référentiel motifs
 *    (via /api/da/referentiels côté atelier-social, prod_files).
 *  - "URL libre" : input URL → import direct (pour n'importe quelle source web).
 *
 * Tous les modes appellent au final POST /api/add-custom-image avec source_url
 * + famille.
 */

import { useEffect, useState } from "react";
import { Loader2, X, Plus, Camera, Sparkles, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ImageFamille } from "@/lib/types";

const SOCIAL_API = process.env.NEXT_PUBLIC_SOCIAL_URL ?? "http://localhost:3000";

interface CatalogShot {
  id: string;
  image_url: string;
  shot_label: string | null;
  product_id: string | null;
  motif_id: string | null;
  variante_key: string | null;
  destinataire: string[] | null;
  occasion: string[] | null;
}

interface MotifProdPng {
  motif_id: string;
  motif_nom: string;
  key: string;
  png_url: string;
}

interface Props {
  lookbookId: string;
  /**
   * Palette hex du lookbook (ambiance_extraite.palette). Fournie par le parent
   * pour activer le toggle "Adapter à la palette du lookbook" — quand coché,
   * Gemini régénère l'image source en imposant cette palette + le fil canonique
   * le plus proche en couleur.
   */
  lookbookPalette?: string[];
  onClose: () => void;
  onAdded: () => void;
}

type Tab = "catalogue" | "macro" | "url";

export function AddCustomImageModal({ lookbookId, lookbookPalette, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>("catalogue");
  const [shots, setShots] = useState<CatalogShot[]>([]);
  const [macros, setMacros] = useState<MotifProdPng[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [famille, setFamille] = useState<ImageFamille>("atmosphere");
  // Activé par défaut quand la palette est dispo (sauf URL libre où on garde brut)
  const [recolor, setRecolor] = useState<boolean>(Boolean(lookbookPalette && lookbookPalette.length > 0));

  // Lazy load tab content
  useEffect(() => {
    if (tab === "catalogue" && shots.length === 0 && supabase) {
      setLoading(true);
      supabase
        .from("catalog_shots")
        .select("id, image_url, shot_label, product_id, motif_id, variante_key, destinataire, occasion")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data, error }) => {
          if (error) setError(`Catalogue : ${error.message}`);
          else setShots((data ?? []) as CatalogShot[]);
          setLoading(false);
        });
    }
    if (tab === "macro" && macros.length === 0) {
      setLoading(true);
      fetch(`${SOCIAL_API}/api/da/referentiels`, { cache: "no-store" })
        .then((r) => r.json())
        .then((res) => {
          if (!res.ok) throw new Error(res.error);
          const list: MotifProdPng[] = [];
          for (const m of res.data.motifs.motifs) {
            for (const p of (m.prod_files ?? [])) {
              if (p.png) {
                list.push({
                  motif_id: m.id,
                  motif_nom: m.nom_commercial,
                  key: p.key,
                  png_url: `${SOCIAL_API}/api/da/motifs/${encodeURIComponent(m.id)}/preview?key=${encodeURIComponent(p.key)}`,
                });
              }
            }
          }
          setMacros(list);
        })
        .catch((e) => setError(`Motifs macro : ${e instanceof Error ? e.message : String(e)}`))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const add = async (sourceUrl: string, label: string) => {
    setBusy(sourceUrl);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        lookbook_id: lookbookId,
        source_url: sourceUrl,
        famille,
        label,
      };
      // Mode recolor : on demande à Gemini d'adapter l'image à la palette du
      // lookbook + fil canonique le plus proche. Plus long (~10-20s) mais
      // donne une cohérence visuelle avec le reste du lookbook.
      if (recolor && lookbookPalette && lookbookPalette.length > 0) {
        payload.recolor = true;
        payload.palette_hex = lookbookPalette;
      }
      const res = await fetch("/api/add-custom-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-rose-500" /> Ajouter une image au lookbook
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-xs flex-wrap">
          {(["catalogue", "macro", "url"] as const).map((t) => {
            const icons = { catalogue: <Camera className="w-3.5 h-3.5" />, macro: <Sparkles className="w-3.5 h-3.5" />, url: <Globe className="w-3.5 h-3.5" /> };
            const labels = { catalogue: "Depuis le catalogue", macro: "Motif brodé (macro)", url: "URL libre" };
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold transition-all ${
                  tab === t ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {icons[t]} {labels[t]}
              </button>
            );
          })}
          <span className="ml-auto flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Famille :</span>
            <select
              value={famille}
              onChange={(e) => setFamille(e.target.value as ImageFamille)}
              className="px-2 py-1 rounded border border-slate-200 text-[11px]"
            >
              <option value="canonique_humain">Canonique humain</option>
              <option value="scene_large">Scène large</option>
              <option value="texture_detail">Texture / détail</option>
              <option value="objet_prop">Objet / prop</option>
              <option value="atmosphere">Atmosphère</option>
            </select>
          </span>
        </div>

        {lookbookPalette && lookbookPalette.length > 0 && (
          <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recolor}
                onChange={(e) => setRecolor(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="font-semibold text-slate-700">🎨 Adapter à la palette du lookbook</span>
              <span className="text-slate-500">— Gemini régénère dans ces tons + fil canonique le plus proche</span>
            </label>
            <div className="flex gap-1 ml-2">
              {lookbookPalette.map((hex) => (
                <span
                  key={hex}
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
            {recolor && <span className="text-[10px] text-slate-400 ml-auto">⏱ ~15s de plus / image</span>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}
          {loading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></div>}

          {tab === "catalogue" && !loading && (
            shots.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                Aucun shot dans le catalogue. Range des shoots côté Atelier Shooting (📁 sous l&apos;image).
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {shots.map((s) => {
                  const tagText = [...(s.destinataire ?? []), ...(s.occasion ?? [])].slice(0, 2).join(" · ");
                  return (
                    <button
                      key={s.id}
                      onClick={() => add(s.image_url, s.shot_label ?? "Catalogue shot")}
                      disabled={busy === s.image_url}
                      className="relative aspect-[4/5] rounded-lg overflow-hidden border border-slate-200 hover:border-rose-400 hover:scale-[1.02] transition-all bg-slate-50 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image_url} alt={s.shot_label ?? ""} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        {busy === s.image_url ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                      {s.product_id && (
                        <span className="absolute top-1 left-1 text-[8px] font-bold bg-white/90 text-slate-700 px-1 rounded">
                          {s.product_id}
                        </span>
                      )}
                      {tagText && (
                        <span className="absolute bottom-1 left-1 right-1 text-[8.5px] bg-black/60 text-white px-1 py-0.5 rounded truncate text-center">
                          {tagText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          {tab === "macro" && !loading && (
            macros.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Aucun PNG macro disponible côté motifs prod.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {macros.map((m) => (
                  <button
                    key={`${m.motif_id}-${m.key}`}
                    onClick={() => add(m.png_url, `${m.motif_nom} · ${m.key}`)}
                    disabled={busy === m.png_url}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-rose-400 hover:scale-[1.02] transition-all bg-slate-50 group p-2"
                    title={`${m.motif_nom} · ${m.key}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.png_url} alt={m.key} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      {busy === m.png_url ? <Loader2 className="w-5 h-5 text-rose-500 animate-spin" /> : null}
                    </div>
                    <span className="absolute bottom-0 inset-x-0 text-[8.5px] bg-black/60 text-white px-1 py-0.5 truncate text-center">
                      {m.motif_id} · {m.key}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}

          {tab === "url" && (
            <div className="max-w-lg mx-auto py-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                URL de l&apos;image à importer
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <button
                onClick={() => urlInput.trim() && add(urlInput.trim(), "Import URL")}
                disabled={!urlInput.trim() || busy !== null}
                className="mt-3 w-full py-2 rounded-full bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Importer l'image"}
              </button>
              <p className="mt-3 text-[11px] text-slate-500 italic">
                L&apos;image sera téléchargée puis réuploadée dans le bucket lookbook-images.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
