/**
 * CollectionBuilder — composant partagé entre /collections/new et /collections/[id]/edit.
 *
 * UX :
 *  - Gauche  : bibliothèque de photos (médiathèque + shots likés), clic = ajout
 *  - Droite  : séquence de clips avec sélecteur de shot_type + réordonnancement ↑↓
 *  - Footer  : Annuler | Enregistrer
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Film,
  Heart,
  Image as ImageIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface LibraryPhoto {
  id: string;
  public_url: string;
  label: string;
  source_type: "media" | "liked-shot";
  media_id: string | null;
  source_id: string;
}

interface SequenceSlot {
  uid: string; // unique local id pour le key React
  shot_type: string;
  public_url: string;
  media_id: string | null;
  source_type: "media" | "liked-shot";
  source_id: string;
}

export interface CollectionBuilderInitialData {
  id?: string;
  label: string;
  description?: string | null;
  shots?: Array<{
    id?: string;
    shot_type: string;
    public_url: string;
    media_id?: string | null;
    source_type?: "media" | "liked-shot" | "url";
    source_id?: string | null;
    ordre: number;
  }>;
}

interface CollectionBuilderProps {
  initial?: CollectionBuilderInitialData | null;
}

// ─── Shot types disponibles ───────────────────────────────────────────────────

const SHOT_TYPES = [
  "MACRO BRODERIE",
  "PORTRAIT ÉDITORIAL",
  "LIFESTYLE MODE",
  "LIFESTYLE EXTÉRIEUR",
  "TEXTURE / DÉTAIL",
  "SCÈNE LARGE",
  "OBJET / PROP",
];

// ─── Composant principal ──────────────────────────────────────────────────────

export function CollectionBuilder({ initial }: CollectionBuilderProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  // Formulaire
  const [label, setLabel] = useState(initial?.label ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  // Bibliothèque
  const [tab, setTab] = useState<"media" | "liked-shot">("media");
  const [library, setLibrary] = useState<LibraryPhoto[]>([]);
  const [libLoading, setLibLoading] = useState(true);
  const [q, setQ] = useState("");

  // Séquence
  const [sequence, setSequence] = useState<SequenceSlot[]>(() =>
    (initial?.shots ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .map((s) => ({
        uid: crypto.randomUUID(),
        shot_type: s.shot_type,
        public_url: s.public_url,
        media_id: s.media_id ?? null,
        source_type: (s.source_type === "liked-shot" ? "liked-shot" : "media") as
          | "media"
          | "liked-shot",
        source_id: s.source_id ?? s.id ?? "",
      })),
  );

  // Soumission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Chargement bibliothèque ────────────────────────────────────────────────

  const loadLibrary = useCallback(async (activeTab: "media" | "liked-shot") => {
    setLibLoading(true);
    try {
      if (activeTab === "media") {
        const res = await fetch(
          "/api/da/mediatheque/media?per_page=200&statut=validee&statut=a_valider",
          { cache: "no-store" },
        );
        const d = await res.json();
        const photos: LibraryPhoto[] = (d.data ?? []).map(
          (m: { id: string; public_url: string; filename: string }) => ({
            id: m.id,
            public_url: m.public_url,
            label: m.filename,
            source_type: "media" as const,
            media_id: m.id,
            source_id: m.id,
          }),
        );
        setLibrary(photos);
      } else {
        // Liked shots via le moteur de sources motion
        const res = await fetch("/api/da/motion/sources?mode=ambiance", {
          cache: "no-store",
        });
        const d = await res.json();
        const likedSources: Array<{
          type: string;
          id: string;
          public_url: string;
          label: string;
        }> = (d.sources ?? []).filter(
          (s: { type: string }) => s.type === "liked-shot",
        );
        setLibrary(
          likedSources.map((s) => ({
            id: s.id,
            public_url: s.public_url,
            label: s.label,
            source_type: "liked-shot" as const,
            media_id: null,
            source_id: s.id,
          })),
        );
      }
    } catch {
      setLibrary([]);
    } finally {
      setLibLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary(tab);
  }, [tab, loadLibrary]);

  // ─── Actions séquence ───────────────────────────────────────────────────────

  const addToSequence = (photo: LibraryPhoto) => {
    setSequence((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        shot_type: SHOT_TYPES[Math.min(prev.length, SHOT_TYPES.length - 1)],
        public_url: photo.public_url,
        media_id: photo.media_id,
        source_type: photo.source_type,
        source_id: photo.source_id,
      },
    ]);
  };

  const removeFromSequence = (uid: string) => {
    setSequence((prev) => prev.filter((s) => s.uid !== uid));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSequence((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setSequence((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const setShotType = (uid: string, shot_type: string) => {
    setSequence((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, shot_type } : s)),
    );
  };

  // ─── Sauvegarde ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!label.trim()) {
      setError("Donne un nom à ta collection.");
      return;
    }
    if (sequence.length === 0) {
      setError("Ajoute au moins une photo à la séquence.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      label: label.trim(),
      description: description.trim() || null,
      shots: sequence.map((s, i) => ({
        shot_type: s.shot_type,
        public_url: s.public_url,
        media_id: s.media_id,
        source_type: s.source_type,
        source_id: s.source_id,
        ordre: i,
      })),
    };

    try {
      const url = isEdit
        ? `/api/da/motion/collections/${initial!.id}`
        : "/api/da/motion/collections";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");
      router.push("/atelier-da/motion/collections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSaving(false);
    }
  };

  // ─── Filtrage bibliothèque ───────────────────────────────────────────────────

  const filtered = q.trim()
    ? library.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()))
    : library;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Nom + description */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Nom de la collection</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Fête des Mères 2026 — Clémence"
            style={{ ...inputStyle, flex: 2, minWidth: 260 }}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnel)"
            style={{ ...inputStyle, flex: 3, minWidth: 200 }}
          />
        </div>
      </section>

      {/* Corps : bibliothèque + séquence */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Bibliothèque */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Bibliothèque</h2>
            <div style={{ display: "flex", gap: 6 }}>
              <TabBtn active={tab === "media"} onClick={() => setTab("media")}>
                <ImageIcon size={11} /> Médiathèque
              </TabBtn>
              <TabBtn
                active={tab === "liked-shot"}
                onClick={() => setTab("liked-shot")}
              >
                <Heart size={11} fill={tab === "liked-shot" ? "#E2627C" : "none"} stroke="#E2627C" /> Shots likés
              </TabBtn>
            </div>
          </div>

          {/* Recherche */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.4,
              }}
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer par nom…"
              style={{ ...inputStyle, paddingLeft: 30, width: "100%" }}
            />
          </div>

          {libLoading ? (
            <div style={{ textAlign: "center", padding: 32 }}>
              <Loader2 size={20} className="animate-spin" style={{ opacity: 0.3 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                opacity: 0.5,
              }}
            >
              {tab === "media"
                ? "Aucun média trouvé. Upload des photos dans la Médiathèque."
                : "Aucun shot liké. Like des photos dans l'Atelier Shooting."}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: 6,
                maxHeight: 520,
                overflowY: "auto",
              }}
            >
              {filtered.map((photo) => {
                const alreadyIn = sequence.some(
                  (s) => s.source_id === photo.source_id,
                );
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => !alreadyIn && addToSequence(photo)}
                    title={photo.label}
                    style={{
                      position: "relative",
                      aspectRatio: "4/5",
                      background: "var(--hub-bg)",
                      border: alreadyIn
                        ? "1.5px solid var(--hub-foreground)"
                        : "0.5px solid var(--hub-border)",
                      borderRadius: 6,
                      overflow: "hidden",
                      padding: 0,
                      cursor: alreadyIn ? "default" : "pointer",
                      opacity: alreadyIn ? 0.55 : 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.public_url}
                      alt={photo.label}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {alreadyIn && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(26,22,20,0.4)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={16} color="white" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Séquence */}
        <section style={sectionStyle}>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 12 }}>
            Séquence de clips
            {sequence.length > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  background: "var(--hub-foreground)",
                  color: "var(--hub-bg)",
                  borderRadius: 999,
                  padding: "2px 7px",
                  verticalAlign: "middle",
                }}
              >
                {sequence.length}
              </span>
            )}
          </h2>

          {sequence.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--hub-border)",
                borderRadius: 10,
                padding: 28,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                opacity: 0.5,
              }}
            >
              <Film
                size={22}
                style={{ display: "block", margin: "0 auto 8px", opacity: 0.4 }}
              />
              Clique sur une photo
              <br />
              pour l&apos;ajouter ici.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sequence.map((slot, i) => (
                <div
                  key={slot.uid}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    background: "var(--hub-bg)",
                    border: "0.5px solid var(--hub-border)",
                    borderRadius: 8,
                    padding: "6px 8px",
                  }}
                >
                  {/* Numéro */}
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--hub-foreground)",
                      opacity: 0.4,
                      minWidth: 14,
                      textAlign: "center",
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Vignette */}
                  <div
                    style={{
                      width: 44,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: 4,
                      overflow: "hidden",
                      background: "var(--hub-border)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.public_url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>

                  {/* Shot type */}
                  <select
                    value={slot.shot_type}
                    onChange={(e) => setShotType(slot.uid, e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      border: "0.5px solid var(--hub-border)",
                      borderRadius: 6,
                      padding: "4px 6px",
                      background: "white",
                      color: "var(--hub-foreground)",
                      cursor: "pointer",
                    }}
                  >
                    {SHOT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      style={arrowBtnStyle(i === 0)}
                    >
                      <ArrowUp size={11} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === sequence.length - 1}
                      style={arrowBtnStyle(i === sequence.length - 1)}
                    >
                      <ArrowDown size={11} strokeWidth={2} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromSequence(slot.uid)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--hub-foreground)",
                      opacity: 0.45,
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Erreur */}
      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #E2A8A2",
            borderRadius: 8,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={() => router.push("/atelier-da/motion/collections")}
          style={{
            background: "transparent",
            border: "0.5px solid var(--hub-border)",
            borderRadius: 9999,
            padding: "10px 20px",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--hub-foreground)",
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "var(--color-brand-rose, #A76059)",
            color: "white",
            border: "none",
            borderRadius: 9999,
            padding: "10px 24px",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer la collection"}
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 11px",
        borderRadius: 9999,
        border: active ? "1px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
        background: active ? "var(--hub-foreground)" : "white",
        color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: "white",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 12,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: "0 0 14px 0",
  color: "var(--hub-foreground)",
  opacity: 0.7,
};

const inputStyle: React.CSSProperties = {
  background: "var(--hub-bg)",
  border: "0.5px solid var(--hub-border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--hub-foreground)",
  outline: "none",
  boxSizing: "border-box",
};

function arrowBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "0.5px solid var(--hub-border)",
    borderRadius: 4,
    padding: "2px 3px",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.2 : 0.7,
    display: "flex",
    alignItems: "center",
    color: "var(--hub-foreground)",
  };
}
