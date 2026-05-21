/**
 * IncarnationCard — tuile dans la liste /atelier-da/incarnations.
 */
"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import type { IncarnationEnriched } from "@/types/incarnations";
import { GABARITS_DISPONIBLES, TON_COLORS, TON_LABELS } from "@/types/incarnations";
import { StatutBadge } from "./StatutBadge";

interface IncarnationCardProps {
  incarnation: IncarnationEnriched;
}

export function IncarnationCard({ incarnation: i }: IncarnationCardProps) {
  return (
    <Link
      href={`/atelier-da/incarnations/${encodeURIComponent(i.code)}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <article
        style={{
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "transform 200ms ease, border-color 150ms ease, box-shadow 200ms ease",
          cursor: "pointer",
          height: "100%",
        }}
        className="incarnation-card"
      >
        {/* Code + statut */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--hub-foreground)",
              opacity: 0.55,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {i.code}
          </span>
          <StatutBadge statut={i.statut} />
        </div>

        {/* Nom commercial */}
        <h3
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 22,
            fontWeight: 500,
            margin: 0,
            color: "var(--hub-foreground)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {i.nom_commercial}
        </h3>

        {/* Motif */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              background: "var(--color-brand-rose, #A76059)",
              color: "white",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {i.motif_nom}
          </span>
          {i.ton && (
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 999,
                background: TON_COLORS[i.ton],
                color: "white",
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              {TON_LABELS[i.ton]}
            </span>
          )}
        </div>

        {/* Spec broderie résumée */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            background: "var(--hub-bg)",
            padding: "8px 10px",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span>
            <strong style={{ opacity: 0.7 }}>Haut</strong> : {i.spec_broderie.mot_haut || "—"}
          </span>
          <span>
            <strong style={{ opacity: 0.7 }}>Bas</strong> : {i.spec_broderie.mot_bas || "—"}
          </span>
          <span>
            <strong style={{ opacity: 0.7 }}>Symbole</strong> : {i.spec_broderie.symbole || "—"} ·{" "}
            <strong style={{ opacity: 0.7 }}>Fil</strong> : {i.spec_broderie.couleur_fil_defaut || "—"}
          </span>
        </div>

        {/* Gabarits cibles avec checkmarks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.55,
              fontWeight: 600,
            }}
          >
            Gabarits cibles
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {i.gabarits_cibles.length === 0 ? (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5 }}>
                Aucun gabarit ciblé
              </span>
            ) : (
              i.gabarits_cibles.map((g) => {
                const meta = GABARITS_DISPONIBLES.find((x) => x.code === g);
                return (
                  <span
                    key={g}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "var(--hub-bg)",
                      border: "0.5px solid var(--hub-border)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      color: "var(--hub-foreground)",
                    }}
                    title={meta?.label}
                  >
                    {g}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Collections cibles */}
        {i.collections_cibles.length > 0 && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              color: "var(--hub-foreground)",
              opacity: 0.55,
              lineHeight: 1.4,
            }}
          >
            {i.collections_cibles.slice(0, 3).join(" · ")}
            {i.collections_cibles.length > 3 && ` +${i.collections_cibles.length - 3}`}
          </div>
        )}

        {/* Footer : gabarits shootés */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 8,
            borderTop: "0.5px solid var(--hub-border)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--hub-foreground)",
            opacity: 0.7,
          }}
        >
          {i.gabarits_shootes_count === i.gabarits_cibles_count && i.gabarits_cibles_count > 0 ? (
            <CheckCircle2 size={12} color="#365D40" strokeWidth={2} />
          ) : (
            <Circle size={12} strokeWidth={1.6} />
          )}
          {i.gabarits_shootes_count}/{i.gabarits_cibles_count} gabarits shootés
        </div>
      </article>
    </Link>
  );
}
