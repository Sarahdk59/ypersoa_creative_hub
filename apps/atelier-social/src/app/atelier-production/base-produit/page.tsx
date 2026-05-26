/**
 * Base produit — catalogue des produits-supports Ypersoa et de leurs variantes
 * couleur. Lecture seule depuis palette_supports_par_produit.json (source de
 * vérité du moteur shooting).
 *
 * Les 3 produits en vente sur Shopify (YP001, YP004, YP019) portent un badge
 * "En vente Shopify". Les 2 autres (YP005, YP021) restent visibles pour garder
 * le catalogue complet sous les yeux.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProduits } from "@/lib/hub-products";

// Produits actuellement en vente sur Shopify (cf. Sarah, 26/05/2026).
const EN_VENTE_SHOPIFY = new Set(["YP001", "YP004", "YP019", "YP021"]);

const PUBLIC_LABEL: Record<string, string> = {
  adulte_unisexe: "Adulte unisexe",
  enfant: "Enfant",
};

export default function BaseProduitPage() {
  const produits = getProduits();
  const nbCouleursTotal = produits.reduce((acc, p) => acc + p.couleurs_detaillees.length, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <Link
        href="/atelier-production"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier Production
      </Link>

      <header style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--hub-foreground)",
            lineHeight: 1.05,
            margin: 0,
            marginBottom: 12,
          }}
        >
          Base produit
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            maxWidth: 640,
            lineHeight: 1.6,
          }}
        >
          Les produits-supports Ypersoa et leurs variantes couleur. {produits.length} produits,{" "}
          {nbCouleursTotal} variantes au total. Source : référentiel{" "}
          <code style={{ fontSize: 12, opacity: 0.8 }}>palette_supports_par_produit</code>.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {produits.map((p) => {
          const enVente = EN_VENTE_SHOPIFY.has(p.id);
          return (
            <section
              key={p.id}
              style={{
                background: "white",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 12,
                padding: 24,
              }}
            >
              {/* En-tête produit */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <h2
                    style={{
                      fontFamily: "var(--font-editorial)",
                      fontSize: 22,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: "var(--hub-foreground)",
                      margin: 0,
                    }}
                  >
                    {p.nom_commercial}
                  </h2>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: "var(--hub-foreground)",
                      opacity: 0.45,
                    }}
                  >
                    {p.id}
                  </span>
                </div>

                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: enVente ? "#1E2D4A" : "transparent",
                    color: enVente ? "#FAF7F2" : "var(--hub-foreground)",
                    border: enVente ? "none" : "0.5px solid var(--hub-border)",
                    opacity: enVente ? 1 : 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {enVente ? "En vente Shopify" : "Catalogue"}
                </span>
              </div>

              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  color: "var(--hub-foreground)",
                  opacity: 0.6,
                  margin: 0,
                  marginBottom: 20,
                }}
              >
                {p.type_produit} · {PUBLIC_LABEL[p.public_cible] ?? p.public_cible} · {p.fournisseur} ·{" "}
                {p.nb_couleurs_disponibles} couleurs
              </p>

              {/* Grille des variantes couleur */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 12,
                }}
              >
                {p.couleurs_detaillees.map((c) => (
                  <div
                    key={c.id_palette}
                    style={{
                      border: "0.5px solid var(--hub-border)",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "var(--hub-bg)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "1 / 1",
                        background: c.hex_palette_officiel,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {c.packshot_reference ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/produit-packshot?product=${p.id}&file=${encodeURIComponent(
                            c.packshot_reference
                          )}`}
                          alt={`${p.nom_commercial} ${c.nom_ypersoa}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: c.hex_palette_officiel,
                            border: "0.5px solid var(--hub-border)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--hub-foreground)",
                          }}
                        >
                          {c.nom_ypersoa}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 10,
                          color: "var(--hub-foreground)",
                          opacity: 0.5,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.hex_palette_officiel}
                      </div>
                      {c.nom_fournisseur ? (
                        <div
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: 10,
                            color: "var(--hub-foreground)",
                            opacity: 0.5,
                            marginTop: 2,
                          }}
                        >
                          {c.nom_fournisseur}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 40,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          color: "var(--hub-foreground)",
          opacity: 0.5,
          textAlign: "center",
        }}
      >
        Lecture seule. Pour modifier un produit ou une couleur, éditer{" "}
        <code style={{ fontSize: 11 }}>referentiels/palette_supports_par_produit.json</code> (source
        de vérité du moteur shooting).
      </p>
    </div>
  );
}
