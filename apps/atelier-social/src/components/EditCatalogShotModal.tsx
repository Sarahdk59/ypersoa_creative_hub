"use client";

/**
 * Modal d'édition d'un shot du catalogue.
 *
 * Préremplie avec les tags actuels du shot (destinataires, occasions, produit,
 * motif, variante). Save → updateCatalogShot. Bouton "Supprimer le shot" pour
 * delete complet (avec confirm).
 *
 * Utilisée depuis la vue Catalogue (/atelier-da/motifs → onglet Catalogue) au
 * survol d'une thumbnail.
 */

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { updateCatalogShot, deleteCatalogShot, type CatalogShot } from "@/lib/catalog-shots";

const DESTINATAIRES = [
  "papa", "maman", "mamie", "papy", "parrain", "marraine", "témoins",
  "frère", "sœur", "tonton", "tata", "amis", "couple", "bébé", "enfant",
  "nounou", "maîtresse",
];

const OCCASIONS = [
  "anniversaire", "mariage", "naissance", "fête des mères", "fête des pères",
  "déclaration", "transmission", "intemporel", "noël", "saint-valentin", "rentrée scolaire", "lifestyle",
];

const PRODUITS = ["YP001", "YP005", "YP019", "YP021", "YP004"];

interface Motif {
  id: string;
  nom_commercial: string;
  variantes?: Array<{ file: string; label: string }>;
}

interface Props {
  shot: CatalogShot;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditCatalogShotModal({ shot, onClose, onSaved, onDeleted }: Props) {
  const [destinataires, setDestinataires] = useState<Set<string>>(new Set(shot.destinataire ?? []));
  const [occasions, setOccasions] = useState<Set<string>>(new Set(shot.occasion ?? []));
  const [tagsSet, setTagsSet] = useState<Set<string>>(new Set(shot.tags ?? []));
  const [tagInput, setTagInput] = useState("");
  const [productId, setProductId] = useState<string | null>(shot.product_id);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifId, setMotifId] = useState<string | null>(shot.motif_id);
  const [varianteKey, setVarianteKey] = useState<string | null>(shot.variante_key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setMotifs(res.data.motifs.motifs); })
      .catch(() => {});
  }, []);

  const selectedMotif = motifs.find((m) => m.id === motifId);
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v) return;
    setTagsSet((prev) => new Set(prev).add(v));
    setTagInput("");
  };
  const removeTag = (t: string) => {
    setTagsSet((prev) => {
      const next = new Set(prev);
      next.delete(t);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateCatalogShot(shot.id, {
        destinataires: [...destinataires],
        occasions: [...occasions],
        tags: [...tagsSet],
        product_id: productId,
        motif_id: motifId,
        variante_key: varianteKey,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer définitivement ce shot du catalogue ?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteCatalogShot(shot);
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-auto">
        <div className="grid grid-cols-[260px_1fr]">
          <div className="bg-slate-50 p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.image_url} alt={shot.shot_label ?? "shot"} className="w-full h-auto rounded-lg object-cover" />
          </div>
          <div className="p-6 relative">
            <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl">×</button>
            {shot.shot_label && <p className="text-[10px] text-slate-400 uppercase tracking-wider">{shot.shot_label}</p>}
            <h2 className="text-xl font-bold text-slate-800 mt-1 mb-4">Modifier les tags</h2>

            <Label>Pour qui ? <Hint>(multi)</Hint></Label>
            <ChipRow values={DESTINATAIRES} selected={destinataires} onToggle={(v) => toggle(destinataires, setDestinataires, v)} color="dest" />

            <Label>Occasion(s) <Hint>(multi)</Hint></Label>
            <ChipRow values={OCCASIONS} selected={occasions} onToggle={(v) => toggle(occasions, setOccasions, v)} color="occ" />

            <Label>Produit</Label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRODUITS.map((p) => {
                const active = productId === p;
                return (
                  <button
                    key={p}
                    onClick={() => setProductId(active ? null : p)}
                    className={`px-3 py-1 rounded-full text-[11px] transition-all border ${
                      active ? "bg-[#324A6E] text-white border-[#324A6E]" : "bg-white text-slate-600 border-slate-200 hover:border-[#324A6E]/40"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <Label>Autres tags <Hint>— animaux, famille, lifestyle… libre</Hint></Label>
            {tagsSet.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[...tagsSet].map((t) => (
                  <button
                    key={t}
                    onClick={() => removeTag(t)}
                    className="px-3 py-1 rounded-full text-[11px] bg-[#6B4F2A] text-white border border-[#6B4F2A] flex items-center gap-1"
                    title="Cliquer pour retirer"
                  >
                    {t} <span className="opacity-80">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mb-3">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Tape un tag puis Entrée…"
                className="flex-1 px-3 py-1.5 rounded-full text-[11px] border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-slate-800 text-white disabled:opacity-30"
              >
                + Ajouter
              </button>
            </div>

            <details open className="mb-3 border border-slate-200 rounded-lg p-2.5">
              <summary className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">Motif lié</summary>
              <div className="mt-3 space-y-2">
                <select
                  value={motifId ?? ""}
                  onChange={(e) => { setMotifId(e.target.value || null); setVarianteKey(null); }}
                  className="w-full p-1.5 text-xs border border-slate-200 rounded-md"
                >
                  <option value="">— Aucun motif —</option>
                  {motifs.map((m) => <option key={m.id} value={m.id}>{m.nom_commercial} · {m.id}</option>)}
                </select>
                {selectedMotif && (selectedMotif.variantes?.length ?? 0) > 0 && (
                  <select
                    value={varianteKey ?? ""}
                    onChange={(e) => setVarianteKey(e.target.value || null)}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded-md"
                  >
                    <option value="">— Variante générique —</option>
                    {selectedMotif.variantes!.map((v) => <option key={v.label} value={v.label}>{v.label}</option>)}
                  </select>
                )}
              </div>
            </details>

            {error && <p className="text-[11px] text-red-600 mb-3 bg-red-50 p-2 rounded">{error}</p>}

            <div className="flex gap-2 pt-2 border-t border-slate-100 items-center">
              <button
                onClick={remove}
                disabled={saving}
                className="px-3 py-2 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer le shot
              </button>
              <div className="flex-1" />
              <button onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 mt-1">{children}</p>;
}
function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-400 normal-case font-normal">{children}</span>;
}
function ChipRow({ values, selected, onToggle, color }: { values: string[]; selected: Set<string>; onToggle: (v: string) => void; color: "dest" | "occ" }) {
  const palette = color === "dest"
    ? { active: "bg-[#6B4F2A] text-white border-[#6B4F2A]", hover: "hover:border-[#6B4F2A]/40" }
    : { active: "bg-[#3D5A2A] text-white border-[#3D5A2A]", hover: "hover:border-[#3D5A2A]/40" };
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {values.map((v) => {
        const active = selected.has(v);
        return (
          <button
            key={v}
            onClick={() => onToggle(v)}
            className={`px-3 py-1 rounded-full text-[11px] capitalize transition-all border ${
              active ? palette.active : `bg-white text-slate-600 border-slate-200 ${palette.hover}`
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
