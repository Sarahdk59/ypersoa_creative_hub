"use client";

import { X, Calendar, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useState } from "react";

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}
interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

// Mapping occasion → pilier + étape tunnel
const OCCASION_META: Record<string, { pilier: string; etape: string }> = {
  "fete-des-meres": { pilier: "La Famille · Fête des Mères", etape: "Conversion" },
  "fete-des-peres": { pilier: "La Famille · Fête des Pères", etape: "Conversion" },
  "fete-grands-meres": { pilier: "La Famille · Grands-Mères", etape: "Conversion" },
  naissance: { pilier: "La Famille · Naissance", etape: "Conversion" },
  mariage: { pilier: "La Famille · Mariage", etape: "Conversion" },
  noel: { pilier: "La Famille · Noël", etape: "Conversion" },
  amour: { pilier: "La Communauté · Duo", etape: "Fidélisation" },
  rentree: { pilier: "La Marque · Rentrée", etape: "Acquisition" },
  ete: { pilier: "La Marque · Été", etape: "Acquisition" },
  nounou: { pilier: "La Famille · Merci", etape: "Conversion" },
  quotidien: { pilier: "La Marque · Produit", etape: "Acquisition" },
};

const ETAPE_COLORS: Record<string, string> = {
  Acquisition: "#1E6E77",
  Conversion: "#A75F59",
  Fidélisation: "#16324C",
};

const MOTIFS_QUICK = [
  { code: "YPM-001", nom: "La Brigitte" },
  { code: "YPM-002", nom: "L'Ambre" },
  { code: "YPM-003", nom: "Le Club" },
  { code: "YPM-004", nom: "Notre Héritage" },
  { code: "YPM-005", nom: "L'Annonce" },
  { code: "YPM-006", nom: "Le Câlin" },
  { code: "YPM-007", nom: "Le Chouchou" },
  { code: "YPM-008", nom: "La Féline" },
  { code: "YPM-009", nom: "La Palette" },
  { code: "YPM-015", nom: "La Déclaration" },
  { code: "YPM-016", nom: "La Signature" },
];

const PLATFORM_FORMAT: Record<string, { label: string; platform: "instagram_post" | "pinterest_pin"; format: "4:5" | "2:3" }> = {
  instagram: { label: "Post feed · lifestyle (4:5)", platform: "instagram_post", format: "4:5" },
  pinterest: { label: "Pin · vertical (2:3)", platform: "pinterest_pin", format: "2:3" },
};

// Hashtags de marque Ypersoa (identifiés par leur racine normalisée)
const BRAND_SLUGS = new Set([
  "ypersoa", "leclubypersoa", "brode", "broderie", "broderiepersonnalisee",
  "brodesurcommande", "hautsdefrance", "atelierhdf", "cadeaupersonnalise",
  "atelier", "iconeclub", "teeblanc", "brodepersonnalise",
]);

function isHashtagBrand(tag: string): boolean {
  const slug = tag
    .replace(/^#/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return BRAND_SLUGS.has(slug);
}

export interface PostCardProps {
  /** Data-URL de l'image courante (slide sélectionnée). */
  image: string | null;
  /** Caption narrative (générée par OpenAI). */
  caption: string | null;
  /** 5 hooks : [Émotion, Question, POV, Humour, Affirmation]. */
  hooks: string[];
  /** Hashtags Instagram. */
  hashtags: string[];
  brandSafety: BrandSafety | null;
  platform: "instagram" | "pinterest";
  /** ID d'occasion (ex. "fete-des-meres"). */
  occasion: string;
  /** Prompt personnalisé de Sarah (intention du post). */
  customPrompt?: string;
  /** URL de l'app Planable (défaut : NEXT_PUBLIC_PLANABLE_URL). */
  planableUrl?: string;
  /** Callback fermeture de l'overlay. */
  onClose: () => void;
}

export function PostCard({
  image,
  caption,
  hooks,
  hashtags,
  brandSafety,
  platform,
  occasion,
  customPrompt,
  planableUrl,
  onClose,
}: PostCardProps) {
  const pUrl = planableUrl || process.env.NEXT_PUBLIC_PLANABLE_URL || "http://localhost:3002";

  const meta = OCCASION_META[occasion] ?? { pilier: "La Marque", etape: "Acquisition" };
  const platMeta = PLATFORM_FORMAT[platform] ?? PLATFORM_FORMAT.instagram;

  // Titre éditorial : Affirmation hook (court, percutant) ou fallback
  const editorialTitle = hooks[4] || hooks[0] || "Un post au fil de l'atelier.";
  // Variante A = Affirmation (courte / punchy)
  const variantA = hooks[4] || "";
  // Variante B = Question (engagement / commentaires)
  const variantB = hooks[1] || "";

  const captionPreview = caption
    ? caption.slice(0, 220) + (caption.length > 220 ? "…" : "")
    : "";

  const occasionLabel = occasion
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // --- Planable scheduling ---
  const [schedDate, setSchedDate] = useState("2026-07-29");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedMotif, setSchedMotif] = useState("YPM-003");
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  const handleSchedule = async () => {
    if (scheduling) return;
    setScheduling(true);
    setSchedError(null);
    try {
      const scheduledAt = new Date(`${schedDate}T${schedTime}:00+02:00`).toISOString();
      const createRes = await fetch(`${pUrl}/api/calendar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduledAt,
          platform: platMeta.platform,
          motif_code: schedMotif,
          occasion_slug: occasion,
          format: platMeta.format,
          notes: caption?.slice(0, 500) ?? null,
        }),
      }).then((r) => r.json());

      if (!createRes.ok) {
        throw new Error(
          typeof createRes.error === "string"
            ? createRes.error
            : Array.isArray(createRes.error)
            ? createRes.error.map((e: { message: string }) => e.message).join(", ")
            : "Erreur création entrée Planable"
        );
      }

      const entryId: string | undefined = createRes.data?.id;
      if (entryId && image) {
        const attachRes = await fetch(`${pUrl}/api/calendar/${entryId}/attach-image`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            image_data_url: image,
            angle: "Post feed — slide principale",
            caption: caption?.slice(0, 2000) ?? null,
          }),
        }).then((r) => r.json());
        if (!attachRes.ok) {
          throw new Error(attachRes.error || "Image non attachée (entrée créée quand même)");
        }
      }
      setScheduled(true);
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : String(e));
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 22, 20, 0.72)",
        zIndex: 100,
        overflow: "auto",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 24px 48px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F4EEE2",
          borderRadius: 20,
          maxWidth: 1160,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Bouton fermer */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(26,22,20,0.08)",
            border: "none",
            borderRadius: 999,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
          aria-label="Fermer"
        >
          <X size={15} color="#1A1614" />
        </button>

        {/* En-tête éditorial */}
        <div style={{ padding: "36px 48px 20px" }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#1E6E77",
              margin: "0 0 10px",
            }}
          >
            Ypersoa · Contenu de post
          </p>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 36,
              fontWeight: 500,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "#1A1614",
              maxWidth: 680,
            }}
          >
            {editorialTitle}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "#1A1614",
              opacity: 0.5,
              margin: 0,
            }}
          >
            {platMeta.label} · {occasionLabel} · tutoiement · 1 CTA
          </p>
        </div>

        {/* Corps : 2 colonnes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            padding: "0 48px 40px",
            alignItems: "start",
          }}
        >
          {/* ── Colonne gauche : mockup Instagram + Planable ── */}
          <div style={{ paddingRight: 28 }}>
            {/* Mockup Instagram */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                overflow: "hidden",
                border: "0.5px solid rgba(26,22,20,0.10)",
                boxShadow: "0 4px 28px rgba(26,22,20,0.08)",
                maxWidth: 420,
              }}
            >
              {/* Header post */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  gap: 8,
                  borderBottom: "0.5px solid rgba(26,22,20,0.05)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #1E6E77, #16324C)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Y
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1A1614",
                    }}
                  >
                    ypersoa
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      color: "#1A1614",
                      opacity: 0.45,
                    }}
                  >
                    Wattrelos · Hauts-de-France
                  </p>
                </div>
                <div style={{ display: "flex", gap: 3, opacity: 0.25 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{ width: 4, height: 4, borderRadius: "50%", background: "#1A1614" }}
                    />
                  ))}
                </div>
              </div>

              {/* Image */}
              <div
                style={{
                  aspectRatio: platform === "pinterest" ? "2/3" : "4/5",
                  background: "#ECE3D5",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt="Visuel généré"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "#1A1614",
                      opacity: 0.3,
                    }}
                  >
                    Aucun visuel sélectionné
                  </div>
                )}
              </div>

              {/* Actions + légende */}
              <div style={{ padding: "8px 12px 12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
                    <span style={{ color: "#e0354b" }}>♥</span>
                    <span style={{ opacity: 0.5 }}>○</span>
                    <span style={{ opacity: 0.5 }}>✈</span>
                  </div>
                  <span style={{ fontSize: 18, opacity: 0.35 }}>⊡</span>
                </div>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#1A1614",
                  }}
                >
                  Aimé par leclubypersoa et 312 autres
                </p>
                {captionPreview && (
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "#1A1614",
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    <strong>ypersoa&nbsp;</strong>
                    {captionPreview}
                  </p>
                )}
                <p
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 9,
                    color: "#1A1614",
                    opacity: 0.35,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Il y a 2 heures
                </p>
              </div>
            </div>

            {/* Planable scheduling */}
            <div
              style={{
                marginTop: 18,
                background: "white",
                borderRadius: 14,
                border: "0.5px solid rgba(26,22,20,0.10)",
                padding: "16px 18px",
                maxWidth: 420,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#1E6E77",
                  margin: "0 0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Calendar size={13} />
                Programmer dans Planable
              </p>

              {scheduled ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "#3D7A3A",
                  }}
                >
                  <CheckCircle2 size={15} />
                  Entrée créée dans Planable !
                  <a
                    href={pUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginLeft: "auto",
                      color: "#1E6E77",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      textDecoration: "none",
                    }}
                  >
                    Ouvrir <ExternalLink size={11} />
                  </a>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Date</label>
                      <input
                        type="date"
                        value={schedDate}
                        onChange={(e) => setSchedDate(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Heure</label>
                      <input
                        type="time"
                        value={schedTime}
                        onChange={(e) => setSchedTime(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Motif</label>
                    <select
                      value={schedMotif}
                      onChange={(e) => setSchedMotif(e.target.value)}
                      style={inputStyle}
                    >
                      {MOTIFS_QUICK.map((m) => (
                        <option key={m.code} value={m.code}>
                          {m.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  {schedError && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        color: "#A75F59",
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        marginBottom: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      {schedError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={scheduling}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      borderRadius: 999,
                      border: "none",
                      background: scheduling ? "#aaa" : "#1E6E77",
                      color: "white",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: scheduling ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "background 0.2s",
                    }}
                  >
                    {scheduling ? (
                      <>
                        <span
                          style={{ display: "inline-block", animation: "spin 1s linear infinite" }}
                        >
                          ⏳
                        </span>
                        Programmation…
                      </>
                    ) : (
                      <>
                        <Calendar size={13} />
                        Programmer ce post
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Colonne droite : La Fiche + Variantes + Hashtags ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* La Fiche */}
            <div
              style={{
                background: "white",
                borderRadius: 14,
                border: "0.5px solid rgba(26,22,20,0.10)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "11px 16px",
                  borderBottom: "0.5px solid rgba(26,22,20,0.07)",
                }}
              >
                <p style={sectionLabelStyle}>La Fiche</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    { label: "Pilier", value: meta.pilier },
                    {
                      label: "Étape tunnel",
                      value: meta.etape,
                      color: ETAPE_COLORS[meta.etape],
                    },
                    { label: "Format", value: platMeta.label },
                    {
                      label: "Intention",
                      value: customPrompt?.slice(0, 90) || `Engager sur ${occasionLabel}`,
                    },
                    { label: "CTA unique", value: "ypersoa.fr" },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      style={{ borderBottom: "0.5px solid rgba(26,22,20,0.05)" }}
                    >
                      <td
                        style={{
                          padding: "8px 16px",
                          fontFamily: "var(--font-sans)",
                          fontSize: 11,
                          color: "#1E6E77",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          width: 120,
                          verticalAlign: "top",
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: "8px 16px",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: row.color ?? "#1A1614",
                          fontWeight: row.color ? 600 : 400,
                          lineHeight: 1.4,
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Variantes de légende */}
            {(variantA || variantB) && (
              <div
                style={{
                  background: "white",
                  borderRadius: 14,
                  border: "0.5px solid rgba(26,22,20,0.10)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "11px 16px",
                    borderBottom: "0.5px solid rgba(26,22,20,0.07)",
                  }}
                >
                  <p style={sectionLabelStyle}>Variantes de légende</p>
                </div>
                {variantA && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "0.5px solid rgba(26,22,20,0.05)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "#A75F59",
                        margin: "0 0 6px",
                      }}
                    >
                      A · Courte, Punchy
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "#1A1614",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {variantA}
                    </p>
                  </div>
                )}
                {variantB && (
                  <div style={{ padding: "12px 16px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: "#16324C",
                        margin: "0 0 6px",
                      }}
                    >
                      B · Engagement / Commentaires
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "#1A1614",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {variantB}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Jeu de hashtags */}
            {hashtags.length > 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: 14,
                  border: "0.5px solid rgba(26,22,20,0.10)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "11px 16px",
                    borderBottom: "0.5px solid rgba(26,22,20,0.07)",
                  }}
                >
                  <p style={sectionLabelStyle}>Jeu de hashtags · {hashtags.length}</p>
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {hashtags.map((tag) => {
                    const brand = isHashtagBrand(tag);
                    return (
                      <span
                        key={tag}
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 11.5,
                          padding: "4px 11px",
                          borderRadius: 999,
                          background: brand ? "#1E6E77" : "#EDE4D8",
                          color: brand ? "white" : "#6B4F2A",
                          fontWeight: brand ? 600 : 400,
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: "8px 16px 12px",
                    borderTop: "0.5px solid rgba(26,22,20,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "#A75F59",
                    }}
                  >
                    × Jamais #faitmain ni #artisanal
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "#3D7A3A",
                    }}
                  >
                    · ✓ tutoiement, 1 cœur rouge max
                  </span>
                  {brandSafety && !brandSafety.safe && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        color: "#A75F59",
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ {brandSafety.criticalViolations.length} violation
                      {brandSafety.criticalViolations.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Styles partagés ────────────────────────────────────────────────────────────

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: "#1E6E77",
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "#1A1614",
  opacity: 0.45,
  display: "block",
  marginBottom: 3,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "0.5px solid rgba(26,22,20,0.15)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  background: "#FAF7F2",
  color: "#1A1614",
  boxSizing: "border-box",
};
