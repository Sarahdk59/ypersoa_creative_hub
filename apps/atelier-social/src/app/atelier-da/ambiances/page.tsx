"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Camera, Sparkles, Loader2, Upload } from "lucide-react";
import { AMBIANCES_OFFICIELLES, type AmbianceOfficielle } from "@/lib/ambiances-officielles";
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
          {AMBIANCES_OFFICIELLES.map((a) => (
            <AmbianceCard key={a.id} ambiance={a} />
          ))}
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

function AmbianceCard({ ambiance }: { ambiance: AmbianceOfficielle }) {
  const Icon = ambiance.icon;
  const inputRef = useRef<HTMLInputElement>(null);
  const [bust, setBust] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = bust ? `${ambiance.image_path}?v=${bust}` : ambiance.image_path;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void doUpload(file);
  };

  const doUpload = async (file: File) => {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/da/ambiances/${encodeURIComponent(ambiance.id)}/upload`, {
        method: "POST",
        body: fd,
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error || "Échec upload");
      setBust(res.data.ts as number);
      setImgFailed(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <article
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          aspectRatio: "16/10",
          background: "var(--hub-bg)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!imgFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={ambiance.label}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgFailed(true)}
          />
        )}
        {imgFailed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
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
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Uploader une image JPG"
          title="Uploader une image JPG (max 5 MB)"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 999,
            border: "0.5px solid var(--hub-border)",
            background: "rgba(255,255,255,0.92)",
            color: "var(--hub-foreground)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            cursor: uploading ? "default" : "pointer",
          }}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? "Upload…" : imgFailed ? "Uploader" : "Remplacer"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          style={{ display: "none" }}
          onChange={onPick}
        />
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--hub-foreground)", color: "var(--hub-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} strokeWidth={1.4} />
        </div>
        <div>
          <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0, marginBottom: 4 }}>
            {ambiance.label}
          </h3>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, margin: 0, marginBottom: 8 }}>
            <code>{ambiance.id}</code>
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
            {ambiance.description}
          </p>
        </div>
        {err && (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#a13a16" }}>
            {err}
          </div>
        )}
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
            {ambiance.prompt}
          </p>
        </details>
      </div>
    </article>
  );
}
