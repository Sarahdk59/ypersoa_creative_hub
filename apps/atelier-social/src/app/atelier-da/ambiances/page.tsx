"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Camera, Sparkles, Loader2 } from "lucide-react";
import { AMBIANCES_OFFICIELLES } from "@/lib/ambiances-officielles";
import { listActiveLookbookAmbiances, type ActiveLookbookAmbiance } from "@/lib/active-ambiances";

export default function AmbiancesPage() {
  const [activeLookbooks, setActiveLookbooks] = useState<ActiveLookbookAmbiance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveLookbookAmbiances()
      .then(setActiveLookbooks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Link
        href="/atelier-da"
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
        <ArrowLeft size={14} strokeWidth={1.6} /> Atelier DA
      </Link>

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
          Référentiel d&apos;ambiances
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
          {AMBIANCES_OFFICIELLES.length} ambiances officielles + {activeLookbooks.length} lookbook{activeLookbooks.length > 1 ? "s" : ""} ❤️ actif{activeLookbooks.length > 1 ? "s" : ""}. Sources visuelles unifiées entre les 3 ateliers (Social, Shooting, DA).
        </p>
      </header>

      {/* Section 1 — Ambiances officielles */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0, marginBottom: 16 }}>
          Ambiances officielles ({AMBIANCES_OFFICIELLES.length})
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {AMBIANCES_OFFICIELLES.map((a) => {
            const Icon = a.icon;
            return (
              <article
                key={a.id}
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Image de référence (fallback gracieux si manquante) */}
                <div
                  style={{
                    aspectRatio: "16/10",
                    background: "var(--hub-bg)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.image_path}
                    alt={a.label}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      // Fallback gracieux : si image manquante, on affiche le grand icone à la place
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                      const fallback = img.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 8,
                      color: "var(--hub-foreground)",
                      opacity: 0.4,
                    }}
                  >
                    <Icon size={48} strokeWidth={1.2} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, letterSpacing: "0.05em" }}>
                      Image à uploader
                    </span>
                  </div>
                </div>

                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--hub-foreground)", color: "var(--hub-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} strokeWidth={1.4} />
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0, marginBottom: 4 }}>
                    {a.label}
                  </h3>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, margin: 0, marginBottom: 8 }}>
                    <code>{a.id}</code>
                  </p>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
                    {a.description}
                  </p>
                </div>
                <details style={{ marginTop: 4 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      opacity: 0.6,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Voir prompt EN
                  </summary>
                  <p
                    style={{
                      marginTop: 8,
                      padding: 10,
                      background: "var(--hub-bg)",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "var(--hub-foreground)",
                      opacity: 0.85,
                    }}
                  >
                    {a.prompt}
                  </p>
                </details>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 2 — Lookbooks ❤️ actifs */}
      <section>
        <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Heart size={18} fill="#E2627C" stroke="#E2627C" /> Mes lookbooks de référence (7j)
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 16px 0" }}>
          Lookbooks ❤️ activés depuis Atelier Lookbook, exposés comme ambiances de référence pendant 7 jours.
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : activeLookbooks.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--hub-bg)",
              border: "1px dashed var(--hub-border)",
              borderRadius: 12,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--hub-foreground)",
              opacity: 0.55,
            }}
          >
            Aucun lookbook actif. Active un lookbook depuis <Link href="/lookbook" style={{ color: "var(--hub-foreground)" }}>Atelier Lookbook</Link>.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {activeLookbooks.map((lb) => {
              const expires = lb.date_archivage ? new Date(lb.date_archivage).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null;
              return (
                <article
                  key={lb.id}
                  style={{
                    background: "white",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ aspectRatio: "4/3", background: "var(--hub-bg)" }}>
                    {lb.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lb.cover_image_url}
                        alt={lb.titre}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0, marginBottom: 4 }}>
                      {lb.titre}
                    </h3>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, margin: "0 0 12px 0" }}>
                      Actif{expires ? ` jusqu'au ${expires}` : ""}
                    </p>
                    {lb.ambiance_extraite && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        {lb.ambiance_extraite.palette.slice(0, 5).map((hex) => (
                          <div
                            key={hex}
                            title={hex}
                            style={{ width: 22, height: 22, borderRadius: 999, background: hex, border: "0.5px solid rgba(0,0,0,0.1)" }}
                          />
                        ))}
                      </div>
                    )}
                    {lb.ambiance_extraite?.lieux && lb.ambiance_extraite.lieux.length > 0 && (
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7, margin: 0 }}>
                        {lb.ambiance_extraite.lieux.slice(0, 2).join(" · ")}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
