"use client";

/**
 * /bibliotheque/produits — catalogue produits Ypersoa (onglet "Produits" de
 * la Bibliothèque, fusionné depuis /referentiel/produits le 21/08/2026 —
 * "tout au même endroit"). Lit /api/hub/products (référentiel réel, avec
 * couleurs détaillées par produit) — cf. lib/hub-products.ts pour la forme
 * des données. Miniature + référence fournisseur réelle (ex. YP001 = JH001
 * chez Awdis) lues depuis assets_produits/{id}/{id}_fiche_produit.json.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileBox, Palette as PaletteIcon, ArrowUpRight, ImageOff } from "lucide-react";
import type { HubProduit } from "@/lib/hub-products";

export default function BibliothequeProduitsPage() {
  const [produits, setProduits] = useState<HubProduit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hub/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setProduits(res.data?.produits ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/atelier-production/motifs" style={crossLinkStyle}>
          <FileBox size={13} strokeWidth={1.6} /> Voir les fiches techniques (Atelier Production) <ArrowUpRight size={12} />
        </Link>
        <Link href="/atelier-production/palettes" style={crossLinkStyle}>
          <PaletteIcon size={13} strokeWidth={1.6} /> Voir les palettes de fils (Atelier Production) <ArrowUpRight size={12} />
        </Link>
      </div>

      {loading ? (
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6 }}>Chargement…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {produits.map((p) => (
            <div
              key={p.id}
              style={{
                background: "white",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  background: "var(--hub-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail_url}
                    alt={p.nom_commercial}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")}
                  />
                ) : (
                  <ImageOff size={22} strokeWidth={1.4} style={{ opacity: 0.3 }} />
                )}
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, margin: 0, color: "var(--hub-foreground)" }}>
                    {p.nom_commercial}
                  </h3>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, opacity: 0.5, color: "var(--hub-foreground)" }}>{p.id}</span>
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.6, margin: "0 0 4px", color: "var(--hub-foreground)" }}>
                  {p.type_produit} · {p.public_cible} · {p.fournisseur}
                  {p.reference_fournisseur ? ` (${p.reference_fournisseur})` : ""}
                </p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, opacity: 0.5, margin: "0 0 10px", color: "var(--hub-foreground)" }}>
                  {p.nb_couleurs_disponibles} couleur{p.nb_couleurs_disponibles > 1 ? "s" : ""} disponible{p.nb_couleurs_disponibles > 1 ? "s" : ""}
                </p>
                {p.couleurs_detaillees && p.couleurs_detaillees.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {p.couleurs_detaillees.map((c) => (
                      <span
                        key={c.id_palette}
                        title={c.nom_ypersoa}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: c.hex_palette_officiel,
                          border: "0.5px solid var(--hub-border)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {produits.length === 0 && (
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.6 }}>Aucun produit trouvé.</p>
          )}
        </div>
      )}
    </div>
  );
}

const crossLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.6,
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 999,
  border: "0.5px solid var(--hub-border)",
};
