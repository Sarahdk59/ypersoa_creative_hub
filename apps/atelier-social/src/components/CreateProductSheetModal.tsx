"use client";

/**
 * Modal "Fusionner en fiche produit"
 *
 * Déclenchée depuis la vue Catalogue (/atelier-da/motifs onglet Catalogue) quand
 * 2+ shots sont sélectionnés via checkbox. Pré-remplit titre/motif/variante/produit
 * depuis le 1er shot sélectionné (ou la valeur commune si tous identiques).
 */

import { useState, useMemo } from "react";
import { X, Layers, CheckCircle2 } from "lucide-react";
import { createProductSheet, type ProductSheet } from "@/lib/product-sheets";
import type { CatalogShot } from "@/lib/catalog-shots";

interface Props {
  shots: CatalogShot[];
  motifLabelById?: Map<string, string>;
  onClose: () => void;
  onSaved: () => void;
}

function commonValue<T>(items: Array<T | null>): T | null {
  const nonNull = items.filter((v): v is T => v !== null && v !== undefined);
  if (nonNull.length === 0) return null;
  const first = nonNull[0];
  return nonNull.every((v) => v === first) ? first : null;
}

function commonArrayValues(items: Array<string[] | null>): string[] {
  if (items.length === 0) return [];
  const sets = items.map((arr) => new Set(arr ?? []));
  // Intersection : valeurs présentes dans TOUS les shots
  const first = sets[0];
  const intersection: string[] = [];
  first.forEach((v) => {
    if (sets.every((s) => s.has(v))) intersection.push(v);
  });
  return intersection;
}

export function CreateProductSheetModal({ shots, motifLabelById, onClose, onSaved }: Props) {
  // Pré-remplit depuis les shots
  const initialMotif = commonValue(shots.map((s) => s.motif_id));
  const initialVariante = commonValue(shots.map((s) => s.variante_key));
  const initialProduct = commonValue(shots.map((s) => s.product_id));
  const initialDestinataires = commonArrayValues(shots.map((s) => s.destinataire));
  const initialOccasions = commonArrayValues(shots.map((s) => s.occasion));
  const initialTags = commonArrayValues(shots.map((s) => s.tags));

  const suggestedTitle = useMemo(() => {
    const parts: string[] = [];
    if (initialMotif) parts.push(motifLabelById?.get(initialMotif) ?? initialMotif);
    if (initialVariante) parts.push(initialVariante);
    if (initialDestinataires.length > 0) parts.push("· " + initialDestinataires[0]);
    if (initialProduct) parts.push("· " + initialProduct);
    return parts.length > 0 ? parts.join(" ") : `Fiche · ${shots.length} shots`;
  }, [initialMotif, initialVariante, initialDestinataires, initialProduct, motifLabelById, shots.length]);

  const [title, setTitle] = useState(suggestedTitle);
  const [description, setDescription] = useState("");
  const [coverShotId, setCoverShotId] = useState<string>(shots[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Une fois la fiche créée, on reste sur l'écran de succès jusqu'à ce que
  // Sarah clique pour fermer — évite de re-cliquer 3 fois et créer des doublons.
  const [createdSheet, setCreatedSheet] = useState<ProductSheet | null>(null);

  const save = async () => {
    if (!title.trim()) { setError("Le titre est obligatoire"); return; }
    if (saving || createdSheet) return; // protection double-click
    setSaving(true);
    setError(null);
    try {
      const sheet = await createProductSheet({
        title: title.trim(),
        description: description.trim() || null,
        motifId: initialMotif,
        varianteKey: initialVariante,
        productId: initialProduct,
        destinataires: initialDestinataires,
        occasions: initialOccasions,
        tags: initialTags,
        shotIds: shots.map((s) => s.id),
        coverShotId: coverShotId || shots[0]?.id,
      });
      setCreatedSheet(sheet);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (createdSheet) {
    return (
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Fiche créée ✓</h2>
          <p className="text-sm text-slate-600 mb-1">
            <strong>{createdSheet.title}</strong>
          </p>
          <p className="text-xs text-slate-400 mb-6">
            {shots.length} shots rassemblés · id <code className="text-[10px]">{createdSheet.id.slice(0, 8)}…</code>
          </p>
          <p className="text-[11px] text-slate-500 italic mb-6">
            La fiche est sauvegardée en base. La vue dédiée « Fiches produit » arrive demain matin (planifié).
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-bold bg-slate-800 text-white hover:bg-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-500" /> Fusionner {shots.length} shots en fiche produit
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Titre *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              placeholder="Ex: La Déclaration · Papa · YP019"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs resize-y"
              placeholder="Notes éditoriales sur cette fiche…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <Meta label="Motif" value={initialMotif ? (motifLabelById?.get(initialMotif) ?? initialMotif) : "—"} subtle={!initialMotif} />
            <Meta label="Variante" value={initialVariante ?? "—"} subtle={!initialVariante} />
            <Meta label="Produit" value={initialProduct ?? "—"} subtle={!initialProduct} />
            <Meta label="Destinataires" value={initialDestinataires.join(", ") || "—"} subtle={initialDestinataires.length === 0} />
            <Meta label="Occasions" value={initialOccasions.join(", ") || "—"} subtle={initialOccasions.length === 0} />
            <Meta label="Tags" value={initialTags.join(", ") || "—"} subtle={initialTags.length === 0} />
          </div>
          <p className="text-[10px] text-slate-400 italic">
            Les valeurs ci-dessus sont l'<strong>intersection</strong> des tags des {shots.length} shots sélectionnés (ce qu'ils ont en commun). Tu pourras éditer la fiche plus tard pour ajouter d'autres tags.
          </p>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Cover (image principale de la fiche)</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {shots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCoverShotId(s.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    coverShotId === s.id ? "border-rose-500" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image_url} alt={s.shot_label ?? ""} className="w-full h-full object-cover" />
                  {coverShotId === s.id && (
                    <span className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] px-1.5 rounded font-bold">COVER</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700">
              Annuler
            </button>
            <div className="flex-1" />
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="px-5 py-2 rounded-full text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Création…" : `Créer la fiche (${shots.length} shots)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
      <p className={`text-[12px] ${subtle ? "italic text-slate-400" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}
