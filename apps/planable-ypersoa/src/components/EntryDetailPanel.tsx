"use client";
import { ExternalLink, Loader2, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { OCCASION_LABEL, PLATFORM_LABEL } from "@/lib/brand/tokens";
import { frDate } from "@/lib/utils/date";
import type { PlanableCalendarEntryRow, PlanablePackRow } from "@/lib/supabase/types";

interface DetailEntry extends PlanableCalendarEntryRow {
  planable_packs?: PlanablePackRow | null;
}

const ATELIER_SOCIAL_URL = process.env.NEXT_PUBLIC_ATELIER_SOCIAL_URL ?? "http://localhost:3000";

function buildAtelierUrl(entry: PlanableCalendarEntryRow): string {
  const url = new URL("/atelier-da/shooting-book", ATELIER_SOCIAL_URL);
  url.searchParams.set("motif", entry.motif_code);
  if (entry.occasion_slug) {
    const label = OCCASION_LABEL[entry.occasion_slug] ?? entry.occasion_slug;
    const platform = PLATFORM_LABEL[entry.platform] ?? entry.platform;
    const brief = `${label} — ${platform} format ${entry.format}` + (entry.notes ? `. ${entry.notes}` : ".");
    url.searchParams.set("brief", brief);
  }
  return url.toString();
}

export function EntryDetailPanel({
  entry,
  onClose,
  onGeneratePack,
  onDelete,
  onEdit,
}: {
  entry: DetailEntry;
  onClose: () => void;
  onGeneratePack: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pack = entry.planable_packs;

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "white", border: "0.5px solid var(--color-border)",
      borderRadius: 12, padding: 16, gap: 12, overflow: "auto",
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, margin: 0 }}>
            {frDate(entry.scheduled_at, "EEEE d MMMM · HH:mm")}
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.55, margin: "4px 0 0 0" }}>
            <code>{entry.id.slice(0, 8)}…</code>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" style={iconBtn}>
          <X size={14} />
        </button>
      </header>

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", margin: 0, fontFamily: "var(--font-sans)", fontSize: 12 }}>
        <dt style={dtStyle}>Plateforme</dt>
        <dd style={ddStyle}>{PLATFORM_LABEL[entry.platform]}</dd>
        <dt style={dtStyle}>Format</dt>
        <dd style={ddStyle}>{entry.format}</dd>
        <dt style={dtStyle}>Motif</dt>
        <dd style={ddStyle}><code>{entry.motif_code}</code></dd>
        <dt style={dtStyle}>Occasion</dt>
        <dd style={ddStyle}>{entry.occasion_slug ?? "—"}</dd>
        <dt style={dtStyle}>Statut</dt>
        <dd style={ddStyle}>
          <StatusBadge status={entry.status} />
        </dd>
      </dl>

      {entry.notes && (
        <div style={{
          padding: "10px 12px", background: "var(--color-cream)", borderRadius: 8,
          fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.5, opacity: 0.85,
        }}>
          {entry.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onEdit}
          style={{ ...iconBtn, flex: 1 }}
        >
          <Pencil size={13} /> Modifier
        </button>
        {entry.status !== "published" && (
          <button
            type="button"
            onClick={async () => { setGenerating(true); await onGeneratePack(); setGenerating(false); }}
            disabled={generating}
            style={{ ...primaryBtn, flex: 1 }}
          >
            {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generating ? "Génération…" : pack ? "Régénérer le pack" : "Générer le pack"}
          </button>
        )}
      </div>

      <a
        href={buildAtelierUrl(entry)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 14px", borderRadius: 999,
          background: "var(--color-terracotta)", color: "white",
          fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
          textDecoration: "none",
        }}
      >
        <ExternalLink size={13} /> Ouvrir dans atelier-social
      </a>

      {pack && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={sectionTitle}>Aperçu pack ({Array.isArray(pack.slides) ? pack.slides.length : 0} slides)</h3>
          <div style={{ display: "flex", gap: 6, overflow: "auto", paddingBottom: 4 }}>
            {Array.isArray(pack.slides) && (pack.slides as { image_url: string; angle: string }[]).map((s, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} src={s.image_url} alt={s.angle ?? `slide ${i}`} style={{
                height: 120, borderRadius: 6, border: "0.5px solid var(--color-border)", flexShrink: 0,
              }} />
            ))}
          </div>
          <div>
            <h3 style={sectionTitle}>Caption</h3>
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.5, margin: 0,
              padding: "10px 12px", background: "var(--color-cream)", borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}>{pack.caption}</p>
          </div>
          <div>
            <h3 style={sectionTitle}>Brand safety</h3>
            <BrandSafetyBadge status={pack.brand_safety_status} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled style={{ ...primaryBtn, opacity: 0.5, cursor: "not-allowed" }}>
              Publier (V1.2)
            </button>
          </div>
        </div>
      )}

      {entry.status !== "published" && (
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Supprimer cette entrée ?")) return;
            setDeleting(true); await onDelete(); setDeleting(false);
          }}
          disabled={deleting}
          style={{ ...iconBtn, marginTop: "auto", color: "#c53030", borderColor: "#c53030" }}
          aria-label="Supprimer l'entrée"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Supprimer
        </button>
      )}
      {entry.status === "published" && (
        <p style={{
          marginTop: "auto", padding: "8px 12px", borderRadius: 8,
          background: "rgba(47,122,62,0.08)", color: "#2f7a3e",
          fontFamily: "var(--font-sans)", fontSize: 11, lineHeight: 1.5, margin: 0,
        }}>
          Cette entrée est déjà publiée — suppression désactivée.
        </p>
      )}
    </aside>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    draft: ["#1A1614", "rgba(26,22,20,0.08)"],
    pack_generated: ["#1A2E4F", "rgba(26,46,79,0.12)"],
    scheduled: ["#B4665F", "rgba(180,102,95,0.12)"],
    published: ["#2f7a3e", "rgba(47,122,62,0.12)"],
    failed: ["#c53030", "rgba(197,48,48,0.12)"],
  };
  const [c, bg] = colors[status] ?? ["#1A1614", "rgba(26,22,20,0.08)"];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 999, background: bg, color: c,
      fontSize: 11, fontWeight: 500, fontFamily: "var(--font-sans)",
    }}>{status}</span>
  );
}

function BrandSafetyBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    ok: { color: "#2f7a3e", label: "✅ OK" },
    warning: { color: "#c5660d", label: "⚠ Warning" },
    critical: { color: "#c53030", label: "🚫 Critical" },
  };
  const m = map[status] ?? map.ok;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, color: m.color,
      border: `1px solid ${m.color}`, fontSize: 11, fontFamily: "var(--font-sans)",
    }}>{m.label}</span>
  );
}

const dtStyle: React.CSSProperties = { fontWeight: 600, opacity: 0.55, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 };
const ddStyle: React.CSSProperties = { margin: 0 };
const sectionTitle: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55, margin: "0 0 6px 0" };
const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "6px 12px", borderRadius: 999, background: "white",
  border: "0.5px solid var(--color-border)", cursor: "pointer", fontSize: 12,
  fontFamily: "var(--font-sans)",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "10px 16px", borderRadius: 999, background: "var(--color-ink)",
  color: "var(--color-cream)", border: "none", cursor: "pointer",
  fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500,
};
