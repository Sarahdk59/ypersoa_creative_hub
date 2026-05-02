"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, GitBranch, X, MapPin, Heart, Star, Search, Filter, Loader2 } from "lucide-react";
import type {
  RawCanonique,
  AffinitesNarratives,
  DispositifEtabli,
} from "@/lib/atelier-da/referentiels-loader";

interface ReferentielsBundle {
  mannequins: { mannequins: RawCanonique[]; cartographie_regionale?: Record<string, string[]> };
  affinites: AffinitesNarratives;
}

type ViewMode = "mur" | "lignees";

const FAMILLES_OPTIONS = [
  { id: "all", label: "Toutes" },
  { id: "no-makeup naturelle", label: "No-makeup" },
  { id: "maquillée chic assumée", label: "Maquillée chic" },
];

const GENRES_OPTIONS = [
  { id: "all", label: "Tous" },
  { id: "F-adulte", label: "Femmes" },
  { id: "H-adulte", label: "Hommes" },
  { id: "enfant", label: "Enfants (≤12)" },
  { id: "ado", label: "Ados (13-20)" },
];

export default function CastingPage() {
  const [data, setData] = useState<ReferentielsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("mur");
  const [filtreFamille, setFiltreFamille] = useState("all");
  const [filtreGenre, setFiltreGenre] = useState("all");
  const [filtreLieu, setFiltreLieu] = useState("all");
  const [recherche, setRecherche] = useState("");
  const [selectedCanonique, setSelectedCanonique] = useState<RawCanonique | null>(null);

  useEffect(() => {
    fetch("/api/da/referentiels")
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        setData({ mannequins: res.data.mannequins, affinites: res.data.affinites });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allCanoniques = useMemo(() => {
    if (!data) return [];
    return expandCouples(data.mannequins.mannequins);
  }, [data]);

  const lieuxOptions = useMemo(() => {
    const lieux = new Set<string>();
    for (const m of allCanoniques) {
      if (m.lieu_de_vie) lieux.add(m.lieu_de_vie.split(/[,(]/)[0].trim());
    }
    return [{ id: "all", label: "Tous lieux" }, ...Array.from(lieux).map((l) => ({ id: l, label: l }))];
  }, [allCanoniques]);

  const filtreCanoniques = useMemo(() => {
    if (!data) return [];
    return allCanoniques.filter((m) => {
      if (filtreFamille !== "all" && m.famille_esthetique !== filtreFamille) {
        // si pas de famille_esthetique, on considère "no-makeup naturelle" par défaut
        if (filtreFamille === "no-makeup naturelle" && !m.famille_esthetique) {
          // ok
        } else if (filtreFamille === "maquillée chic assumée" && m.famille_esthetique !== "maquillée chic assumée") {
          return false;
        } else if (filtreFamille === "no-makeup naturelle" && m.famille_esthetique === "maquillée chic assumée") {
          return false;
        }
      }
      if (filtreGenre !== "all") {
        const ageNum = typeof m.age === "number" ? m.age : parseInt(String(m.age).split("-")[0], 10) || 0;
        if (filtreGenre === "enfant" && ageNum > 12) return false;
        if (filtreGenre === "ado" && (ageNum < 13 || ageNum > 20)) return false;
        if (filtreGenre === "F-adulte" && (m.genre !== "F" || ageNum <= 12)) return false;
        if (filtreGenre === "H-adulte" && (m.genre !== "H" || ageNum <= 12)) return false;
      }
      if (filtreLieu !== "all" && (!m.lieu_de_vie || !m.lieu_de_vie.toLowerCase().includes(filtreLieu.toLowerCase()))) {
        return false;
      }
      if (recherche.trim()) {
        const q = recherche.trim().toLowerCase();
        const hay = [m.prenom, m.id, m.style_wear_signature, m.lieu_de_vie || "", m.metier || "", (m.traits_narratifs || []).join(" ")]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, allCanoniques, filtreFamille, filtreGenre, filtreLieu, recherche]);

  const lignees = useMemo(() => {
    if (!data?.affinites?.lignees_familiales) return null;
    return data.affinites.lignees_familiales;
  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Loader2 size={32} className="animate-spin" strokeWidth={1.4} />
        <p style={{ fontFamily: "var(--font-sans)", marginTop: 16, opacity: 0.6 }}>Chargement du casting…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 24, color: "#a13a16" }}>
        Erreur : {error || "Référentiel non chargé"}
      </div>
    );
  }

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

      <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-editorial)", fontSize: 36, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            Casting
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.65, maxWidth: 720 }}>
            {allCanoniques.length} individus canoniques · 3 lignées familiales · 9 régions. Filtre, parcours et plonge dans chaque fiche.
          </p>
        </div>

        {/* Toggle Mur ↔ Lignées */}
        <div style={{ display: "flex", border: "0.5px solid var(--hub-border)", borderRadius: 999, padding: 3, background: "white" }}>
          <button
            type="button"
            onClick={() => setViewMode("mur")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: viewMode === "mur" ? "var(--hub-foreground)" : "transparent",
              color: viewMode === "mur" ? "var(--hub-bg)" : "var(--hub-foreground)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={13} /> Mur
          </button>
          <button
            type="button"
            onClick={() => setViewMode("lignees")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: viewMode === "lignees" ? "var(--hub-foreground)" : "transparent",
              color: viewMode === "lignees" ? "var(--hub-bg)" : "var(--hub-foreground)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <GitBranch size={13} /> Lignées
          </button>
        </div>
      </header>

      {viewMode === "mur" && (
        <>
          {/* Filtres */}
          <div
            style={{
              background: "white",
              border: "0.5px solid var(--hub-border)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 200 }}>
              <Search size={14} strokeWidth={1.6} style={{ opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Recherche prénom, ID, métier…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  background: "transparent",
                  color: "var(--hub-foreground)",
                }}
              />
            </div>
            <FilterPills options={FAMILLES_OPTIONS} value={filtreFamille} onChange={setFiltreFamille} />
            <FilterPills options={GENRES_OPTIONS} value={filtreGenre} onChange={setFiltreGenre} />
            <select
              value={filtreLieu}
              onChange={(e) => setFiltreLieu(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "0.5px solid var(--hub-border)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                background: "white",
                color: "var(--hub-foreground)",
                outline: "none",
              }}
            >
              {lieuxOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5, marginLeft: "auto" }}>
              {filtreCanoniques.length} / {allCanoniques.length}
            </span>
          </div>

          {/* Mur 4 cols */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {filtreCanoniques.map((c) => (
              <CanoniqueCard key={c.id} canonique={c} onClick={() => setSelectedCanonique(c)} />
            ))}
            {filtreCanoniques.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: 60,
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  opacity: 0.5,
                  background: "var(--hub-bg)",
                  borderRadius: 12,
                  border: "1px dashed var(--hub-border)",
                }}
              >
                Aucun canonique ne correspond aux filtres.
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === "lignees" && lignees && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(lignees).map(([key, lignee]) => {
            const titre = key
              .replace(/_/g, " ")
              .replace(/^./, (c) => c.toUpperCase());
            const membres = lignee.ids
              .map((id) => data.mannequins.mannequins.find((m) => m.id === id || id.startsWith(m.id + "-")))
              .filter((m): m is RawCanonique => Boolean(m));
            return (
              <section
                key={key}
                style={{
                  background: "white",
                  border: "0.5px solid var(--hub-border)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 24, fontWeight: 500, margin: 0, marginBottom: 8 }}>
                  Lignée {titre}
                </h2>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--hub-foreground)", opacity: 0.7, lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>
                  {lignee.narration}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {membres.map((m) => (
                    <CanoniqueCard key={m.id} canonique={m} onClick={() => setSelectedCanonique(m)} compact />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[...lignee.duos_associes, ...lignee.trios_associes].map((d) => (
                    <span
                      key={d}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        padding: "3px 8px",
                        background: "var(--hub-bg)",
                        border: "0.5px solid var(--hub-border)",
                        borderRadius: 999,
                        color: "var(--hub-foreground)",
                        opacity: 0.7,
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Modal fiche canonique */}
      {selectedCanonique && (
        <CanoniqueModal
          canonique={selectedCanonique}
          dispositifs={data.affinites.dispositifs_etablis}
          onClose={() => setSelectedCanonique(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function FilterPills({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: active ? "0.5px solid var(--hub-foreground)" : "0.5px solid var(--hub-border)",
              background: active ? "var(--hub-foreground)" : "white",
              color: active ? "var(--hub-bg)" : "var(--hub-foreground)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 120ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function slugifyPrenom(prenom: string): string {
  return prenom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^Bébé\s+/i, "") // strip "Bébé " prefix → "Noé" → "Noe"
    .replace(/^B[ée]b[ée]\s+/i, "")
    .replace(/[^a-zA-Z]/g, "");
}

function canoniqueImageUrl(c: RawCanonique): string {
  // MAN-XXX_Prenom_canonique.jpg
  // Pour les couples avec sub-id (-LEA, -SARAH, -HENRI, -JOSEPHINE), on extrait le sub
  const baseId = c.id.split("-").slice(0, 2).join("-");
  const suffix = c.id.split("-")[2];
  if (suffix) {
    const cap = suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
    return `/canoniques/${baseId}_${cap}_canonique.jpg`;
  }
  // Sinon on utilise le prénom (slugifié, sans "Bébé ")
  return `/canoniques/${baseId}_${slugifyPrenom(c.prenom || "")}_canonique.jpg`;
}

/**
 * Les couples (MAN-P11 Léa & Sarah, MAN-S19 Henri & Joséphine) sont stockés
 * comme une seule entrée dans mannequins_recurrents.json. Pour l'affichage
 * mur, on les split en 2 individus distincts (chacun avec sa photo).
 */
function expandCouples(mannequins: RawCanonique[]): RawCanonique[] {
  const result: RawCanonique[] = [];
  for (const m of mannequins) {
    if (m.id === "MAN-P11" && /Léa\s*&\s*Sarah|Lea\s*&\s*Sarah/i.test(m.prenom || "")) {
      // Split Léa+Sarah
      result.push({ ...m, id: "MAN-P11-LEA", prenom: "Léa", age: 37, ethnicite: "métisse", _coupleParent: "MAN-P11" } as RawCanonique & { _coupleParent: string });
      result.push({ ...m, id: "MAN-P11-SARAH", prenom: "Sarah", age: 35, ethnicite: "nordique", _coupleParent: "MAN-P11" } as RawCanonique & { _coupleParent: string });
    } else if (m.id === "MAN-S19" && /Henri\s*&\s*Jos[ée]phine/i.test(m.prenom || "")) {
      result.push({ ...m, id: "MAN-S19-HENRI", prenom: "Henri", age: 72, ethnicite: "blanc nordique", _coupleParent: "MAN-S19" } as RawCanonique & { _coupleParent: string });
      result.push({ ...m, id: "MAN-S19-JOSEPHINE", prenom: "Joséphine", age: 70, ethnicite: "afro-caribéenne", _coupleParent: "MAN-S19" } as RawCanonique & { _coupleParent: string });
    } else {
      result.push(m);
    }
  }
  return result;
}

function CanoniqueCard({ canonique, onClick, compact }: { canonique: RawCanonique; onClick: () => void; compact?: boolean }) {
  const url = canoniqueImageUrl(canonique);
  const isFamille2 = canonique.famille_esthetique === "maquillée chic assumée";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: "white",
        border: "0.5px solid var(--hub-border)",
        borderRadius: 12,
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        display: "flex",
        flexDirection: "column",
      }}
      className="canonique-card"
    >
      <div style={{ aspectRatio: "3/4", background: "var(--hub-bg)", overflow: "hidden", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={canonique.prenom}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0.2";
          }}
        />
        {isFamille2 && (
          <span style={{ position: "absolute", top: 8, right: 8, background: "#7a1a26", color: "white", padding: "3px 8px", borderRadius: 999, fontFamily: "var(--font-sans)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <Star size={9} fill="white" stroke="white" style={{ display: "inline", marginRight: 4 }} />
            Maquillée chic
          </span>
        )}
      </div>
      <div style={{ padding: compact ? 8 : 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
          <h3 style={{ fontFamily: "var(--font-editorial)", fontSize: compact ? 14 : 16, fontWeight: 500, margin: 0 }}>
            {canonique.prenom}
          </h3>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.5 }}>
            {canonique.age} ans
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, opacity: 0.5, margin: 0, marginBottom: 4 }}>
          <code>{canonique.id}</code>
        </p>
        {canonique.lieu_de_vie && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, opacity: 0.7, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={10} /> {canonique.lieu_de_vie.split(/[,(]/)[0].trim()}
          </p>
        )}
      </div>
    </button>
  );
}

function CanoniqueModal({ canonique, dispositifs, onClose }: { canonique: RawCanonique; dispositifs: DispositifEtabli[]; onClose: () => void }) {
  const url = canoniqueImageUrl(canonique);
  const dispositifsLies = dispositifs.filter((d) => d.membres.includes(canonique.id));
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,45,74,0.4)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 32,
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 20,
          maxWidth: 880,
          width: "100%",
          padding: 32,
          position: "relative",
          maxHeight: "calc(100vh - 64px)",
          overflow: "auto",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--hub-bg)",
            border: "none",
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
          <div style={{ aspectRatio: "3/4", background: "var(--hub-bg)", borderRadius: 12, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={canonique.prenom}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.2")}
            />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-editorial)", fontSize: 32, fontWeight: 500, margin: 0, marginBottom: 4 }}>
              {canonique.prenom}
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, opacity: 0.5, margin: 0, marginBottom: 16 }}>
              <code>{canonique.id}</code> · {canonique.age} ans · {canonique.genre} · {canonique.ethnicite}
            </p>

            {canonique.statut_relationnel && (
              <Section title="Statut" body={canonique.statut_relationnel} />
            )}
            {canonique.metier && <Section title="Métier" body={canonique.metier} />}
            {canonique.lieu_de_vie && <Section title="Lieu de vie" body={canonique.lieu_de_vie} icon={<MapPin size={12} />} />}

            {canonique.evenements_de_vie && canonique.evenements_de_vie.length > 0 && (
              <Section title="Événements de vie" list={canonique.evenements_de_vie} />
            )}

            {canonique.traits_narratifs && canonique.traits_narratifs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 8px 0" }}>
                  Traits narratifs
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {canonique.traits_narratifs.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 11,
                        padding: "3px 10px",
                        background: "var(--hub-bg)",
                        border: "0.5px solid var(--hub-border)",
                        borderRadius: 999,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {dispositifsLies.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 8px 0" }}>
                  <Heart size={11} fill="#E2627C" stroke="#E2627C" style={{ display: "inline", marginRight: 4 }} />
                  Dispositifs ({dispositifsLies.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dispositifsLies.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: "var(--hub-bg)",
                        border: "0.5px solid var(--hub-border)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                      }}
                    >
                      <strong style={{ fontFamily: "var(--font-editorial)", fontSize: 13 }}>
                        {d.id}
                      </strong>
                      <span style={{ marginLeft: 8, opacity: 0.6 }}>· {d.nature.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body, list, icon }: { title: string; body?: string; list?: string[]; icon?: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--hub-foreground)", opacity: 0.6, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 4 }}>
        {icon}
        {title}
      </h4>
      {body && <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5, margin: 0, color: "var(--hub-foreground)" }}>{body}</p>}
      {list && (
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5 }}>
          {list.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
