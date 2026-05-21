/**
 * /atelier-da/incarnations/[code] — fiche détaillée éditable.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileJson, Loader2, Trash2 } from "lucide-react";

import type { IncarnationEnriched, Motif } from "@/types/incarnations";
import {
  deleteIncarnation,
  fetchIncarnationByCode,
  fetchMotifs,
  updateIncarnation,
} from "@/lib/incarnations/api-client";
import {
  IncarnationForm,
  type IncarnationFormValues,
} from "@/components/incarnations/IncarnationForm";
import { VarianteSelector } from "@/components/incarnations/VarianteSelector";
import { PhotosSection } from "@/components/incarnations/PhotosSection";
import { ShopifyExportModal } from "@/components/incarnations/ShopifyExportModal";

export default function IncarnationDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params.code);

  const [incarnation, setIncarnation] = useState<IncarnationEnriched | null>(null);
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchIncarnationByCode(code), fetchMotifs()])
      .then(([inc, m]) => {
        if (cancelled) return;
        setIncarnation(inc);
        setMotifs(m);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleSubmit = async (values: IncarnationFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateIncarnation(code, {
        nom_commercial: values.nom_commercial,
        motif_ypm: values.motif_ypm,
        spec_broderie: values.spec_broderie,
        gabarits_cibles: values.gabarits_cibles,
        collections_cibles: values.collections_cibles,
        ton: values.ton,
        statut: values.statut,
        notes: values.notes || undefined,
      });
      setIncarnation(updated);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectVariante = async (file: string | null) => {
    if (!incarnation) return;
    try {
      const updated = await updateIncarnation(code, { variante_file: file });
      setIncarnation(updated);
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur liaison variante");
    }
  };

  const handleDelete = async () => {
    if (!incarnation) return;
    if (!confirm(`Supprimer définitivement ${incarnation.code} (${incarnation.nom_commercial}) ?`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteIncarnation(code);
      router.push("/atelier-da/incarnations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!incarnation) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href="/atelier-da/incarnations" style={backLinkStyle}>
          <ArrowLeft size={14} strokeWidth={1.6} /> Incarnations
        </Link>
        <div
          style={{
            padding: 32,
            border: "1px solid #E2A8A2",
            borderRadius: 12,
            background: "#FAEBE8",
            color: "#7C2A24",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
          }}
        >
          Incarnation introuvable {error ? `(${error})` : ""}.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/incarnations" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Incarnations
      </Link>

      <header
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--hub-foreground)",
              opacity: 0.55,
              fontWeight: 600,
            }}
          >
            {incarnation.code} · {incarnation.motif_ypm} {incarnation.motif_nom ? `· ${incarnation.motif_nom}` : ""}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-editorial)",
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.015em",
              margin: "6px 0 0 0",
            }}
          >
            {incarnation.nom_commercial}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {savedAt && (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "#365D40",
              }}
            >
              Sauvegardé à {savedAt.toLocaleTimeString("fr-FR")}
            </span>
          )}
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            style={{
              background: "var(--hub-foreground)",
              color: "var(--hub-bg)",
              border: "none",
              borderRadius: 9999,
              padding: "8px 16px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FileJson size={12} /> Metafield Shopify
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "transparent",
              border: "0.5px solid #E2A8A2",
              color: "#7C2A24",
              borderRadius: 9999,
              padding: "8px 16px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              cursor: deleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={12} /> {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </header>

      {exportOpen && (
        <ShopifyExportModal
          motifYpm={incarnation.motif_ypm}
          motifNom={incarnation.motif_nom}
          onClose={() => setExportOpen(false)}
        />
      )}

      <IncarnationForm
        mode="edit"
        motifs={motifs}
        initial={incarnation}
        onSubmit={handleSubmit}
        saving={saving}
        error={error}
      />

      {/* Variante du motif */}
      <section
        style={{
          marginTop: 24,
          padding: 20,
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
            color: "var(--hub-foreground)",
            opacity: 0.7,
          }}
        >
          Variante du motif
        </h3>
        <VarianteSelector
          motifId={incarnation.motif_ypm}
          motifNom={incarnation.motif_nom}
          currentFile={incarnation.variante_file ?? null}
          suggestedLabel={incarnation.nom_commercial}
          onSelect={handleSelectVariante}
        />
      </section>

      {/* Bibliothèque visuelle — photos médiathèque */}
      <section
        style={{
          marginTop: 24,
          padding: 20,
          background: "white",
          border: "0.5px solid var(--hub-border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: 0,
            color: "var(--hub-foreground)",
            opacity: 0.7,
          }}
        >
          Bibliothèque visuelle ({incarnation.photos.length})
        </h3>
        <PhotosSection
          incarnationCode={incarnation.code}
          incarnationSlug={slugifyIncarnation(incarnation.nom_commercial)}
          motifYpm={incarnation.motif_ypm}
          gabaritsCibles={incarnation.gabarits_cibles}
        />
      </section>
    </div>
  );
}

function slugifyIncarnation(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--hub-foreground)",
  opacity: 0.6,
  textDecoration: "none",
  marginBottom: 16,
};
