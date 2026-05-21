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
  Layers,
} from "lucide-react";
import { AddToCatalogModal } from "@/components/AddToCatalogModal";
import {
  Collection,
  SocialPack,
  listCollections,
  listSocialPacks,
  updatePackCaption,
  togglePackFavorite,
  deleteSocialPack,
  deleteSlideFromPack,
} from "@/lib/social-packs";
import { downloadPackAsZip, downloadSlide } from "@/lib/download-pack";

const HOOK_LABELS_FR: Record<string, string> = {
  emotion: "Émotion",
  question: "Question",
  pov: "POV",
  humour: "Humour",
  affirmation: "Affirmation",
};

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
  // Recherche transverse multi-champs : matche YPM-008, "chouchou", "père",
  // "mariage", "papa"… sur title/caption/hooks/occasion/canonique/pinterest_tags.
  // Tokens séparés par espace = AND logique (ex: "chouchou papa" → packs qui ont
  // les 2 termes quelque part).
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filtre transverse : tokenise sur espace, AND logique sur tous les champs
  // texte d'un pack (title, caption_text, caption_hooks values, occasion_id,
  // canonique_ids, pinterest_title, pinterest_description, pinterest_tags,
  // custom_prompt, notes). Match Insensitive (toLowerCase).
  const filteredPacks = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packs;
    const tokens = q.split(/\s+/).filter(Boolean);
    return packs.filter((p) => {
      const haystack = [
        p.title ?? "",
        p.caption_text ?? "",
        ...(p.caption_hooks ? Object.values(p.caption_hooks) : []),
        p.pinterest_title ?? "",
        p.pinterest_description ?? "",
        ...(p.pinterest_tags ?? []),
        p.occasion_id ?? "",
        p.vibe_id ?? "",
        ...(p.canonique_ids ?? []),
        p.custom_prompt ?? "",
        p.notes ?? "",
      ].join("  ").toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  })();

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
              <span className="mx-2 text-slate-300">|</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher : YPM-008, chouchou, papa, mariage…"
                className="flex-1 min-w-[200px] px-3 py-1 rounded-full border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 text-[11px] underline"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error && <div className="text-xs text-red-600 mb-3">{error}</div>}
              {loading && <div className="text-xs text-slate-500">Chargement…</div>}
              {!loading && packs.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-12">
                  Aucun pack pour l&apos;instant. Génère un pack et clique ❤️ &quot;Sauvegarder dans le hub&quot;.
                </div>
              )}
              {!loading && packs.length > 0 && filteredPacks.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-12">
                  Aucun pack ne correspond à <strong>« {searchQuery} »</strong>.{" "}
                  <button onClick={() => setSearchQuery("")} className="text-rose-500 hover:underline">
                    Effacer la recherche
                  </button>
                </div>
              )}
              {!loading && filteredPacks.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPacks.map((pack) => (
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
  // Cible de la modal "Ranger dans catalogue" — null = fermée, sinon { url, idx } de la slide cliquée.
  const [catalogTarget, setCatalogTarget] = useState<{ url: string; idx: number } | null>(null);

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

  const handleDeleteSlide = async (idx: number) => {
    if (!confirm(`Supprimer la slide ${idx + 1}/${pack.image_urls.length} ? Cette action est irréversible.`)) return;
    try {
      const updated = await deleteSlideFromPack(pack, idx);
      onChange({ image_urls: updated.image_urls, image_storage_paths: updated.image_storage_paths });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopyHook = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => undefined);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePackCaption(pack.id, {
        caption_text: pack.caption_text,
        caption_hooks: pack.caption_hooks,
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
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownloadOne(idx)}
                    className="bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-md"
                    title={`Télécharger slide ${idx + 1}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCatalogTarget({ url, idx })}
                    className="bg-white/90 hover:bg-slate-800 hover:text-white text-slate-700 p-1.5 rounded-full shadow-md transition-colors"
                    title="Ranger dans le catalogue motif"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSlide(idx)}
                    className="bg-white/90 hover:bg-red-500 hover:text-white text-slate-700 p-1.5 rounded-full shadow-md transition-colors"
                    title={`Supprimer cette slide`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
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

          {pack.caption_hooks && Object.keys(pack.caption_hooks).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-2 block">
                Hooks alternatifs
              </label>
              <div className="space-y-2">
                {Object.entries(pack.caption_hooks).map(([registre, hook]) => (
                  <div
                    key={registre}
                    className="flex items-start gap-2 p-2 bg-rose-50/50 border border-rose-100 rounded-lg group"
                  >
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider px-2 py-0.5 bg-white rounded-full border border-rose-200 shrink-0">
                      {HOOK_LABELS_FR[registre] || registre}
                    </span>
                    <textarea
                      value={hook}
                      onChange={(e) =>
                        onChange({
                          caption_hooks: { ...(pack.caption_hooks || {}), [registre]: e.target.value },
                        })
                      }
                      rows={1}
                      className="flex-1 text-xs bg-transparent border-none focus:outline-none resize-none text-slate-700"
                    />
                    <button
                      onClick={() => handleCopyHook(hook)}
                      className="text-[10px] text-rose-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Copier dans le presse-papiers"
                    >
                      Copier
                    </button>
                  </div>
                ))}
              </div>
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

      {catalogTarget && (
        <AddToCatalogModal
          imageUrl={catalogTarget.url}
          shotLabel={`${pack.title ?? "Pack"} · slide ${catalogTarget.idx + 1}/${pack.image_urls.length}`}
          onClose={() => setCatalogTarget(null)}
          onSaved={() => { /* no-op : la lib catalog est lue depuis /atelier-da/motifs */ }}
        />
      )}
    </div>
  );
}
