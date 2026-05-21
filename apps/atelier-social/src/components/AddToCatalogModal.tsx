"use client";

/**
 * Modal "Ranger dans le catalogue motif" pour les slides d'un social_pack.
 *
 * Pendant atelier-social de CatalogShotModal côté atelier-shooting. Différence :
 * ici l'image est déjà sur Supabase (slide d'un pack), on ne fait QUE l'insert
 * row dans catalog_shots — pas de réupload, pas de blob.
 *
 * UX : 2 axes multi-select (destinataires + occasions), motif + variante optionnels,
 * produit pré-rempli si le pack en a un. Aligné sur la modal shooting.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { addExistingShotToCatalog } from "@/lib/catalog-shots";

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
  imageUrl: string;
  shotLabel?: string;
  defaultProductId?: string | null;
  defaultMotifId?: string | null;
  defaultVarianteKey?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AddToCatalogModal({ imageUrl, shotLabel, defaultProductId, defaultMotifId, defaultVarianteKey, onClose, onSaved }: Props) {
  const [destinatairesSet, setDestinatairesSet] = useState<Set<string>>(new Set());
  const [occasionsSet, setOccasionsSet] = useState<Set<string>>(new Set());
  const [tagsSet, setTagsSet] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [productId, setProductId] = useState<string | null>(defaultProductId ?? null);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifId, setMotifId] = useState<string | null>(defaultMotifId ?? null);
  const [varianteKey, setVarianteKey] = useState<string | null>(defaultVarianteKey ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setMotifs(res.data.motifs.motifs); })
      .catch(() => { /* silencieux */ });
  }, []);

  const selectedMotif = motifs.find((m) => m.id === motifId);
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    setter(next);
  };

  const canSave = destinatairesSet.size > 0 || occasionsSet.size > 0 || tagsSet.size > 0;

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
      await addExistingShotToCatalog({
        imageUrl,
        shotLabel,
        productId,
        motifId,
        varianteKey,
        destinataires: [...destinatairesSet],
        occasions: [...occasionsSet],
        tags: [...tagsSet],
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-auto">
        <div className="grid grid-cols-[200px_1fr]">
          <div className="bg-slate-50 p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={shotLabel ?? "shot"} className="w-full h-auto rounded-lg object-cover" />
          </div>
          <div className="p-6 relative">
            <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl">×</button>
            {shotLabel && <p className="text-[10px] text-slate-400 uppercase tracking-wider">{shotLabel}</p>}
            <h2 className="text-xl font-bold text-slate-800 mt-1 mb-4">Ranger dans le catalogue motif</h2>

            <Label>Pour qui ? <Hint>(multi)</Hint></Label>
            <ChipRow values={DESTINATAIRES} selected={destinatairesSet} onToggle={(v) => toggle(destinatairesSet, setDestinatairesSet, v)} color="dest" />

            <Label>Occasion(s) <Hint>(multi)</Hint></Label>
            <ChipRow values={OCCASIONS} selected={occasionsSet} onToggle={(v) => toggle(occasionsSet, setOccasionsSet, v)} color="occ" />

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
              <summary className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                Lier à un motif <span className="text-slate-400 normal-case font-normal">— pour apparaître dans la galerie du motif côté DA</span>
              </summary>
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

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={save}
                disabled={!canSave || saving}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  canSave && !saving ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {saving ? "Enregistrement…" : "Ranger dans le catalogue"}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700">
                Annuler
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
