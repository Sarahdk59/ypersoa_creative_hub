"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

interface HubProduitCouleur {
  id_palette: string;
  nom_ypersoa: string;
  hex_palette_officiel: string;
  packshot_reference?: string;
}

interface HubProduit {
  id: string;
  nom_commercial: string;
  fournisseur: string;
  nb_couleurs_disponibles: number;
  ids_couleurs_dispo_quick_check: string[];
  couleurs_detaillees: HubProduitCouleur[];
}

interface Props {
  productId: string;
  garmentColorId: string;
  onChange: (productId: string, garmentColorId: string) => void;
}

export function ProductColorPicker({ productId, garmentColorId, onChange }: Props) {
  const [produits, setProduits] = useState<HubProduit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hub/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setProduits(res.data.produits);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const selectedProduct = produits.find((p) => p.id === productId);

  const availableColors: HubProduitCouleur[] = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.couleurs_detaillees ?? [];
  }, [selectedProduct]);

  // Reset garment color silencieux si plus dispo après changement produit
  useEffect(() => {
    if (!selectedProduct || availableColors.length === 0) return;
    if (!availableColors.some((c) => c.id_palette === garmentColorId)) {
      onChange(productId, availableColors[0].id_palette);
    }
  }, [productId, garmentColorId, selectedProduct, availableColors, onChange]);

  const selectedColor = availableColors.find((c) => c.id_palette === garmentColorId);
  const packshotUrl = selectedColor?.packshot_reference
    ? `/produits/${productId}/${selectedColor.packshot_reference}`
    : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-500 italic py-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Chargement palettes Hub…
      </div>
    );
  }
  if (error) {
    return <div className="text-[10px] text-red-600 py-2">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <select
        value={productId}
        onChange={(e) => onChange(e.target.value, garmentColorId)}
        className="w-full p-1.5 rounded-md border border-brand-muted/30 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-rose"
      >
        {produits.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom_commercial} · {p.id} ({p.nb_couleurs_disponibles} couleurs)
          </option>
        ))}
      </select>

      {selectedProduct && (
        <div
          className="relative aspect-square rounded-xl overflow-hidden border border-brand-muted/20 flex items-center justify-center"
          style={{ background: selectedColor?.hex_palette_officiel ?? "#FAF7F2" }}
        >
          {packshotUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={packshotUrl}
              alt={`${selectedProduct.nom_commercial} ${selectedColor?.nom_ypersoa ?? ""}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
              }}
            />
          ) : (
            <div className="text-center text-brand-muted text-[10px] italic px-3">
              Mockup {productId} indisponible
            </div>
          )}
          {selectedColor && (
            <div className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-center bg-white/80 backdrop-blur-sm rounded px-2 py-0.5">
              {selectedColor.nom_ypersoa}
            </div>
          )}
        </div>
      )}

      {availableColors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableColors.map((c) => {
            const active = c.id_palette === garmentColorId;
            const isWhite =
              c.hex_palette_officiel.toLowerCase() === "#ffffff" ||
              c.hex_palette_officiel.toLowerCase() === "#fff";
            return (
              <button
                key={c.id_palette}
                type="button"
                onClick={() => onChange(productId, c.id_palette)}
                title={c.nom_ypersoa}
                className={`w-6 h-6 rounded-full transition-all ${
                  active
                    ? "border-2 border-brand-rose scale-110 shadow-md"
                    : "border border-transparent hover:scale-105 shadow-sm"
                } ${isWhite && !active ? "border border-brand-muted/40" : ""}`}
                style={{ backgroundColor: c.hex_palette_officiel }}
                aria-label={c.nom_ypersoa}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
