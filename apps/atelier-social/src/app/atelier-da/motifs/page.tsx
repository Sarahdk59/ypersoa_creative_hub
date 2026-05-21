"use client";

/**
 * Atelier DA — Motifs (vue catalogue "site web")
 *
 * Vue créative complémentaire de /atelier-production/motifs (qui reste la vue
 * technique : bibles, fichiers prod, attribution).
 *
 * Ici on raisonne comme un site web Ypersoa :
 *   - filtres chips "Pour qui ?" (destinataires) + "Occasion"
 *   - cards visuelles centrées sur l'image + nom commercial
 *   - modal légère pour éditer les tags d'un motif
 *
 * Données : mêmes motifs YPM que la vue prod, lus via /api/da/referentiels.
 * Tags écrits via PATCH /api/da/motifs/[id]/catalog.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, X, Sparkles, Camera, Filter } from "lucide-react";
import type { MotifYpm, MotifVariante } from "@/lib/atelier-da/referentiels-loader";
import { listCatalogShots, deleteCatalogShot, type CatalogShot } from "@/lib/catalog-shots";
import { listProductSheets, deleteProductSheet, type ProductSheetWithShots } from "@/lib/product-sheets";
import { EditCatalogShotModal } from "@/components/EditCatalogShotModal";
import { CreateProductSheetModal } from "@/components/CreateProductSheetModal";

const SHOOTING_URL = process.env.NEXT_PUBLIC_SHOOTING_URL || "http://localhost:3001";

// Taxonomie figée — site web Ypersoa. Si Sarah veut en ajouter un, étendre ici
// et la chip apparaît automatiquement. L'API normalise toujours en lowercase.
const DESTINATAIRES = [
  "papa", "maman", "mamie", "papy",
  "parrain", "marraine", "témoins",
  "frère", "sœur", "tonton", "tata",
  "amis", "couple", "bébé", "enfant",
  "nounou", "maîtresse",
];

const OCCASIONS = [
  "anniversaire", "mariage", "naissance",
  "fête des mères", "fête des pères",
  "déclaration", "transmission", "intemporel",
  "noël", "saint-valentin", "rentrée scolaire",
];

// Produits Ypersoa applicables à un motif/variante. Source : palette_supports_par_produit.json
const PRODUITS = [
  { id: "YP001", label: "Hoodie adulte" },
  { id: "YP005", label: "Sweat col rond" },
  { id: "YP019", label: "T-shirt" },
  { id: "YP021", label: "Zoodie zippé" },
  { id: "YP004", label: "Hoodie enfant" },
];

type CatalogView = "motifs" | "variantes" | "catalogue";

export default function MotifsCataloguePage() {
  const [motifs, setMotifs] = useState<MotifYpm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MotifYpm | null>(null);

  const [filterDestinataires, setFilterDestinataires] = useState<Set<string>>(new Set());
  const [filterOccasions, setFilterOccasions] = useState<Set<string>>(new Set());
  // Tags libres : "animaux", "famille", n'importe quoi. Stockés dans le champ
  // tags[] existant de MotifVariante (et MotifYpm). Toujours normalisés en
  // lowercase pour matching insensitive.
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [view, setView] = useState<CatalogView>("motifs");

  const load = async () => {
    const res = await fetch("/api/da/referentiels", { cache: "no-store" }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error);
    setMotifs(res.data.motifs.motifs);
    if (selected) {
      const updated = res.data.motifs.motifs.find((m: MotifYpm) => m.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  useEffect(() => {
    load().catch((e) => setError(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filterDestinataires.size === 0 && filterOccasions.size === 0 && filterTags.size === 0) return motifs;
    return motifs.filter((m) => {
      // Cascade : un motif matche si lui OU n'importe laquelle de ses variantes
      // contient le tag. Sinon le filtrage "vue Motifs" ignorerait les tags
      // posés sur les variantes (cas normal puisqu'on tague au niveau variante).
      const allDest = new Set<string>(m.destinataires ?? []);
      const allOcc = new Set<string>(m.occasions ?? []);
      const allTags = new Set<string>(m.tags ?? []);
      for (const v of m.variantes ?? []) {
        (v.destinataires ?? []).forEach((x) => allDest.add(x));
        (v.occasions ?? []).forEach((x) => allOcc.add(x));
        (v.tags ?? []).forEach((x) => allTags.add(x.toLowerCase()));
      }
      const matchD = filterDestinataires.size === 0 || [...filterDestinataires].some((v) => allDest.has(v));
      const matchO = filterOccasions.size === 0 || [...filterOccasions].some((v) => allOcc.has(v));
      const matchT = filterTags.size === 0 || [...filterTags].some((v) => allTags.has(v.toLowerCase()));
      return matchD && matchO && matchT;
    });
  }, [motifs, filterDestinataires, filterOccasions, filterTags]);

  // Vue "variantes" : aplatit toutes les variantes de tous les motifs en une seule
  // liste, en utilisant les tags fine-grained de chaque variante (fallback sur les
  // tags du motif racine si la variante n'a rien).
  const filteredVariantes = useMemo(() => {
    const all: Array<{ motif: MotifYpm; variante: MotifVariante; effectiveDest: string[]; effectiveOcc: string[]; effectiveTags: string[] }> = [];
    for (const m of motifs) {
      for (const v of m.variantes ?? []) {
        const effectiveDest = v.destinataires?.length ? v.destinataires : (m.destinataires ?? []);
        const effectiveOcc = v.occasions?.length ? v.occasions : (m.occasions ?? []);
        const effectiveTags = (v.tags?.length ? v.tags : (m.tags ?? [])).map((t) => t.toLowerCase());
        all.push({ motif: m, variante: v, effectiveDest, effectiveOcc, effectiveTags });
      }
    }
    if (filterDestinataires.size === 0 && filterOccasions.size === 0 && filterTags.size === 0) return all;
    return all.filter((row) => {
      const matchD = filterDestinataires.size === 0 || row.effectiveDest.some((v) => filterDestinataires.has(v));
      const matchO = filterOccasions.size === 0 || row.effectiveOcc.some((v) => filterOccasions.has(v));
      const matchT = filterTags.size === 0 || row.effectiveTags.some((v) => filterTags.has(v.toLowerCase()));
      return matchD && matchO && matchT;
    });
  }, [motifs, filterDestinataires, filterOccasions, filterTags]);

  // Suggestions de tags libres = union de tous les tags posés sur le projet
  const tagsSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const m of motifs) {
      (m.tags ?? []).forEach((t) => s.add(t.toLowerCase()));
      for (const v of m.variantes ?? []) {
        (v.tags ?? []).forEach((t) => s.add(t.toLowerCase()));
      }
    }
    return [...s].sort();
  }, [motifs]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
        <p style={{ fontFamily: "var(--font-sans)", marginTop: 16, opacity: 0.6 }}>Chargement des motifs…</p>
      </div>
    );
  }
  if (error) return <div style={{ padding: 24, color: "#a13a16" }}>Erreur : {error}</div>;

  const activeFilterCount = filterDestinataires.size + filterOccasions.size + filterTags.size;

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

      <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Motifs
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
            Catalogue créatif. Filtre par destinataire ou par occasion comme sur le site Ypersoa. Pour la fiche technique, voir{" "}
            <Link href="/atelier-production/motifs" style={{ color: "inherit", textDecoration: "underline" }}>
              Atelier Production · Motifs
            </Link>
            .
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--hub-bg)", borderRadius: 999, border: "0.5px solid var(--hub-border)", flexShrink: 0 }}>
          {(["motifs", "variantes", "catalogue"] as const).map((v) => {
            const labels = { motifs: "Motifs", variantes: "Variantes", catalogue: "Catalogue" };
            const titles: Record<typeof v, string> = {
              motifs: "Vue galerie des motifs YPM",
              variantes: "Vue site web : 1 card = 1 variante avec ses tags propres",
              catalogue: "Shoots rangés par destinataire / occasion / produit",
            };
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                title={titles[v]}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: view === v ? "var(--hub-foreground)" : "transparent",
                  color: view === v ? "var(--hub-bg)" : "var(--hub-foreground)",
                }}
              >
                {labels[v]}
              </button>
            );
          })}
        </div>
      </header>

      <FilterBlock
        title="Pour qui ?"
        values={DESTINATAIRES}
        selected={filterDestinataires}
        onToggle={(v) => toggle(filterDestinataires, setFilterDestinataires, v)}
      />
      <FilterBlock
        title="Occasion"
        values={OCCASIONS}
        selected={filterOccasions}
        onToggle={(v) => toggle(filterOccasions, setFilterOccasions, v)}
      />
      {tagsSuggestions.length > 0 && (
        <FilterBlock
          title="Autres tags"
          values={tagsSuggestions}
          selected={filterTags}
          onToggle={(v) => toggle(filterTags, setFilterTags, v.toLowerCase())}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 14px" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.6, margin: 0 }}>
          {view === "motifs"
            ? `${filtered.length} motif${filtered.length > 1 ? "s" : ""}`
            : `${filteredVariantes.length} variante${filteredVariantes.length > 1 ? "s" : ""}`}
          {activeFilterCount > 0 && (
            <>
              {" "}· <Filter size={11} style={{ display: "inline", marginRight: 3, verticalAlign: -1 }} />
              {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
            </>
          )}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilterDestinataires(new Set());
              setFilterOccasions(new Set());
              setFilterTags(new Set());
            }}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              background: "none",
              border: "none",
              color: "var(--hub-foreground)",
              opacity: 0.6,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Tout effacer
          </button>
        )}
      </div>

      {view === "motifs" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map((m) => (
            <MotifCard key={m.id} motif={m} onOpen={() => setSelected(m)} />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", opacity: 0.5, fontFamily: "var(--font-sans)", fontSize: 13 }}>
              Aucun motif ne correspond à ces filtres.{" "}
              <button onClick={() => { setFilterDestinataires(new Set()); setFilterOccasions(new Set()); setFilterTags(new Set()); }} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      )}

      {view === "variantes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {filteredVariantes.map((row) => (
            <VarianteCard
              key={`${row.motif.id}-${row.variante.label}`}
              motif={row.motif}
              variante={row.variante}
              effectiveDest={row.effectiveDest}
              effectiveOcc={row.effectiveOcc}
              onOpen={() => setSelected(row.motif)}
            />
          ))}
          {filteredVariantes.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", opacity: 0.5, fontFamily: "var(--font-sans)", fontSize: 13 }}>
              Aucune variante ne correspond à ces filtres.{" "}
              <button onClick={() => { setFilterDestinataires(new Set()); setFilterOccasions(new Set()); setFilterTags(new Set()); }} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      )}

      {view === "catalogue" && (
        <CatalogueView
          filterDestinataires={filterDestinataires}
          filterOccasions={filterOccasions}
          motifs={motifs}
          onOpenMotif={(m) => setSelected(m)}
        />
      )}

      {selected && <MotifCatalogModal motif={selected} tagsSuggestions={tagsSuggestions} onClose={() => setSelected(null)} onSaved={load} />}
    </div>
  );
}

function VarianteCard({
  motif,
  variante,
  effectiveDest,
  effectiveOcc,
  onOpen,
}: {
  motif: MotifYpm;
  variante: MotifVariante;
  effectiveDest: string[];
  effectiveOcc: string[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        transition: "transform 200ms ease, box-shadow 200ms ease",
      }}
      className="canonique-card"
      title={`${variante.label} (${motif.id})`}
    >
      <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--hub-bg)", padding: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/motifs/${encodeURIComponent(variante.file)}`}
          alt={variante.label}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
        />
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 5 }}>
        <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 14, fontWeight: 500, margin: 0, lineHeight: 1.2 }}>
          {variante.label}
        </h3>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.5, margin: 0, letterSpacing: 0.3 }}>
          {motif.nom_commercial} · {motif.id}
        </p>
        {(effectiveDest.length || effectiveOcc.length || (variante.produits?.length ?? 0)) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
            {effectiveDest.map((d) => (
              <span key={`d-${d}`} style={tagPillStyle("dest")}>{d}</span>
            ))}
            {effectiveOcc.map((o) => (
              <span key={`o-${o}`} style={tagPillStyle("occ")}>{o}</span>
            ))}
            {(variante.produits ?? []).map((p) => (
              <span key={`p-${p}`} style={tagPillStyle("prod")}>{p}</span>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.4, margin: "3px 0 0 0", fontStyle: "italic" }}>
            Pas encore taggée
          </p>
        )}
      </div>
    </button>
  );
}

function FilterBlock({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 8px" }}>
        {title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map((v) => {
          const active = selected.has(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 999,
                border: active ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
                background: active ? "var(--hub-foreground)" : "white",
                color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
                cursor: "pointer",
                transition: "all 150ms ease",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MotifCard({ motif, onOpen }: { motif: MotifYpm; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
      className="canonique-card"
    >
      <div style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--hub-bg)", padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/motifs/${encodeURIComponent(motif.asset_principal)}`}
          alt={motif.nom_commercial}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
        />
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: 18, fontWeight: 500, margin: 0 }}>
          {motif.nom_commercial}
        </h3>
        {(motif.destinataires?.length || motif.occasions?.length) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(motif.destinataires ?? []).map((d) => (
              <span key={`d-${d}`} style={tagPillStyle("dest")}>{d}</span>
            ))}
            {(motif.occasions ?? []).map((o) => (
              <span key={`o-${o}`} style={tagPillStyle("occ")}>{o}</span>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.4, margin: 0, fontStyle: "italic" }}>
            Pas encore taggé
          </p>
        )}
      </div>
    </button>
  );
}

/**
 * Convertit "YPM-011-papa-de-noe-hugo.png" en "Papa de Noé Hugo" pour la carte
 * Hero. Strip prefix YPM-NNN-, enlève l'extension, remplace tirets par espace,
 * capitalise les mots, restaure les accents courants (e → é dans "noe").
 */
function heroLabelFromFilename(filename: string): string {
  let s = filename
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .replace(/^YPM-\d+-/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  // Restaurations courantes (best-effort, pas exhaustif)
  s = s
    .replace(/\bnoe\b/gi, "Noé")
    .replace(/\bfelicie\b/gi, "Félicie")
    .replace(/\bcesaria\b/gi, "Cesaria")
    .replace(/\bcelement\b/gi, "Clément");
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function tagPillStyle(kind: "dest" | "occ" | "prod" | "tag"): React.CSSProperties {
  const palette = {
    dest: { bg: "#ECE3D5", fg: "#6B4F2A" },
    occ: { bg: "#E3E8DC", fg: "#3D5A2A" },
    prod: { bg: "#E5E8EE", fg: "#324A6E" },
    tag: { bg: "#F0E6D2", fg: "#7A5C2E" },
  }[kind];
  return {
    fontFamily: "var(--font-sans)",
    fontSize: 9.5,
    padding: "2px 7px",
    borderRadius: 999,
    background: palette.bg,
    color: palette.fg,
    textTransform: kind === "prod" ? "none" : "capitalize",
    letterSpacing: 0.2,
  };
}

function ProduitsBlock({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 8px" }}>
        Produits compatibles
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRODUITS.map((p) => {
          const active = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                padding: "5px 11px",
                borderRadius: 999,
                border: active ? "0.5px solid #324A6E" : "0.5px solid var(--hub-border)",
                background: active ? "#324A6E" : "white",
                color: active ? "white" : "var(--hub-foreground)",
                cursor: "pointer",
              }}
              title={p.label}
            >
              {p.id} <span style={{ opacity: 0.7, fontSize: 10 }}>· {p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tags libres (animaux, famille, lifestyle, n'importe quoi). Input texte + chips
 * cliquables (suppression au click), suggestions = union de tous les tags déjà
 * posés sur le projet (autocomplete via datalist).
 */
function FreeTagsBlock({
  selected,
  suggestions,
  onToggle,
}: {
  selected: Set<string>;
  suggestions: string[];
  onToggle: (val: string) => void;
}) {
  const [input, setInput] = useState("");
  const suggestionsRestantes = suggestions.filter((s) => !selected.has(s.toLowerCase()));

  const add = () => {
    const v = input.trim().toLowerCase();
    if (!v) return;
    onToggle(v);
    setInput("");
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 8px" }}>
        Autres tags
        <span style={{ marginLeft: 6, fontSize: 9.5, opacity: 0.7, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          (animaux, famille, lifestyle… libre)
        </span>
      </p>

      {selected.size > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {[...selected].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              title="Cliquer pour retirer ce tag"
              style={{
                fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 999,
                border: "0.5px solid #6B4F2A",
                background: "#6B4F2A", color: "white",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}
            >
              {t} <span style={{ opacity: 0.8, fontSize: 10 }}>×</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Tape un tag puis Entrée…"
          list="tags-suggestions"
          style={{
            flex: 1, fontFamily: "var(--font-sans)", fontSize: 11,
            padding: "5px 10px", borderRadius: 999,
            border: "0.5px solid var(--hub-border)", background: "white",
          }}
        />
        <datalist id="tags-suggestions">
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          style={{
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
            padding: "5px 12px", borderRadius: 999, border: "none",
            background: input.trim() ? "var(--hub-foreground)" : "var(--hub-border)",
            color: input.trim() ? "var(--hub-bg)" : "var(--hub-foreground)",
            cursor: input.trim() ? "pointer" : "default",
          }}
        >
          + Ajouter
        </button>
      </div>

      {suggestionsRestantes.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.5, marginRight: 4 }}>
            Suggestions :
          </span>
          {suggestionsRestantes.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              style={{
                fontFamily: "var(--font-sans)", fontSize: 10, padding: "2px 8px", borderRadius: 999,
                border: "0.5px dashed var(--hub-border)", background: "white",
                color: "var(--hub-foreground)", opacity: 0.7, cursor: "pointer",
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MotifCatalogModal({
  motif,
  tagsSuggestions = [],
  onClose,
  onSaved,
}: {
  motif: MotifYpm;
  tagsSuggestions?: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  // Tags niveau motif (défaut "fallback" si une variante n'a rien)
  const [destinataires, setDestinataires] = useState<Set<string>>(new Set(motif.destinataires ?? []));
  const [occasions, setOccasions] = useState<Set<string>>(new Set(motif.occasions ?? []));
  // Tags niveau motif racine — appliqués à l'asset_principal (le hero, ex. "Papa de Noé"
  // pour YPM-011) qui n'est pas dans la liste des variantes. Sert aussi de fallback
  // pour les variantes sans tags propres.
  const [motifProduits, setMotifProduits] = useState<Set<string>>(new Set(motif.produits ?? []));
  const [motifTags, setMotifTags] = useState<Set<string>>(new Set((motif.tags ?? []).map((t) => t.toLowerCase())));
  const [openHero, setOpenHero] = useState(false);
  // Tags fine-grained par variante : map key → {dest, occ, produits, tags}
  // `tags` = tags libres (animaux, famille, n'importe quoi) — stockés dans
  // le champ tags[] existant de MotifVariante.
  const [varianteTags, setVarianteTags] = useState<Record<string, { dest: Set<string>; occ: Set<string>; produits: Set<string>; tags: Set<string> }>>(() => {
    const init: Record<string, { dest: Set<string>; occ: Set<string>; produits: Set<string>; tags: Set<string> }> = {};
    for (const v of motif.variantes ?? []) {
      init[v.label] = {
        dest: new Set(v.destinataires ?? []),
        occ: new Set(v.occasions ?? []),
        produits: new Set(v.produits ?? []),
        tags: new Set((v.tags ?? []).map((t) => t.toLowerCase())),
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openVariante, setOpenVariante] = useState<string | null>(null);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };

  const toggleVarianteTag = (key: string, axis: "dest" | "occ" | "produits" | "tags", value: string) => {
    setVarianteTags((prev) => {
      const cur = prev[key] ?? { dest: new Set<string>(), occ: new Set<string>(), produits: new Set<string>(), tags: new Set<string>() };
      const v = axis === "tags" ? value.toLowerCase() : value;
      const next = new Set(cur[axis]);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return { ...prev, [key]: { ...cur, [axis]: next } };
    });
  };

  const motifDirty =
    JSON.stringify([...destinataires].sort()) !== JSON.stringify((motif.destinataires ?? []).slice().sort()) ||
    JSON.stringify([...occasions].sort()) !== JSON.stringify((motif.occasions ?? []).slice().sort()) ||
    JSON.stringify([...motifProduits].sort()) !== JSON.stringify((motif.produits ?? []).slice().sort()) ||
    JSON.stringify([...motifTags].sort()) !== JSON.stringify((motif.tags ?? []).map((t) => t.toLowerCase()).slice().sort());

  const varianteDirty = (motif.variantes ?? []).some((v) => {
    const before = {
      dest: (v.destinataires ?? []).slice().sort(),
      occ: (v.occasions ?? []).slice().sort(),
      produits: (v.produits ?? []).slice().sort(),
      tags: (v.tags ?? []).map((t) => t.toLowerCase()).slice().sort(),
    };
    const after = varianteTags[v.label] ?? { dest: new Set<string>(), occ: new Set<string>(), produits: new Set<string>(), tags: new Set<string>() };
    return (
      JSON.stringify([...after.dest].sort()) !== JSON.stringify(before.dest) ||
      JSON.stringify([...after.occ].sort()) !== JSON.stringify(before.occ) ||
      JSON.stringify([...after.produits].sort()) !== JSON.stringify(before.produits) ||
      JSON.stringify([...after.tags].sort()) !== JSON.stringify(before.tags)
    );
  });

  const dirty = motifDirty || varianteDirty;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const variante_tags: Record<string, { destinataires: string[]; occasions: string[]; produits: string[]; tags: string[] }> = {};
      for (const [key, tags] of Object.entries(varianteTags)) {
        variante_tags[key] = {
          destinataires: [...tags.dest],
          occasions: [...tags.occ],
          produits: [...tags.produits],
          tags: [...tags.tags],
        };
      }
      const res = await fetch(`/api/da/motifs/${motif.id}/catalog`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinataires: [...destinataires],
          occasions: [...occasions],
          produits: [...motifProduits],
          tags: [...motifTags],
          variante_tags,
        }),
      }).then((r) => r.json());
      if (!res.ok) throw new Error(res.error);
      await onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 1100,
          width: "100%",
          height: "92vh",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gridTemplateRows: "1fr",
        }}
      >
        <div style={{ background: "var(--hub-bg)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, overflow: "auto", minHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/motifs/${encodeURIComponent(motif.asset_principal)}`}
            alt={motif.nom_commercial}
            style={{ width: "100%", height: "auto", maxHeight: 240, objectFit: "contain" }}
          />
          <div style={{ width: "100%" }}>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: 0, letterSpacing: 0.5 }}>
              <code>{motif.id}</code> · {motif.nb_variantes} variante{motif.nb_variantes > 1 ? "s" : ""}
            </p>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 22, fontWeight: 500, margin: "4px 0 0" }}>
              {motif.nom_commercial}
            </h2>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href={`${SHOOTING_URL}?motif=${motif.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: 999,
                border: "0.5px solid var(--hub-border)",
                background: "white",
                color: "var(--hub-foreground)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <Camera size={13} /> Utiliser dans Shooting
            </a>
            <Link
              href={`/atelier-production/motifs`}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: 999,
                border: "0.5px solid var(--hub-border)",
                background: "white",
                color: "var(--hub-foreground)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <Sparkles size={13} /> Fiche technique
            </Link>
          </div>
        </div>

        <div style={{ padding: 24, position: "relative", overflow: "auto", minHeight: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: 0.5,
              padding: 4,
            }}
          >
            <X size={18} />
          </button>

          <CatalogShotsGallery motifId={motif.id} />

          <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: "0 0 12px" }}>
            Asset principal + variantes · tagger une à une
          </p>

          {/* Carte HERO : asset_principal (ex. "Papa de Noé" pour YPM-011)
              taggable séparément. Stocke ses tags au niveau motif racine. */}
          <div style={{ borderRadius: 10, border: motifDirty ? "0.5px solid #a13a16" : "0.5px solid var(--hub-border)", overflow: "hidden", marginBottom: 8, background: "#FAF7F2" }}>
            <button
              type="button"
              onClick={() => setOpenHero((v) => !v)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 10,
                background: openHero ? "white" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/motifs/${encodeURIComponent(motif.asset_principal)}`}
                alt={motif.nom_commercial}
                style={{ width: 48, height: 48, objectFit: "contain", background: "var(--hub-bg)", borderRadius: 6, flexShrink: 0 }}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 8.5, fontWeight: 700, padding: "1.5px 6px", borderRadius: 4,
                    background: "var(--hub-foreground)", color: "var(--hub-bg)", letterSpacing: 0.4,
                  }}>HERO</span>
                  {heroLabelFromFilename(motif.asset_principal)}
                  {motifDirty && <span style={{ color: "#a13a16", fontSize: 14 }}>•</span>}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {[...destinataires].map((d) => <span key={`d-${d}`} style={tagPillStyle("dest")}>{d}</span>)}
                  {[...occasions].map((o) => <span key={`o-${o}`} style={tagPillStyle("occ")}>{o}</span>)}
                  {[...motifProduits].map((p) => <span key={`p-${p}`} style={tagPillStyle("prod")}>{p}</span>)}
                  {[...motifTags].map((t) => <span key={`t-${t}`} style={tagPillStyle("tag")}>{t}</span>)}
                  {destinataires.size === 0 && occasions.size === 0 && motifProduits.size === 0 && motifTags.size === 0 && (
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.4, fontStyle: "italic" }}>Pas taggé</span>
                  )}
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5 }}>{openHero ? "−" : "+"}</span>
            </button>
            {openHero && (
              <div style={{ padding: 14, borderTop: "0.5px solid var(--hub-border)", background: "white" }}>
                <FilterBlock title="Pour qui ?" values={DESTINATAIRES} selected={destinataires} onToggle={(v) => toggle(destinataires, setDestinataires, v)} />
                <FilterBlock title="Occasion" values={OCCASIONS} selected={occasions} onToggle={(v) => toggle(occasions, setOccasions, v)} />
                <ProduitsBlock selected={motifProduits} onToggle={(v) => toggle(motifProduits, setMotifProduits, v)} />
                <FreeTagsBlock selected={motifTags} suggestions={tagsSuggestions} onToggle={(v) => toggle(motifTags, setMotifTags, v.toLowerCase())} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(motif.variantes ?? []).map((v) => {
              const tags = varianteTags[v.label] ?? { dest: new Set<string>(), occ: new Set<string>(), produits: new Set<string>() };
              const isOpen = openVariante === v.label;
              return (
                <div key={v.label} style={{ borderRadius: 10, border: "0.5px solid var(--hub-border)", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setOpenVariante(isOpen ? null : v.label)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 10,
                      background: isOpen ? "var(--hub-bg)" : "white",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/motifs/${encodeURIComponent(v.file)}`}
                      alt={v.label}
                      style={{ width: 48, height: 48, objectFit: "contain", background: "var(--hub-bg)", borderRadius: 6, flexShrink: 0 }}
                      onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 500, margin: 0 }}>{v.label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                        {[...tags.dest].map((d) => <span key={`d-${d}`} style={tagPillStyle("dest")}>{d}</span>)}
                        {[...tags.occ].map((o) => <span key={`o-${o}`} style={tagPillStyle("occ")}>{o}</span>)}
                        {[...tags.produits].map((p) => <span key={`p-${p}`} style={tagPillStyle("prod")}>{p}</span>)}
                        {[...tags.tags].map((t) => <span key={`t-${t}`} style={tagPillStyle("tag")}>{t}</span>)}
                        {tags.dest.size === 0 && tags.occ.size === 0 && tags.produits.size === 0 && tags.tags.size === 0 && (
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.4, fontStyle: "italic" }}>Pas taggée</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5 }}>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: 14, borderTop: "0.5px solid var(--hub-border)" }}>
                      <FilterBlock title="Pour qui ?" values={DESTINATAIRES} selected={tags.dest} onToggle={(val) => toggleVarianteTag(v.label, "dest", val)} />
                      <FilterBlock title="Occasion" values={OCCASIONS} selected={tags.occ} onToggle={(val) => toggleVarianteTag(v.label, "occ", val)} />
                      <ProduitsBlock
                        selected={tags.produits}
                        onToggle={(val) => toggleVarianteTag(v.label, "produits", val)}
                      />
                      <FreeTagsBlock
                        selected={tags.tags}
                        suggestions={tagsSuggestions}
                        onToggle={(val) => toggleVarianteTag(v.label, "tags", val)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {saveError && (
            <p style={{ color: "#a13a16", fontSize: 11, fontFamily: "var(--font-sans)", marginTop: 12 }}>
              Erreur : {saveError}
            </p>
          )}

          <div style={{ position: "sticky", bottom: 0, marginTop: 18, paddingTop: 14, background: "linear-gradient(to top, white 70%, transparent)" }}>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                background: dirty ? "var(--hub-foreground)" : "var(--hub-border)",
                color: dirty ? "var(--hub-bg)" : "var(--hub-foreground)",
                opacity: !dirty || saving ? 0.5 : 1,
                cursor: dirty && !saving ? "pointer" : "default",
              }}
            >
              {saving ? "Enregistrement…" : dirty ? "Enregistrer tous les tags" : "Aucun changement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Galerie des shots catalogués pour un motif donné, regroupés par produit YPxxx.
 * Lit Supabase catalog_shots. Onglets produit en haut. Click sur une thumb →
 * preview pleine taille. Bouton supprimer par shot.
 */
function CatalogShotsGallery({ motifId }: { motifId: string }) {
  const [shots, setShots] = useState<CatalogShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<string>("all");
  const [preview, setPreview] = useState<CatalogShot | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCatalogShots({ motifId, limit: 200 });
      setShots(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [motifId]);

  const byProduct = useMemo(() => {
    const map: Record<string, CatalogShot[]> = { all: shots };
    for (const s of shots) {
      const k = s.product_id ?? "_unspecified";
      (map[k] ??= []).push(s);
    }
    return map;
  }, [shots]);

  const productTabs = useMemo(() => {
    const seen = new Set<string>();
    for (const s of shots) if (s.product_id) seen.add(s.product_id);
    const order = ["YP019", "YP005", "YP001", "YP021", "YP004"];
    return order.filter((p) => seen.has(p));
  }, [shots]);

  const onDelete = async (shot: CatalogShot) => {
    if (!confirm("Retirer ce shot du catalogue ?")) return;
    try {
      await deleteCatalogShot(shot);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "12px 14px", background: "var(--hub-bg)", borderRadius: 10, marginBottom: 18, fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.6 }}>
        Chargement des shots…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "10px 14px", background: "#fdecea", borderRadius: 10, marginBottom: 18, fontSize: 11, fontFamily: "var(--font-sans)", color: "#a13a16" }}>
        {error}
      </div>
    );
  }
  if (shots.length === 0) {
    return (
      <div style={{ padding: "12px 14px", background: "var(--hub-bg)", borderRadius: 10, marginBottom: 18, fontSize: 11, fontFamily: "var(--font-sans)", opacity: 0.5, fontStyle: "italic" }}>
        Aucun shot rangé pour ce motif. Génère un shooting dans l&apos;Atelier Shooting, click sur « 📁 Catalogue » sous l&apos;image.
      </div>
    );
  }

  const visible = activeProduct === "all" ? shots : (byProduct[activeProduct] ?? []);

  return (
    <div style={{ marginBottom: 22, padding: "14px 14px 12px", border: "0.5px solid var(--hub-border)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.55, margin: 0 }}>
          Shoots catalogués · {shots.length}
        </p>
        {productTabs.length > 0 && (
          <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--hub-bg)", borderRadius: 999 }}>
            <button
              type="button"
              onClick={() => setActiveProduct("all")}
              style={tabStyle(activeProduct === "all")}
            >
              Tous ({shots.length})
            </button>
            {productTabs.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setActiveProduct(p)}
                style={tabStyle(activeProduct === p)}
              >
                {p} ({byProduct[p]?.length ?? 0})
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))", gap: 6 }}>
        {visible.map((s) => (
          <div key={s.id} style={{ position: "relative" }} className="catalog-shot-thumb">
            <button
              type="button"
              onClick={() => setPreview(s)}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: "var(--hub-bg)",
                border: "0.5px solid var(--hub-border)",
                borderRadius: 6,
                padding: 0,
                overflow: "hidden",
                cursor: "zoom-in",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image_url}
                alt={s.shot_label ?? "shot"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
              />
            </button>
            <button
              type="button"
              onClick={() => onDelete(s)}
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "rgba(255,255,255,0.95)",
                border: "none",
                fontSize: 11,
                cursor: "pointer",
                opacity: 0.7,
              }}
              title="Retirer du catalogue"
            >
              ×
            </button>
            {s.product_id && (
              <span style={{
                position: "absolute",
                bottom: 3,
                left: 3,
                fontSize: 8,
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                background: "rgba(255,255,255,0.9)",
                color: "#324A6E",
                padding: "1px 5px",
                borderRadius: 999,
                letterSpacing: 0.3,
              }}>{s.product_id}</span>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image_url}
            alt={preview.shot_label ?? "shot"}
            style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-sans)",
    fontSize: 10,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 999,
    border: "none",
    background: active ? "var(--hub-foreground)" : "transparent",
    color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
    cursor: "pointer",
  };
}


/**
 * Vue Catalogue : tous les shots rangés (Supabase catalog_shots), filtrés par
 * les chips destinataires/occasions du header + sous-filtres locaux produit/motif.
 * Click sur un shot → preview pleine taille. Click sur le nom du motif → ouvre
 * la modal motif (parent setSelected).
 */
function CatalogueView({
  filterDestinataires,
  filterOccasions,
  motifs,
  onOpenMotif,
}: {
  filterDestinataires: Set<string>;
  filterOccasions: Set<string>;
  motifs: MotifYpm[];
  onOpenMotif: (m: MotifYpm) => void;
}) {
  const [shots, setShots] = useState<CatalogShot[]>([]);
  const [sheets, setSheets] = useState<ProductSheetWithShots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [motifFilter, setMotifFilter] = useState<string | null>(null);
  const [preview, setPreview] = useState<CatalogShot | null>(null);
  const [editingShot, setEditingShot] = useState<CatalogShot | null>(null);
  // Fiche produit ouverte (modal showing les N shots d'une fiche)
  const [openedSheet, setOpenedSheet] = useState<ProductSheetWithShots | null>(null);
  // Sélection multiple pour fusion en fiche produit
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([
      listCatalogShots({ limit: 500 }),
      listProductSheets({ limit: 200 }),
    ])
      .then(([shotsData, sheetsData]) => {
        setShots(shotsData);
        setSheets(sheetsData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (s: CatalogShot) => {
    if (!confirm(`Supprimer ce shot du catalogue ?`)) return;
    try {
      await deleteCatalogShot(s);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const motifsById = useMemo(() => {
    const m = new Map<string, MotifYpm>();
    for (const x of motifs) m.set(x.id, x);
    return m;
  }, [motifs]);

  // Croise filtres header (destinataires/occasions) + filtres locaux (produit/motif)
  const filtered = useMemo(() => {
    return shots.filter((s) => {
      const shotDests = new Set(s.destinataire ?? []);
      const shotOccs = new Set(s.occasion ?? []);
      if (filterDestinataires.size > 0 && ![...filterDestinataires].some((d) => shotDests.has(d))) return false;
      if (filterOccasions.size > 0 && ![...filterOccasions].some((o) => shotOccs.has(o))) return false;
      if (productFilter && s.product_id !== productFilter) return false;
      if (motifFilter && s.motif_id !== motifFilter) return false;
      return true;
    });
  }, [shots, filterDestinataires, filterOccasions, productFilter, motifFilter]);

  // Set des shot_ids qui appartiennent à AU MOINS une fiche produit.
  // Ces shots sont absorbés dans leur card "fiche" et n'apparaissent plus en solo.
  const shotIdsInSheet = useMemo(() => {
    const s = new Set<string>();
    for (const sheet of sheets) for (const sh of sheet.shots) s.add(sh.id);
    return s;
  }, [sheets]);

  // Fiches filtrées par les chips destinataires/occasions/produit/motif (même règles
  // que les shots — on regarde les métadonnées de la fiche).
  const filteredSheets = useMemo(() => {
    return sheets.filter((sh) => {
      const dests = new Set(sh.destinataires ?? []);
      const occs = new Set(sh.occasions ?? []);
      if (filterDestinataires.size > 0 && ![...filterDestinataires].some((d) => dests.has(d))) return false;
      if (filterOccasions.size > 0 && ![...filterOccasions].some((o) => occs.has(o))) return false;
      if (productFilter && sh.product_id !== productFilter) return false;
      if (motifFilter && sh.motif_id !== motifFilter) return false;
      return true;
    });
  }, [sheets, filterDestinataires, filterOccasions, productFilter, motifFilter]);

  // Shots solo = shots filtrés MOINS ceux déjà absorbés dans une fiche
  const filteredSoloShots = useMemo(() => {
    return filtered.filter((s) => !shotIdsInSheet.has(s.id));
  }, [filtered, shotIdsInSheet]);

  const handleDeleteSheet = async (sheet: ProductSheetWithShots) => {
    if (!confirm(`Supprimer la fiche « ${sheet.title} » ? Les ${sheet.shots.length} shots restent dans le catalogue (juste dégroupés).`)) return;
    try {
      await deleteProductSheet(sheet.id);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  // Produits & motifs présents dans la donnée (pour proposer des chips de filtre pertinents)
  const productsPresent = useMemo(() => {
    const s = new Set<string>();
    for (const x of shots) if (x.product_id) s.add(x.product_id);
    return ["YP019", "YP005", "YP001", "YP021", "YP004"].filter((p) => s.has(p));
  }, [shots]);

  const motifsPresent = useMemo(() => {
    const s = new Set<string>();
    for (const x of shots) if (x.motif_id) s.add(x.motif_id);
    return [...s].sort();
  }, [shots]);

  if (loading) return <p style={{ textAlign: "center", padding: 40, fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.5 }}>Chargement du catalogue…</p>;
  if (error) return <div style={{ padding: 16, background: "#fdecea", color: "#a13a16", borderRadius: 10, fontFamily: "var(--font-sans)", fontSize: 12 }}>Erreur : {error}</div>;
  if (shots.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", background: "var(--hub-bg)", borderRadius: 16, fontFamily: "var(--font-sans)", fontSize: 13, opacity: 0.7 }}>
        Aucun shot dans le catalogue. Génère un pack depuis l&apos;Atelier Shooting et click « 📁 Catalogue » sous chaque image. Tu peux aussi ranger les slides d&apos;un pack social depuis la Bibliothèque.
      </div>
    );
  }

  return (
    <>
      {(productsPresent.length > 0 || motifsPresent.length > 0) && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          {productsPresent.length > 0 && (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 4 }}>Produit</span>
              {productsPresent.map((p) => {
                const active = productFilter === p;
                return (
                  <button
                    key={p}
                    onClick={() => setProductFilter(active ? null : p)}
                    style={{
                      fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 10px", borderRadius: 999,
                      border: active ? "0.5px solid #324A6E" : "0.5px solid var(--hub-border)",
                      background: active ? "#324A6E" : "white",
                      color: active ? "white" : "var(--hub-foreground)",
                      cursor: "pointer",
                    }}
                  >{p}</button>
                );
              })}
            </div>
          )}
          {motifsPresent.length > 0 && (
            <select
              value={motifFilter ?? ""}
              onChange={(e) => setMotifFilter(e.target.value || null)}
              style={{ padding: "4px 10px", borderRadius: 999, border: "0.5px solid var(--hub-border)", fontSize: 11, fontFamily: "var(--font-sans)" }}
            >
              <option value="">Tous les motifs</option>
              {motifsPresent.map((id) => (
                <option key={id} value={id}>
                  {motifsById.get(id)?.nom_commercial ?? id} · {id}
                </option>
              ))}
            </select>
          )}
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5 }}>
            {filtered.length} shot{filtered.length > 1 ? "s" : ""} / {shots.length}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", opacity: 0.5, fontFamily: "var(--font-sans)", fontSize: 13 }}>
          Aucun shot ne correspond à ces filtres.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {filtered.map((s) => {
            const motif = s.motif_id ? motifsById.get(s.motif_id) : null;
            return (
              <div key={s.id} className="catalog-shot-card" style={{
                background: "white",
                border: selectedShotIds.has(s.id) ? "1.5px solid #324A6E" : "0.5px solid var(--hub-border)",
                borderRadius: 10, overflow: "hidden",
                display: "flex", flexDirection: "column", position: "relative",
                transition: "border-color 150ms",
              }}>
                {/* Checkbox sélection pour fusion fiche produit */}
                <label
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: 6, left: 6, zIndex: 2,
                    width: 22, height: 22, borderRadius: 4,
                    background: selectedShotIds.has(s.id) ? "#324A6E" : "rgba(255,255,255,0.9)",
                    border: "1px solid " + (selectedShotIds.has(s.id) ? "#324A6E" : "rgba(0,0,0,0.15)"),
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    color: "white", fontSize: 13, fontWeight: 700,
                  }}
                  title="Sélectionner pour fusion en fiche produit"
                >
                  <input
                    type="checkbox"
                    checked={selectedShotIds.has(s.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedShotIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        return next;
                      });
                    }}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  {selectedShotIds.has(s.id) ? "✓" : ""}
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreview(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPreview(s); }}
                  style={{ cursor: "zoom-in", position: "relative", aspectRatio: "1 / 1", background: "var(--hub-bg)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image_url}
                    alt={s.shot_label ?? "shot"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
                  />
                  {s.product_id && (
                    <span style={{
                      position: "absolute", top: 5, left: 5,
                      fontSize: 9, fontFamily: "var(--font-sans)", fontWeight: 700,
                      background: "rgba(255,255,255,0.9)", color: "#324A6E",
                      padding: "1px 6px", borderRadius: 999, letterSpacing: 0.3,
                      pointerEvents: "none",
                    }}>{s.product_id}</span>
                  )}
                  {/* Boutons hover : éditer / supprimer */}
                  <div
                    className="catalog-shot-actions"
                    style={{
                      position: "absolute", top: 5, right: 5, display: "flex", gap: 4,
                      opacity: 0, transition: "opacity 150ms ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingShot(s); }}
                      title="Éditer les tags de ce shot"
                      style={shotActionBtnStyle}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                      title="Supprimer ce shot du catalogue"
                      style={shotActionBtnStyle}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                  {motif && (
                    <button
                      type="button"
                      onClick={() => onOpenMotif(motif)}
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 600,
                        color: "var(--hub-foreground)", textDecoration: "underline dotted",
                        textAlign: "left",
                      }}
                      title={`Ouvrir ${motif.nom_commercial}`}
                    >
                      {motif.nom_commercial}
                    </button>
                  )}
                  {s.variante_key && (
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 9.5, opacity: 0.6, margin: 0 }}>{s.variante_key}</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 3 }}>
                    {(s.destinataire ?? []).slice(0, 3).map((d) => (
                      <span key={`d-${d}`} style={{ fontFamily: "var(--font-sans)", fontSize: 8.5, padding: "1px 5px", borderRadius: 999, background: "#ECE3D5", color: "#6B4F2A", textTransform: "capitalize" }}>{d}</span>
                    ))}
                    {(s.occasion ?? []).slice(0, 3).map((o) => (
                      <span key={`o-${o}`} style={{ fontFamily: "var(--font-sans)", fontSize: 8.5, padding: "1px 5px", borderRadius: 999, background: "#E3E8DC", color: "#3D5A2A", textTransform: "capitalize" }}>{o}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image_url}
            alt={preview.shot_label ?? "shot"}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      )}

      {editingShot && (
        <EditCatalogShotModal
          shot={editingShot}
          onClose={() => setEditingShot(null)}
          onSaved={() => reload()}
          onDeleted={() => reload()}
        />
      )}

      {/* Barre flottante de sélection multiple : actions sur 2+ shots */}
      {selectedShotIds.size > 0 && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 50, background: "var(--hub-foreground)", color: "var(--hub-bg)",
          borderRadius: 999, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", fontFamily: "var(--font-sans)", fontSize: 12,
        }}>
          <span style={{ fontWeight: 600 }}>
            {selectedShotIds.size} shot{selectedShotIds.size > 1 ? "s" : ""} sélectionné{selectedShotIds.size > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => setSelectedShotIds(new Set())}
            style={{
              background: "none", border: "none", color: "var(--hub-bg)", opacity: 0.6,
              cursor: "pointer", fontSize: 11, textDecoration: "underline",
            }}
          >
            Tout désélectionner
          </button>
          {selectedShotIds.size >= 2 && (
            <button
              type="button"
              onClick={() => setShowMergeModal(true)}
              style={{
                background: "white", color: "var(--hub-foreground)",
                border: "none", padding: "6px 14px", borderRadius: 999,
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📚 Fusionner en fiche produit
            </button>
          )}
          {selectedShotIds.size < 2 && (
            <span style={{ fontSize: 10.5, opacity: 0.7, fontStyle: "italic" }}>
              Sélectionne au moins 2 shots pour fusionner
            </span>
          )}
        </div>
      )}

      {showMergeModal && (
        <CreateProductSheetModal
          shots={shots.filter((s) => selectedShotIds.has(s.id))}
          motifLabelById={new Map([...motifsById.entries()].map(([id, m]) => [id, m.nom_commercial]))}
          onClose={() => setShowMergeModal(false)}
          onSaved={() => {
            setSelectedShotIds(new Set());
            setShowMergeModal(false);
            // Pas de reload nécessaire — la fiche est dans une autre table.
            // TODO: afficher un badge "Fiche X" sur les shots concernés (à faire demain).
          }}
        />
      )}

      <style jsx>{`
        :global(.catalog-shot-card:hover .catalog-shot-actions) {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}

const shotActionBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "none",
  background: "rgba(255,255,255,0.95)",
  fontSize: 11,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
};
