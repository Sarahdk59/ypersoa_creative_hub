/**
 * Picker du référentiel motifs Hub.
 * Source : atelier-social (port 3000) via CORS.
 *  - /api/da/referentiels → liste des motifs + variantes + prod_files
 *  - /motifs/<file>       → PNG variantes
 *  - /api/da/motifs/<id>/preview?key=<k> → PNG prod
 *
 * Sélection → fetch + readAsDataURL → settings.embroideryImage (data URL).
 */
import React, { useEffect, useState } from "react";

const HUB_URL = (import.meta.env.VITE_HUB_URL as string | undefined) ?? "http://localhost:3000";

interface MotifVariante {
  file: string;
  label: string;
  tags?: string[];
}

interface ProdFile {
  key: string;
  pxf: string | null;
  dst: string | null;
  png: string | null;
}

interface Motif {
  id: string;
  nom_commercial: string;
  asset_principal: string;
  variantes?: MotifVariante[];
  shooting_pngs?: MotifVariante[];
  prod_files?: ProdFile[];
}

interface MotifImage {
  source: "principal" | "variante" | "shooting" | "prod";
  url: string;
  label: string;
  filename: string;
}

interface Props {
  onPick: (dataUrl: string) => void;
  /**
   * Si fourni, filtre les images affichées :
   *   - "poignet" : ne montre que les variantes / prod_files dont la clé ou le
   *     filename matche /poignet/i. Utile pour le slot "broderie poignet"
   *     (1bis) qui ne doit proposer que les versions adaptées au cuff.
   */
  filter?: "poignet";
  /** Label custom du header (sinon "Référentiel motifs Hub"). */
  triggerLabel?: string;
}

const MotifPickerPanel: React.FC<Props> = ({ onPick, filter, triggerLabel }) => {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingKey, setImportingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${HUB_URL}/api/da/referentiels`, { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setMotifs(res.data.motifs.motifs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const selected = motifs.find((m) => m.id === selectedId);
  const poignetRegex = /poignet/i;
  const matchesFilter = (label: string, filename: string): boolean => {
    if (!filter) return true;
    if (filter === "poignet") return poignetRegex.test(label) || poignetRegex.test(filename);
    return true;
  };

  // Liste des motifs proposés dans le select : si filter="poignet", on ne montre
  // que les motifs qui ont AU MOINS une variante/prod-file/shooting-png poignet.
  const filteredMotifs = !filter
    ? motifs
    : motifs.filter((m) => {
        const candidates = [
          ...(m.variantes ?? []).map((v) => ({ label: v.label, filename: v.file })),
          ...(m.shooting_pngs ?? []).map((v) => ({ label: v.label, filename: v.file })),
          ...(m.prod_files ?? []).map((p) => ({ label: p.key, filename: p.png ?? "" })),
        ];
        return candidates.some((c) => matchesFilter(c.label, c.filename));
      });

  const images: MotifImage[] = !selected
    ? []
    : [
        ...(filter ? [] : [{
          source: "principal" as const,
          url: `${HUB_URL}/motifs/${encodeURIComponent(selected.asset_principal)}`,
          label: "Hero",
          filename: selected.asset_principal,
        }]),
        ...(selected.prod_files ?? [])
          .filter((p) => p.png)
          .filter((p) => matchesFilter(p.key, p.png as string))
          .map((p) => ({
            source: "prod" as const,
            url: `${HUB_URL}/api/da/motifs/${encodeURIComponent(selected.id)}/preview?key=${encodeURIComponent(p.key)}`,
            label: p.key,
            filename: p.png as string,
          })),
        ...(selected.variantes ?? [])
          .filter((v) => matchesFilter(v.label, v.file))
          .map((v) => ({
            source: "variante" as const,
            url: `${HUB_URL}/motifs/${encodeURIComponent(v.file)}`,
            label: v.label,
            filename: v.file,
          })),
        ...(selected.shooting_pngs ?? [])
          .filter((v) => matchesFilter(v.label, v.file))
          .map((v) => ({
            source: "shooting" as const,
            url: `${HUB_URL}/motifs/${encodeURIComponent(v.file)}`,
            label: v.label,
            filename: v.file,
          })),
      ];

  const handlePick = async (img: MotifImage) => {
    const k = `${img.source}-${img.filename}`;
    setImportingKey(k);
    setError(null);
    try {
      const response = await fetch(img.url);
      if (!response.ok) throw new Error(`Fetch ${response.status}`);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      onPick(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <div className="border border-teal-200 rounded-xl bg-teal-50/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <i className="fa-solid fa-layer-group text-teal-700 text-sm" />
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
          {triggerLabel ?? "Référentiel motifs Hub"}
        </h3>
        {filteredMotifs.length > 0 && (
          <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
            {filteredMotifs.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="text-[11px] text-slate-500 italic py-2">Chargement…</div>
      )}
      {error && (
        <div className="text-[11px] text-red-600 mb-2">
          {error}
          <div className="text-[10px] text-slate-500 mt-1">
            Vérifie que <code>pnpm dev:atelier</code> tourne sur {HUB_URL}.
          </div>
        </div>
      )}

      {!loading && filteredMotifs.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full p-1.5 rounded-md border border-teal-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 mb-2"
        >
          <option value="">{filter === "poignet" ? "Choisir un motif avec variante poignet…" : "Choisir un motif…"}</option>
          {filteredMotifs.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom_commercial} · {m.id}
            </option>
          ))}
        </select>
      )}
      {!loading && filter && filteredMotifs.length === 0 && (
        <div className="text-[11px] text-slate-500 italic py-2">
          Aucun motif n'a encore de variante poignet documentée.
        </div>
      )}

      {selected && images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {images.map((img) => {
            const k = `${img.source}-${img.filename}`;
            const isImporting = importingKey === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handlePick(img)}
                disabled={isImporting}
                className="group relative aspect-square rounded-md overflow-hidden border border-teal-200 hover:border-teal-400 transition-all bg-white disabled:opacity-60"
                title={`${img.label} (${img.source})`}
              >
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/20 transition-all flex items-center justify-center">
                  {isImporting ? (
                    <i className="fa-solid fa-spinner fa-spin text-teal-800 text-sm" />
                  ) : (
                    <i className="fa-solid fa-check text-teal-800 text-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                {img.source === "principal" && (
                  <span
                    className="absolute top-0.5 left-0.5 bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                    title="Hero"
                  >
                    <i className="fa-solid fa-star text-[8px]" />
                  </span>
                )}
                {img.source === "prod" && (
                  <span
                    className="absolute top-0.5 left-0.5 text-[8px] bg-teal-700 text-white px-1 rounded font-bold"
                    title="Fichier prod"
                  >
                    {img.label.length <= 2 ? img.label : "PROD"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MotifPickerPanel;
