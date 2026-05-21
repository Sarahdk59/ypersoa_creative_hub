/**
 * /atelier-da/incarnations/new — création d'une nouvelle incarnation.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import type { Motif } from "@/types/incarnations";
import { createIncarnation, fetchMotifs } from "@/lib/incarnations/api-client";
import {
  IncarnationForm,
  type IncarnationFormValues,
} from "@/components/incarnations/IncarnationForm";

export default function NewIncarnationPage() {
  const router = useRouter();
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMotifs()
      .then(setMotifs)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (values: IncarnationFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const created = await createIncarnation({
        code: values.code || undefined,
        nom_commercial: values.nom_commercial,
        motif_ypm: values.motif_ypm,
        spec_broderie: values.spec_broderie,
        gabarits_cibles: values.gabarits_cibles,
        collections_cibles: values.collections_cibles,
        ton: values.ton,
        statut: values.statut,
        notes: values.notes || undefined,
      });
      router.push(`/atelier-da/incarnations/${encodeURIComponent(created.code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de création");
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/atelier-da/incarnations" style={backLinkStyle}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Incarnations
      </Link>

      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-editorial)",
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Nouvelle incarnation
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--hub-foreground)",
            opacity: 0.65,
            maxWidth: 720,
            margin: 0,
          }}
        >
          Crée une déclinaison éditoriale d&apos;un motif YPM (ex. TONTON CLUB, BFF GANG). Définis
          la spec broderie + les gabarits cibles + les collections Shopify et le statut workflow.
        </p>
      </header>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <IncarnationForm
          mode="create"
          motifs={motifs}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/atelier-da/incarnations")}
          saving={saving}
          error={error}
        />
      )}
    </div>
  );
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
