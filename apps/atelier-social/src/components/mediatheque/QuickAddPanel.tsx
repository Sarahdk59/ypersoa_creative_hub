/**
 * QuickAddPanel — ajout rapide d'un shooting en 4 clics max.
 *
 * Workflow : on choisit UNE FOIS le motif + le gabarit + la couleur (3 clics,
 * sticky), puis chaque photo s'uploade dès qu'on la sélectionne (1 clic, multi-
 * sélection acceptée). Les 3 sélecteurs restent en place tant qu'on shoote la
 * même combinaison → photo suivante = 1 seul clic.
 *
 * Tags posés automatiquement : motif + gabarit + couleur. Statut = "à valider".
 * Le reste (tags fins, source, date, validation) se règle ensuite sur la fiche.
 */
"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, UploadCloud } from "lucide-react";

import type { MediaSource, Tag } from "@/types/mediatheque";
import { createMedia } from "@/lib/mediatheque/api-client";
import { uploadMediaFile } from "@/lib/mediatheque/storage";

interface QuickAddPanelProps {
  tagsByCategory: Record<string, Tag[]>;
  onUploaded?: (total: number) => void;
}

interface Shot {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  preview?: string;
  error?: string;
}

const DEFAULT_SOURCE: MediaSource = "shooting_studio";

function imageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

export function QuickAddPanel({ tagsByCategory, onUploaded }: QuickAddPanelProps) {
  const motifs = useMemo(() => tagsByCategory.motif ?? [], [tagsByCategory]);
  const gabarits = useMemo(() => tagsByCategory.gabarit ?? [], [tagsByCategory]);
  const couleurs = useMemo(() => tagsByCategory.couleur_produit ?? [], [tagsByCategory]);

  const [motifId, setMotifId] = useState("");
  const [gabaritId, setGabaritId] = useState("");
  const [couleurId, setCouleurId] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const ready = Boolean(motifId && gabaritId && couleurId);

  const openPicker = () => {
    if (!ready) return;
    requestAnimationFrame(() => inputRef.current?.click());
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !ready) return;
    const files = Array.from(fileList);
    const tag_ids = [motifId, gabaritId, couleurId];

    const newShots: Shot[] = files.map((f, i) => ({
      id: `shot-${Date.now()}-${i}`,
      name: f.name,
      status: "uploading",
      preview: URL.createObjectURL(f),
    }));
    setShots((prev) => [...newShots, ...prev]);

    let added = 0;
    await Promise.all(
      files.map(async (file, i) => {
        const shotId = newShots[i].id;
        const preview = newShots[i].preview!;
        try {
          const { width, height } = await imageDimensions(preview);
          const { storage_path, public_url } = await uploadMediaFile(file, DEFAULT_SOURCE);
          await createMedia({
            filename: file.name,
            public_url,
            storage_path,
            width: width || undefined,
            height: height || undefined,
            size_bytes: file.size,
            mime_type: file.type || "image/jpeg",
            source: DEFAULT_SOURCE,
            tag_ids,
          });
          added += 1;
          setShots((prev) =>
            prev.map((s) => (s.id === shotId ? { ...s, status: "done" } : s)),
          );
        } catch (err) {
          setShots((prev) =>
            prev.map((s) =>
              s.id === shotId
                ? { ...s, status: "error", error: err instanceof Error ? err.message : "Erreur" }
                : s,
            ),
          );
        }
      }),
    );

    setTotalDone((n) => {
      const next = n + added;
      onUploaded?.(next);
      return next;
    });
  };

  const motifLabel = motifs.find((t) => t.id === motifId)?.label;
  const gabaritLabel = gabarits.find((t) => t.id === gabaritId)?.label;
  const couleurTag = couleurs.find((t) => t.id === couleurId);

  return (
    <section
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderLeft: "3px solid var(--color-brand-rose, #A76059)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 22,
            fontWeight: 500,
            margin: 0,
          }}
        >
          Ajout rapide
        </h2>
        {totalDone > 0 && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#365D40" }}>
            <Check size={13} style={{ verticalAlign: "middle" }} /> {totalDone} ajoutée
            {totalDone > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12.5,
          color: "var(--hub-foreground)",
          opacity: 0.65,
          margin: "0 0 16px 0",
        }}
      >
        Choisis le motif, le gabarit et la couleur une fois — puis chaque photo s&apos;ajoute en 1 clic.
        Tags fins, date et validation se règlent ensuite sur la fiche.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <label style={fieldStyle}>
          <span style={labelStyle}>① Motif</span>
          <select value={motifId} onChange={(e) => setMotifId(e.target.value)} style={inputStyle}>
            <option value="">— Choisir —</option>
            {motifs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.slug})
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>② Gabarit produit</span>
          <select value={gabaritId} onChange={(e) => setGabaritId(e.target.value)} style={inputStyle}>
            <option value="">— Choisir —</option>
            {gabarits.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>③ Couleur produit</span>
          <select value={couleurId} onChange={(e) => setCouleurId(e.target.value)} style={inputStyle}>
            <option value="">— Choisir —</option>
            {couleurs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={!ready}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "16px 20px",
          borderRadius: 12,
          border: ready
            ? "2px dashed var(--color-brand-rose, #A76059)"
            : "2px dashed var(--hub-border)",
          background: ready ? "rgba(167,96,89,0.06)" : "var(--hub-bg)",
          color: "var(--hub-foreground)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 500,
          cursor: ready ? "pointer" : "not-allowed",
          opacity: ready ? 1 : 0.6,
        }}
      >
        {ready ? <ImagePlus size={18} strokeWidth={1.6} /> : <UploadCloud size={18} strokeWidth={1.6} />}
        {ready ? "④ Ajouter des photos" : "Choisis motif + gabarit + couleur d'abord"}
      </button>

      {ready && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11.5,
            color: "var(--hub-foreground)",
            opacity: 0.6,
            margin: "10px 0 0 0",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span>Sera taggé :</span>
          <span style={chipStyle}>{motifLabel}</span>
          <span style={chipStyle}>{gabaritLabel}</span>
          <span style={{ ...chipStyle, display: "inline-flex", alignItems: "center", gap: 5 }}>
            {couleurTag?.color_hex && (
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: couleurTag.color_hex,
                  border: "0.5px solid rgba(0,0,0,0.15)",
                }}
              />
            )}
            {couleurTag?.label}
          </span>
          <span style={{ opacity: 0.8 }}>· multi-sélection acceptée</span>
        </p>
      )}

      {shots.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 16,
          }}
        >
          {shots.map((s) => (
            <div
              key={s.id}
              title={s.error ? `${s.name} — ${s.error}` : s.name}
              style={{
                position: "relative",
                width: 64,
                height: 80,
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--hub-bg)",
                border: "0.5px solid var(--hub-border)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.preview && (
                <img
                  src={s.preview}
                  alt={s.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: s.status === "uploading" ? 0.5 : 1,
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    s.status === "error"
                      ? "rgba(160,49,42,0.35)"
                      : s.status === "uploading"
                        ? "rgba(0,0,0,0.05)"
                        : "transparent",
                }}
              >
                {s.status === "uploading" && <Loader2 size={16} className="animate-spin" color="#fff" />}
                {s.status === "done" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#365D40",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={11} strokeWidth={3} color="#fff" />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--hub-foreground)",
  opacity: 0.7,
  marginBottom: 6,
  display: "block",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const inputStyle: React.CSSProperties = {
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
  outline: "none",
  width: "100%",
};

const chipStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--hub-foreground)",
  opacity: 1,
};
