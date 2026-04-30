"use client";

import { useEffect, useState } from "react";
import {
  X,
  Heart,
  Folder,
  Trash2,
  Save,
  Instagram,
  Pin,
  ArrowLeft,
  Download,
  Package,
} from "lucide-react";
import {
  Collection,
  SocialPack,
  listCollections,
  listSocialPacks,
  updatePackCaption,
  togglePackFavorite,
  deleteSocialPack,
} from "@/lib/social-packs";
import { downloadPackAsZip, downloadSlide } from "@/lib/download-pack";

interface Props {
  open: boolean;
  onClose: () => void;
  refreshKey?: number;
}

export function LibraryDrawer({ open, onClose, refreshKey }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [packs, setPacks] = useState<SocialPack[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | "all" | "uncategorized" | null>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | "instagram" | "pinterest">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [openPack, setOpenPack] = useState<SocialPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cols, pks] = await Promise.all([
        listCollections(),
        listSocialPacks({
          collectionId:
            selectedCollection === "all" || selectedCollection === null
              ? undefined
              : selectedCollection === "uncategorized"
              ? null
              : selectedCollection.id,
          platform: platformFilter === "all" ? undefined : platformFilter,
          favoriteOnly,
        }),
      ]);
      setCollections(cols);
      setPacks(pks);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCollection, platformFilter, favoriteOnly, refreshKey]);

  if (!open) return null;

  const packCountByCollection = (collectionId: string) =>
    packs.filter((p) => p.collection_id === collectionId).length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl h-full overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {openPack && (
              <button
                onClick={() => setOpenPack(null)}
                className="text-slate-400 hover:text-slate-600"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Folder className="w-5 h-5 text-rose-500" />
              {openPack ? openPack.title || "Pack" : "Bibliothèque des publications"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!openPack && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setSelectedCollection("all")}
                className={`px-3 py-1 rounded-full border ${
                  selectedCollection === "all"
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setSelectedCollection("uncategorized")}
                className={`px-3 py-1 rounded-full border ${
                  selectedCollection === "uncategorized"
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                }`}
              >
                Sans collection
              </button>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCollection(c)}
                  className={`px-3 py-1 rounded-full border flex items-center gap-1 ${
                    typeof selectedCollection === "object" &&
                    selectedCollection !== null &&
                    selectedCollection.id === c.id
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {c.name}
                  <span className="text-[10px] opacity-70">{packCountByCollection(c.id) || ""}</span>
                </button>
              ))}
            </div>

            <div className="px-5 py-2 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-500 font-semibold">Plateforme :</span>
              {(["all", "instagram", "pinterest"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-2 py-0.5 rounded ${
                    platformFilter === p
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {p === "all" ? "Toutes" : p === "instagram" ? "Instagram" : "Pinterest"}
                </button>
              ))}
              <span className="mx-2 text-slate-300">|</span>
              <button
                onClick={() => setFavoriteOnly((v) => !v)}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                  favoriteOnly ? "bg-rose-500 text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Heart className={`w-3 h-3 ${favoriteOnly ? "fill-white" : ""}`} /> Favoris uniquement
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
              {loading && <div className="text-xs text-slate-500">Chargement…</div>}
              {!loading && packs.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-12">
                  Aucun pack pour l&apos;instant. Génère un pack et clique ❤️ &quot;Sauvegarder dans le hub&quot;.
                </div>
              )}
              {!loading && packs.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {packs.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setOpenPack(pack)}
                      className="text-left bg-white border border-slate-100 hover:border-rose-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                        {pack.image_urls[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pack.image_urls[0]} alt={pack.title || ""} className="w-full h-full object-cover" />
                        )}
                        {pack.image_urls.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {pack.image_urls.length} slides
                          </div>
                        )}
                        {pack.is_favorite && (
                          <div className="absolute top-2 left-2">
                            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-white/90 px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1">
                          {pack.platform === "instagram" ? (
                            <Instagram className="w-3 h-3" />
                          ) : (
                            <Pin className="w-3 h-3" />
                          )}
                          {pack.platform}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {pack.title || "Sans titre"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(pack.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {openPack && (
          <PackDetail
            pack={openPack}
            collections={collections}
            onChange={(patch) => setOpenPack({ ...openPack, ...patch })}
            onSaved={() => refresh()}
            onDeleted={() => {
              setOpenPack(null);
              refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

interface PackDetailProps {
  pack: SocialPack;
  collections: Collection[];
  onChange: (patch: Partial<SocialPack>) => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function PackDetail({ pack, collections, onChange, onSaved, onDeleted }: PackDetailProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const collectionForPack = collections.find((c) => c.id === pack.collection_id) || null;

  const handleDownloadAll = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadPackAsZip(pack, collectionForPack);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadOne = async (idx: number) => {
    try {
      await downloadSlide(pack, collectionForPack?.name || null, idx, pack.image_urls.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePackCaption(pack.id, {
        caption_text: pack.caption_text,
        pinterest_title: pack.pinterest_title,
        pinterest_description: pack.pinterest_description,
        pinterest_tags: pack.pinterest_tags,
        notes: pack.notes,
        title: pack.title,
        collection_id: pack.collection_id,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFav = async () => {
    try {
      await togglePackFavorite(pack.id, pack.is_favorite);
      onChange({ is_favorite: !pack.is_favorite });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSocialPack(pack);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="w-full mb-3 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Package className="w-4 h-4" />
            {downloading
              ? "Préparation du ZIP..."
              : `Télécharger pack (.zip + caption + metadata)`}
          </button>
          <div className="grid grid-cols-2 gap-2">
            {pack.image_urls.map((url, idx) => (
              <div key={idx} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`slide ${idx + 1}`}
                  className="w-full aspect-[4/5] object-cover rounded-lg shadow-sm"
                />
                <button
                  onClick={() => handleDownloadOne(idx)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`Télécharger slide ${idx + 1}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  {idx + 1}/{pack.image_urls.length}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFav}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                pack.is_favorite
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-white text-rose-500 border-rose-200"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${pack.is_favorite ? "fill-white" : ""}`} />
              {pack.is_favorite ? "Favori" : "Marquer favori"}
            </button>
            <span className="text-xs text-slate-400">{pack.platform} · {new Date(pack.created_at).toLocaleString()}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Titre</label>
            <input
              type="text"
              value={pack.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Collection</label>
            <select
              value={pack.collection_id || ""}
              onChange={(e) => onChange({ collection_id: e.target.value || null })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
            >
              <option value="">— Sans collection —</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {pack.platform === "instagram" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Caption Instagram</label>
              <textarea
                value={pack.caption_text || ""}
                onChange={(e) => onChange({ caption_text: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y"
              />
            </div>
          )}

          {pack.platform === "pinterest" && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Titre Pinterest (max 100)</label>
                <input
                  type="text"
                  value={pack.pinterest_title || ""}
                  onChange={(e) => onChange({ pinterest_title: e.target.value })}
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Description SEO (max 500)</label>
                <textarea
                  value={pack.pinterest_description || ""}
                  onChange={(e) => onChange({ pinterest_description: e.target.value })}
                  rows={5}
                  maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Tags (séparés par virgules)</label>
                <input
                  type="text"
                  value={pack.pinterest_tags.join(", ")}
                  onChange={(e) =>
                    onChange({
                      pinterest_tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase mb-1 block">Notes</label>
            <textarea
              value={pack.notes || ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-y"
            />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-rose-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Sauvegarde…" : "Enregistrer les modifications"}
            </button>
            <button
              onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 ${
                confirmDelete
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-red-200 text-red-500 hover:bg-red-50"
              }`}
            >
              <Trash2 className="w-4 h-4" /> {confirmDelete ? "Confirmer ?" : "Supprimer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
