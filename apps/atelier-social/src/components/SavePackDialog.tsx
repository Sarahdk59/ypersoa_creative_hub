"use client";

import { useEffect, useState } from "react";
import { X, FolderPlus, Heart, Check } from "lucide-react";
import {
  Collection,
  listCollections,
  createCollection,
  saveSocialPack,
  SaveSocialPackInput,
} from "@/lib/social-packs";

interface Props {
  open: boolean;
  onClose: () => void;
  payload: Omit<SaveSocialPackInput, "collectionId" | "title" | "notes"> & {
    suggestedTitle: string;
  };
  onSaved: (packId: string) => void;
}

export function SavePackDialog({ open, onClose, payload, onSaved }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [creatingNewCollection, setCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(payload.suggestedTitle);
    setNotes("");
    setError(null);
    setCreatingNewCollection(false);
    listCollections()
      .then(setCollections)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [open, payload.suggestedTitle]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const created = await createCollection(newCollectionName, newCollectionDesc);
      setCollections((prev) => [created, ...prev]);
      setCollectionId(created.id);
      setCreatingNewCollection(false);
      setNewCollectionName("");
      setNewCollectionDesc("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const pack = await saveSocialPack({
        ...payload,
        collectionId,
        title: title.trim() || payload.suggestedTitle,
        notes: notes.trim() || null,
      });
      onSaved(pack.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            Sauvegarder dans le hub
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Titre du pack
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
              placeholder="ex: Caption Maman Mai 2026"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Collection (dossier)
              </label>
              {!creatingNewCollection && (
                <button
                  onClick={() => setCreatingNewCollection(true)}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="w-3 h-3" /> Nouvelle
                </button>
              )}
            </div>

            {creatingNewCollection ? (
              <div className="space-y-2 p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Nom (ex: Fête des Mères 2026, YPM002, Ambre)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-200"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="Description (optionnel)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className="flex-1 bg-rose-500 text-white text-xs font-semibold py-1.5 rounded-md disabled:opacity-50 hover:bg-rose-600"
                  >
                    Créer
                  </button>
                  <button
                    onClick={() => {
                      setCreatingNewCollection(false);
                      setNewCollectionName("");
                    }}
                    className="text-xs text-slate-500 px-3"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={collectionId ?? ""}
                onChange={(e) => setCollectionId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <option value="">— Sans collection —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
              placeholder="Une note pour retrouver ce pack plus tard…"
            />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-semibold text-slate-600 hover:text-slate-800 py-2"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || creatingNewCollection}
            className="flex-1 bg-rose-500 text-white text-sm font-semibold py-2 rounded-lg hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>Sauvegarde…</>
            ) : (
              <>
                <Check className="w-4 h-4" /> Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
