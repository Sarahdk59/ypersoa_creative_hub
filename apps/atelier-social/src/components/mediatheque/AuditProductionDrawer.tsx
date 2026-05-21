/**
 * AuditProductionDrawer — vue "complétude" de la médiathèque.
 *
 * Affiche une matrice motifs × produits (18 × 5 = 90 cellules) avec 2 mini-slots
 * par cellule (lookbook + lifestyle). Permet à Sarah de voir d'un coup les
 * trous de production et d'uploader en 2 clics : click cellule vide → file
 * picker système → upload immédiat avec tags pré-remplis (motif + produit + plan).
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

import {
  fetchAuditMatrix,
  createMedia,
  type AuditMatrixResponse,
} from "@/lib/mediatheque/api-client";
import type { MediaSource } from "@/types/mediatheque";

const DEFAULT_MOTIFS = Array.from(
  { length: 18 },
  (_, i) => `ypm-${String(i).padStart(3, "0")}`,
);
const DEFAULT_PRODUITS = ["yp001", "yp004", "yp005", "yp019", "yp021"];
const DEFAULT_PLANS = ["lookbook", "lifestyle"];

const PLAN_SHORT: Record<string, string> = {
  lookbook: "LB",
  lifestyle: "LS",
};

const PLAN_SOURCE: Record<string, MediaSource> = {
  lookbook: "shooting_studio",
  lifestyle: "shooting_lifestyle",
};

interface AuditProductionDrawerProps {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

interface UploadingCell {
  motif: string;
  produit: string;
  plan: string;
}

function readFile(
  file: File,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () =>
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ dataUrl, width: 0, height: 0 });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function AuditProductionDrawer({
  open,
  onClose,
  onChanged,
}: AuditProductionDrawerProps) {
  const [data, setData] = useState<AuditMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCell, setPendingCell] = useState<UploadingCell | null>(null);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditMatrix({
        motifs: DEFAULT_MOTIFS,
        produits: DEFAULT_PRODUITS,
        plans: DEFAULT_PLANS,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Lock body scroll quand drawer ouvert
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleAddClick = useCallback((motif: string, produit: string, plan: string) => {
    setPendingCell({ motif, produit, plan });
    // Programmatic click ouvre le file picker système → 1 clic utilisateur
    requestAnimationFrame(() => fileInputRef.current?.click());
  }, []);

  const handleFileChosen = useCallback(
    async (file: File) => {
      const cell = pendingCell;
      if (!cell) return;
      const cellKey = `${cell.motif}__${cell.produit}__${cell.plan}`;
      setUploading((prev) => new Set(prev).add(cellKey));
      try {
        const { dataUrl, width, height } = await readFile(file);
        const tagIds = [
          `seed-motif-${cell.motif}`,
          `seed-gabarit-${cell.produit}`,
          `seed-plan-${cell.plan}`,
        ];
        await createMedia({
          filename: file.name,
          public_url: dataUrl,
          width: width || undefined,
          height: height || undefined,
          size_bytes: file.size,
          mime_type: file.type || "image/jpeg",
          source: PLAN_SOURCE[cell.plan] ?? "shooting_studio",
          tag_ids: tagIds,
        });
        setJustFilled((prev) => new Set(prev).add(cellKey));
        await load();
        onChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur upload");
      } finally {
        setUploading((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
        setPendingCell(null);
      }
    },
    [pendingCell, load, onChanged],
  );

  const totals = data?.totals;
  const couverturePct = useMemo(() => {
    if (!totals || totals.cells_total === 0) return 0;
    return Math.round((totals.cells_filled / totals.cells_total) * 100);
  }, [totals]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 22, 20, 0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 1000,
        }}
        aria-hidden
      />

      {/* Panneau drawer */}
      <div
        role="dialog"
        aria-label="Audit production"
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          right: 24,
          bottom: 24,
          background: "var(--hub-bg)",
          borderRadius: 20,
          boxShadow: "0 32px 64px rgba(26,22,20,0.35)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header sticky */}
        <header
          style={{
            padding: "20px 28px",
            borderBottom: "0.5px solid var(--hub-border)",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-editorial)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 4,
              }}
            >
              Audit production
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--hub-foreground)",
                opacity: 0.65,
                margin: 0,
              }}
            >
              {totals
                ? `${totals.cells_filled}/${totals.cells_total} cases remplies (${couverturePct}%) · ${totals.photos_total} photo${totals.photos_total > 1 ? "s" : ""} taggées motif+produit+plan`
                : "Chargement…"}
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "var(--hub-foreground)",
                opacity: 0.5,
                margin: "4px 0 0 0",
              }}
            >
              Click sur une case vide pour uploader (2 clics) — Lookbook (LB) =
              packshot porté, Lifestyle (LS) = en situation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 9999,
              width: 36,
              height: 36,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--hub-foreground)",
            }}
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </header>

        {/* Corps scrollable */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "20px 28px 28px",
          }}
        >
          {error && (
            <div
              style={{
                padding: 12,
                border: "1px solid #E2A8A2",
                borderRadius: 12,
                background: "#FAEBE8",
                color: "#7C2A24",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {loading && !data && (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--hub-foreground)",
                opacity: 0.6,
              }}
            >
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {data && (
            <AuditTable
              data={data}
              uploading={uploading}
              justFilled={justFilled}
              onAddClick={handleAddClick}
            />
          )}
        </div>

        {/* Footer info */}
        {pendingCell && (
          <div
            style={{
              padding: "10px 28px",
              background: "var(--hub-foreground)",
              color: "var(--hub-bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              borderTop: "0.5px solid var(--hub-border)",
            }}
          >
            <Loader2
              size={12}
              className="animate-spin"
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            Upload en cours : {pendingCell.motif.toUpperCase()} ·{" "}
            {pendingCell.produit.toUpperCase()} · {PLAN_SHORT[pendingCell.plan]}
          </div>
        )}

        {/* Input file caché (déclenché par programme) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // reset pour permettre re-upload même fichier
            if (file) handleFileChosen(file);
          }}
        />
      </div>
    </>
  );
}

// ─── TABLE ─────────────────────────────────────────────────────────────────

interface AuditTableProps {
  data: AuditMatrixResponse;
  uploading: Set<string>;
  justFilled: Set<string>;
  onAddClick: (motif: string, produit: string, plan: string) => void;
}

function AuditTable({ data, uploading, justFilled, onAddClick }: AuditTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          width: "100%",
          minWidth: 720,
          fontFamily: "var(--font-sans)",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                position: "sticky",
                left: 0,
                zIndex: 2,
                background: "var(--hub-bg)",
                padding: "10px 12px",
                textAlign: "left",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--hub-foreground)",
                opacity: 0.6,
                borderBottom: "0.5px solid var(--hub-border)",
                width: 220,
              }}
            >
              Motif
            </th>
            {data.produits.map((p) => (
              <th
                key={p.slug}
                style={{
                  padding: "10px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--hub-foreground)",
                  opacity: 0.7,
                  borderBottom: "0.5px solid var(--hub-border)",
                  minWidth: 130,
                  textAlign: "center",
                }}
              >
                <div>{p.slug.toUpperCase()}</div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 400,
                    letterSpacing: "0.04em",
                    textTransform: "none",
                    opacity: 0.6,
                    marginTop: 2,
                  }}
                >
                  {p.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.motifs.map((motif, motifIdx) => {
            const rowBg = motifIdx % 2 === 0 ? "white" : "rgba(255,255,255,0.55)";
            return (
              <tr key={motif.slug}>
                <th
                  scope="row"
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    background: rowBg,
                    padding: "10px 12px",
                    textAlign: "left",
                    borderBottom: "0.5px solid var(--hub-border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--hub-foreground)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {motif.slug.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--hub-foreground)",
                      opacity: 0.6,
                      fontFamily: "var(--font-editorial)",
                      fontStyle: "italic",
                    }}
                  >
                    {motif.label}
                  </div>
                </th>
                {data.produits.map((produit) => (
                  <td
                    key={produit.slug}
                    style={{
                      padding: "8px 6px",
                      background: rowBg,
                      borderBottom: "0.5px solid var(--hub-border)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                      }}
                    >
                      {data.plans.map((plan) => {
                        const cell = data.matrix[motif.slug]?.[produit.slug]?.[plan.slug];
                        const key = `${motif.slug}__${produit.slug}__${plan.slug}`;
                        const isUploading = uploading.has(key);
                        const isJustFilled = justFilled.has(key);
                        return (
                          <CellSlot
                            key={plan.slug}
                            cell={cell ?? { count: 0, sample: null }}
                            planShort={PLAN_SHORT[plan.slug] ?? plan.slug.slice(0, 2).toUpperCase()}
                            planLabel={plan.label}
                            isUploading={isUploading}
                            isJustFilled={isJustFilled}
                            onClick={() => {
                              if (isUploading) return;
                              if (!cell || cell.count === 0) {
                                onAddClick(motif.slug, produit.slug, plan.slug);
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── CELL SLOT (mini-vignette LB ou LS) ────────────────────────────────────

interface CellSlotProps {
  cell: { count: number; sample: { public_url: string; filename: string; count?: number } | null };
  planShort: string;
  planLabel: string;
  isUploading: boolean;
  isJustFilled: boolean;
  onClick: () => void;
}

function CellSlot({
  cell,
  planShort,
  planLabel,
  isUploading,
  isJustFilled,
  onClick,
}: CellSlotProps) {
  const filled = cell.count > 0;
  const title = filled
    ? `${planLabel} — ${cell.count} photo${cell.count > 1 ? "s" : ""} (${cell.sample?.filename ?? ""})`
    : `${planLabel} — cliquer pour uploader`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        position: "relative",
        width: 52,
        height: 64,
        padding: 0,
        border: filled
          ? "0.5px solid var(--hub-border)"
          : "1px dashed var(--hub-border)",
        borderRadius: 8,
        background: filled ? "white" : "rgba(255,255,255,0.4)",
        cursor: filled ? "default" : "pointer",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {filled && cell.sample && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cell.sample.public_url}
          alt={planLabel}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      {!filled && !isUploading && (
        <Plus
          size={16}
          strokeWidth={1.6}
          style={{ color: "var(--hub-foreground)", opacity: 0.45 }}
        />
      )}
      {isUploading && (
        <Loader2
          size={16}
          className="animate-spin"
          style={{ color: "var(--color-brand-rose, #A76059)" }}
        />
      )}

      {/* Badge plan en bas */}
      <span
        style={{
          position: "absolute",
          bottom: 2,
          left: 2,
          padding: "1px 4px",
          background: filled ? "rgba(26,22,20,0.7)" : "transparent",
          color: filled ? "white" : "var(--hub-foreground)",
          opacity: filled ? 1 : 0.6,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          borderRadius: 3,
          fontFamily: "var(--font-sans)",
        }}
      >
        {planShort}
      </span>

      {/* Compteur si > 1 */}
      {filled && cell.count > 1 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "var(--color-brand-rose, #A76059)",
            color: "white",
            fontSize: 9,
            fontWeight: 600,
            borderRadius: 9999,
            padding: "1px 5px",
            fontFamily: "var(--font-sans)",
          }}
        >
          {cell.count}
        </span>
      )}

      {/* Check flash après upload */}
      {isJustFilled && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "#365D40",
            color: "white",
            borderRadius: 9999,
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={9} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
