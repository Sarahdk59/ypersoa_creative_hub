/**
 * Médiathèque — page upload batch.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

import type { Tag } from "@/types/mediatheque";
import { fetchTags } from "@/lib/mediatheque/api-client";
import { UploadDropzone } from "@/components/mediatheque/UploadDropzone";
import { QuickAddPanel } from "@/components/mediatheque/QuickAddPanel";

export default function MediathequeUploadPage() {
  const router = useRouter();
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    fetchTags()
      .then((r) => {
        setTagsByCategory(r.by_category);
        setTagsLoaded(true);
      })
      .catch(() => setTagsLoaded(true));
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Link
        href="/atelier-da/mediatheque"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--hub-foreground)",
          opacity: 0.6,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} strokeWidth={1.6} /> Médiathèque
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
          Uploader des photos
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
          Ajout rapide d&apos;un shooting en quelques clics : motif, gabarit, couleur, puis les photos.
          Besoin de tags fins ou de réglages source/date par lot ? L&apos;ajout détaillé est plus bas.
        </p>
      </header>

      {uploadedCount > 0 && (
        <div
          style={{
            background: "white",
            border: "0.5px solid var(--hub-border)",
            borderLeft: "3px solid #365D40",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={14} color="#365D40" strokeWidth={2} />
            {uploadedCount} photo{uploadedCount > 1 ? "s" : ""} ajoutée{uploadedCount > 1 ? "s" : ""} à la médiathèque
          </span>
          <button
            type="button"
            onClick={() => router.push("/atelier-da/mediatheque")}
            style={{
              background: "var(--hub-foreground)",
              color: "var(--hub-bg)",
              border: "none",
              borderRadius: 9999,
              padding: "6px 14px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Voir la galerie
          </button>
        </div>
      )}

      {!tagsLoaded ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <QuickAddPanel
            tagsByCategory={tagsByCategory}
            onUploaded={setUploadedCount}
          />

          <div>
            <button
              type="button"
              onClick={() => setBatchOpen((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--hub-foreground)",
                opacity: 0.7,
                padding: "8px 0",
              }}
            >
              {batchOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Ajout détaillé (tags avancés, source + date par lot)
            </button>
            {batchOpen && (
              <div style={{ marginTop: 8 }}>
                <UploadDropzone
                  tagsByCategory={tagsByCategory}
                  onUploaded={setUploadedCount}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
