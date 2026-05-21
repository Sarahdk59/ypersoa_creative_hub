"use client";

/**
 * Atelier DA — Motifs / [destinataire]
 *
 * Page Shopify-like dédiée à un destinataire (papa, maman, parrain…). Reprend
 * toutes les VARIANTES du catalogue dont le destinataire (en priorité fine-grained
 * sur la variante, sinon fallback motif) matche le segment d'URL.
 *
 * Une URL = un bookmark. Navigation latérale par chips destinataires. Filtre
 * secondaire optionnel par occasion. Côté Shopify-like.
 *
 * Si /atelier-da/motifs/papa renvoie 0 variante, c'est que les tags n'ont pas
 * encore été posés sur les variantes — voir la modal d'édition côté catalogue.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Camera } from "lucide-react";
import type { MotifYpm, MotifVariante } from "@/lib/atelier-da/referentiels-loader";

const SHOOTING_URL = process.env.NEXT_PUBLIC_SHOOTING_URL || "http://localhost:3001";

const DESTINATAIRES = [
  "papa", "maman", "mamie", "papy",
  "parrain", "marraine", "témoins",
  "frère", "sœur", "tonton", "tata",
  "amis", "couple", "bébé", "enfant",
  "nounou", "maîtresse",
];

const OCCASIONS = [
  "anniversaire", "mariage", "naissance",
  "fête des mères", "fête des pères",
  "déclaration", "transmission", "intemporel",
  "noël", "saint-valentin", "rentrée scolaire",
];

export default function DestinataireCataloguePage() {
  const params = useParams();
  const destinataireRaw = (params?.destinataire as string) ?? "";
  const destinataire = decodeURIComponent(destinataireRaw).toLowerCase();

  const [motifs, setMotifs] = useState<MotifYpm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOccasions, setFilterOccasions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/da/referentiels", { cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setMotifs(res.data.motifs.motifs);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const variantes = useMemo(() => {
    const all: Array<{ motif: MotifYpm; variante: MotifVariante; effectiveDest: string[]; effectiveOcc: string[] }> = [];
    for (const m of motifs) {
      for (const v of m.variantes ?? []) {
        const effectiveDest = v.destinataires?.length ? v.destinataires : (m.destinataires ?? []);
        const effectiveOcc = v.occasions?.length ? v.occasions : (m.occasions ?? []);
        if (!effectiveDest.includes(destinataire)) continue;
        if (filterOccasions.size > 0 && !effectiveOcc.some((o) => filterOccasions.has(o))) continue;
        all.push({ motif: m, variante: v, effectiveDest, effectiveOcc });
      }
    }
    return all;
  }, [motifs, destinataire, filterOccasions]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
      </div>
    );
  }
  if (error) return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error}</div>;

  const isKnownDestinataire = DESTINATAIRES.includes(destinataire);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link
        href="/atelier-da/motifs"
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
        <ArrowLeft size={14} strokeWidth={1.6} /> Tous les motifs
      </Link>

      <header style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Catalogue · Pour qui ?
        </p>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 48, fontWeight: 500, margin: "6px 0 10px", textTransform: "capitalize" }}>
          {destinataire}
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
          {variantes.length === 0
            ? `Aucune variante taggée "${destinataire}" pour le moment.`
            : `${variantes.length} variante${variantes.length > 1 ? "s" : ""} pour ${destinataire}.`}
        </p>
      </header>

      {/* Navigation latérale destinataires (style Shopify) */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 8px" }}>
          Autres destinataires
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DESTINATAIRES.map((d) => {
            const active = d === destinataire;
            return (
              <Link
                key={d}
                href={`/atelier-da/motifs/${encodeURIComponent(d)}`}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: active ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                  background: active ? "var(--hub-foreground)" : "white",
                  color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
                  textDecoration: "none",
                  textTransform: "capitalize",
                }}
              >
                {d}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sous-filtre occasion */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 8px" }}>
          Affiner par occasion
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {OCCASIONS.map((o) => {
            const active = filterOccasions.has(o);
            return (
              <button
                key={o}
                onClick={() => {
                  const next = new Set(filterOccasions);
                  if (next.has(o)) next.delete(o);
                  else next.add(o);
                  setFilterOccasions(next);
                }}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: active ? "0.5px solid #3D5A2A" : "0.5px solid var(--hub-border)",
                  background: active ? "#E3E8DC" : "white",
                  color: active ? "#3D5A2A" : "var(--hub-foreground)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>

      {variantes.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "var(--hub-bg)", borderRadius: 16 }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, opacity: 0.7, margin: 0 }}>
            {isKnownDestinataire
              ? `Aucune variante n'a encore été taggée « ${destinataire} ». Va sur `
              : `Destinataire inconnu. Va sur `}
            <Link href="/atelier-da/motifs" style={{ color: "inherit", textDecoration: "underline" }}>
              le catalogue motifs
            </Link>
            {" "}pour tagger les variantes.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {variantes.map((row) => (
            <a
              key={`${row.motif.id}-${row.variante.label}`}
              href={`${SHOOTING_URL}?motif=${row.motif.id}&variante=${encodeURIComponent(row.variante.file)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "white",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 12,
                padding: 0,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                transition: "transform 200ms ease, box-shadow 200ms ease",
              }}
              className="canonique-card"
              title={`${row.variante.label} — utiliser dans Shooting`}
            >
              <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--hub-bg)", padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/motifs/${encodeURIComponent(row.variante.file)}`}
                  alt={row.variante.label}
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                />
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 16, fontWeight: 500, margin: 0, lineHeight: 1.2 }}>
                  {row.variante.label}
                </h3>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: 0, letterSpacing: 0.3 }}>
                  {row.motif.nom_commercial} · {row.motif.id}
                </p>
                <div style={{ flex: 1 }} />
                {row.effectiveOcc.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {row.effectiveOcc.slice(0, 3).map((o) => (
                      <span
                        key={o}
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 9.5,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "#E3E8DC",
                          color: "#3D5A2A",
                          textTransform: "capitalize",
                        }}
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--hub-foreground)",
                  opacity: 0.7,
                  marginTop: 4,
                }}>
                  <Camera size={11} /> Shooter
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
