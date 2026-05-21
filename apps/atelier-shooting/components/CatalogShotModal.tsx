/**
 * Modal "Ajouter au catalogue motif" — déclenchée depuis le shot courant.
 *
 * UX :
 *   - Sélecteur TYPE : Personne | Occasion (toggle)
 *   - Liste de chips correspondante (couple, anniversaire, maman, mariage…)
 *   - Optionnel : motif YPM associé (fetch /api/da/referentiels) + variante
 *   - Save → supabase via addShotToCatalog()
 *
 * Pourquoi pas de upload en localStorage : ces shots sont la base de la galerie
 * variante côté Atelier DA (Phase 2D). Ils doivent être partagés cross-app, donc
 * Supabase est nécessaire dès maintenant. Le SQL de migration est dans
 * lib/catalog-shots.ts.
 */
import React, { useEffect, useState } from 'react';
import { addShotToCatalog, addExistingShotToCatalog } from '../lib/catalog-shots';
import { GenerationSettings } from '../types';

const HUB_URL = (import.meta.env.VITE_HUB_URL as string | undefined) ?? 'http://localhost:3000';

// Aligné sur apps/atelier-social/src/app/atelier-da/motifs/page.tsx
const DESTINATAIRES = [
  'papa', 'maman', 'mamie', 'papy',
  'parrain', 'marraine', 'témoins',
  'frère', 'sœur', 'tonton', 'tata',
  'amis', 'couple', 'bébé', 'enfant',
  'nounou', 'maîtresse',
];

const OCCASIONS = [
  'anniversaire', 'mariage', 'naissance',
  'fête des mères', 'fête des pères',
  'déclaration', 'transmission', 'intemporel',
  'noël', 'saint-valentin', 'rentrée scolaire',
  'lifestyle',
];

interface Motif {
  id: string;
  nom_commercial: string;
  variantes?: Array<{ file: string; label: string }>;
}

interface Props {
  /**
   * Source de l'image. Pour un shot fraîchement généré : data URL en base64 →
   * upload dans bucket catalog-shots. Pour un favori déjà sur Supabase :
   * existingImageUrl (URL publique du bucket liked-shots), pas de réupload.
   * Exactement l'un des deux doit être fourni.
   */
  imageDataUrl?: string;
  existingImageUrl?: string;
  shotLabel: string;
  productId: string;
  settings: GenerationSettings;
  defaultMotifId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const CatalogShotModal: React.FC<Props> = ({ imageDataUrl, existingImageUrl, shotLabel, productId, settings, defaultMotifId, onClose, onSaved }) => {
  // 2 axes simultanés (multi-select) : un shot peut être à la fois "papa + maman"
  // (papa qui offre à maman) ET "mariage + déclaration" (occasion polysémique).
  const [destinatairesSet, setDestinatairesSet] = useState<Set<string>>(new Set());
  const [occasionsSet, setOccasionsSet] = useState<Set<string>>(new Set());
  // Tags libres (animaux, famille, lifestyle…). Saisis via input + Entrée.
  const [tagsSet, setTagsSet] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState('');
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifId, setMotifId] = useState<string | null>(defaultMotifId ?? null);
  const [varianteKey, setVarianteKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${HUB_URL}/api/da/referentiels`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setMotifs(res.data.motifs.motifs);
      })
      .catch(() => { /* silencieux : le motif est optionnel */ });
  }, []);

  const selectedMotif = motifs.find((m) => m.id === motifId);
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const canSave = destinatairesSet.size > 0 || occasionsSet.size > 0 || tagsSet.size > 0;

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v) return;
    setTagsSet((prev) => new Set(prev).add(v));
    setTagInput('');
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
      if (existingImageUrl) {
        // Favori déjà uploadé sur Supabase → juste insert row
        await addExistingShotToCatalog({
          imageUrl: existingImageUrl,
          destinataires: [...destinatairesSet],
          occasions: [...occasionsSet],
          tags: [...tagsSet],
          motifId,
          varianteKey,
          productId,
          shotLabel,
        });
      } else if (imageDataUrl) {
        // Shot fraîchement généré → upload + insert
        await addShotToCatalog(imageDataUrl, {
          destinataires: [...destinatairesSet],
          occasions: [...occasionsSet],
          tags: [...tagsSet],
          motifId,
          varianteKey,
          productId,
          shotLabel,
          settings,
        });
      } else {
        throw new Error('Aucune image fournie (imageDataUrl ou existingImageUrl requis).');
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-auto"
      >
        <div className="grid grid-cols-[200px_1fr] gap-0">
          <div className="bg-yp-linen p-4 flex items-center justify-center">
            <img src={existingImageUrl ?? imageDataUrl} alt={shotLabel} className="w-full h-auto rounded-lg object-cover" />
          </div>
          <div className="p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl"
              aria-label="Fermer"
            >
              ×
            </button>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{shotLabel} · {productId}</p>
            <h2 className="text-xl font-bold text-yp-olive mt-1 mb-4">Ajouter au catalogue motif</h2>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Pour qui ? <span className="text-slate-400 normal-case font-normal">(multi)</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {DESTINATAIRES.map((v) => {
                const active = destinatairesSet.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggle(destinatairesSet, setDestinatairesSet, v)}
                    className={`px-3 py-1 rounded-full text-[11px] capitalize transition-all border ${
                      active
                        ? 'bg-yp-olive text-white border-yp-olive'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-yp-olive/40'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Occasion(s) <span className="text-slate-400 normal-case font-normal">(multi — ex: mariage + déclaration)</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {OCCASIONS.map((v) => {
                const active = occasionsSet.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggle(occasionsSet, setOccasionsSet, v)}
                    className={`px-3 py-1 rounded-full text-[11px] capitalize transition-all border ${
                      active
                        ? 'bg-yp-sage text-white border-yp-sage'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-yp-sage/40'
                    }`}
                    style={active ? { background: '#3D5A2A', borderColor: '#3D5A2A' } : undefined}
                  >
                    {v}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Autres tags <span className="text-slate-400 normal-case font-normal">— animaux, famille, lifestyle… libre</span>
            </p>
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
            <div className="flex gap-2 mb-4">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Tape un tag puis Entrée…"
                className="flex-1 px-3 py-1.5 rounded-full text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-yp-olive/50"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-yp-olive text-white disabled:opacity-30"
              >
                + Ajouter
              </button>
            </div>

            <details open className="mb-4 border border-slate-200 rounded-lg p-2.5">
              <summary className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                Lier à un motif <span className="text-slate-400 normal-case font-normal">— pour apparaître dans la galerie du motif côté DA</span>
              </summary>
              <div className="mt-3 space-y-2">
                <select
                  value={motifId ?? ''}
                  onChange={(e) => { setMotifId(e.target.value || null); setVarianteKey(null); }}
                  className="w-full p-1.5 text-xs border border-slate-200 rounded-md"
                >
                  <option value="">— Aucun motif —</option>
                  {motifs.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom_commercial} · {m.id}</option>
                  ))}
                </select>
                {selectedMotif && (selectedMotif.variantes?.length ?? 0) > 0 && (
                  <select
                    value={varianteKey ?? ''}
                    onChange={(e) => setVarianteKey(e.target.value || null)}
                    className="w-full p-1.5 text-xs border border-slate-200 rounded-md"
                  >
                    <option value="">— Variante générique —</option>
                    {selectedMotif.variantes!.map((v) => (
                      <option key={v.label} value={v.label}>{v.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </details>

            {error && (
              <p className="text-[11px] text-red-600 mb-3 bg-red-50 p-2 rounded">
                {error}
                {error.includes('relation') || error.includes('does not exist') ? (
                  <span className="block mt-1 text-[10px] text-slate-600">
                    La table <code>catalog_shots</code> n'existe pas encore. Voir le SQL dans <code>lib/catalog-shots.ts</code> à exécuter via le MCP Supabase.
                  </span>
                ) : null}
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={save}
                disabled={!canSave || saving}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                  canSave && !saving
                    ? 'bg-yp-olive text-white hover:bg-yp-olive/90'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Enregistrement…' : 'Ajouter au catalogue'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogShotModal;
