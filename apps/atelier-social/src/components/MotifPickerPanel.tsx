"use client";

import { useEffect, useState } from "react";
import { Layers, Loader2, Camera, Star } from "lucide-react";

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
  onImport: (file: File, base64: string) => void;
}

export function MotifPickerPanel({ onImport }: Props) {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingKey, setImportingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setMotifs(res.data.motifs.motifs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const selected = motifs.find((m) => m.id === selectedId);

  const images: MotifImage[] = !selected
    ? []
    : [
        {
          source: "principal" as const,
          url: `/motifs/${encodeURIComponent(selected.asset_principal)}`,
          label: "Principal",
          filename: selected.asset_principal,
        },
        ...(selected.prod_files ?? [])
          .filter((p) => p.png)
          .map((p) => ({
            source: "prod" as const,
            url: `/api/da/motifs/${encodeURIComponent(selected.id)}/preview?key=${encodeURIComponent(p.key)}`,
            label: p.key,
            filename: p.png as string,
          })),
        ...(selected.variantes ?? []).map((v) => ({
          source: "variante" as const,
          url: `/motifs/${encodeURIComponent(v.file)}`,
          label: v.label,
          filename: v.file,
        })),
        ...(selected.shooting_pngs ?? []).map((v) => ({
          source: "shooting" as const,
          url: `/motifs/${encodeURIComponent(v.file)}`,
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
      const file = new File([blob], img.filename, { type: blob.type || "image/png" });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      onImport(file, base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <div className="border border-teal-200 rounded-2xl bg-teal-50/40 p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-teal-700" />
        <h3 className="text-xs font-bold text-teal-800">Référentiel motifs Hub</h3>
        {motifs.length > 0 && (
          <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
            {motifs.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[10px] text-slate-500 italic py-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Chargement des motifs…
        </div>
      )}
      {error && <div className="text-[10px] text-red-600 mb-2">{error}</div>}

      {!loading && motifs.length > 0 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full p-1.5 rounded-md border border-teal-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-400 mb-2"
        >
          <option value="">Choisir un motif…</option>
          {motifs.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom_commercial} · {m.id}
            </option>
          ))}
        </select>
      )}

      {selected && images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                />
                <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/20 transition-all flex items-center justify-center">
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 text-teal-800 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-teal-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                {img.source === "principal" && (
                  <span
                    className="absolute top-0.5 left-0.5 bg-amber-500 text-white rounded-full p-0.5"
                    title="Hero"
                  >
                    <Star className="w-2.5 h-2.5" />
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
}
