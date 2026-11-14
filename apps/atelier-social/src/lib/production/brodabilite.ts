/**
 * Brodabilité d'une commande : « qu'est-ce qui l'empêche de passer en machine ? »
 * Pur (sans fs) : utilisable côté client ET serveur.
 *
 * Trois verrous, dans l'ordre où on les lève en atelier :
 *   1. fournisseur — des pièces destinées à la commande ne sont pas encore reçues
 *      (lignes d'attendu de livraison dont « N° commande client » = la commande),
 *      ou un réassort est commandé sans attendu saisi ;
 *   2. dst — au moins une zone brodée et la préparation DST n'est pas signée au journal ;
 *   3. fiche — il manque une info de production sur un article (produit, fil, police…).
 * Aucune raison = prête à broder. Une commande déjà brodée sort du backlog broderie.
 */
import type { Commande } from "./commandes-loader";
import { manquesArticle } from "./completude";
import { estBrodee } from "./broderie-utils";

export type CleBlocage = "fournisseur" | "dst" | "fiche";

export interface Blocage {
  cle: CleBlocage;
  /** Détail lisible (« 3 pièces · IMBRETEX · prévu le 16/11 »). */
  detail: string;
  /** Lien vers l'endroit où lever le blocage. */
  href?: string;
}

/** Ligne d'attendu rattachée à la commande (forme minimale). */
export interface LigneAttenduBrodabilite {
  attendu_id: string;
  fournisseur: string;
  statut: string;
  date_livraison_prevue?: string | null;
  quantite: number;
  quantite_recue?: number | null;
}

export type EtatBrodabilite = "prete" | "bloquee" | "brodee";

export interface Brodabilite {
  etat: EtatBrodabilite;
  blocages: Blocage[];
}

export const BLOCAGE_META: Record<CleBlocage, { label: string; court: string; bg: string; fg: string }> = {
  fournisseur: { label: "Attente fournisseur", court: "Fournisseur", bg: "#FBEFE0", fg: "#8A5310" },
  dst: { label: "DST à faire", court: "DST", bg: "#E5EAF5", fg: "#1F3A7A" },
  fiche: { label: "Fiche à compléter", court: "Fiche", bg: "#F6E3E1", fg: "#8E2F25" },
};

export const ORDRE_BLOCAGES: CleBlocage[] = ["fournisseur", "dst", "fiche"];

function jjmm(iso?: string | null): string {
  if (!iso) return "";
  const [, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}`;
}

export function brodabiliteCommande(c: Commande, lignes: LigneAttenduBrodabilite[]): Brodabilite {
  const dejaBrodee =
    !!c.journal?.broderie || ["terminee", "expediee", "archivee"].includes(c.statut) || !!c.journal?.archivee_le;
  if (dejaBrodee) return { etat: "brodee", blocages: [] };

  const blocages: Blocage[] = [];

  // 1. Fournisseur
  const enAttente = lignes.filter((l) => Math.min(l.quantite_recue ?? 0, l.quantite || 0) < (l.quantite || 0));
  if (enAttente.length) {
    const pieces = enAttente.reduce((s, l) => s + (l.quantite || 0) - Math.min(l.quantite_recue ?? 0, l.quantite || 0), 0);
    const fournisseurs = [...new Set(enAttente.map((l) => l.fournisseur).filter(Boolean))].join(", ");
    const dates = enAttente.map((l) => l.date_livraison_prevue).filter((d): d is string => !!d).sort();
    const prevu = dates.length ? ` · prévu le ${jjmm(dates[dates.length - 1])}` : "";
    const attendus = [...new Set(enAttente.map((l) => l.attendu_id))];
    blocages.push({
      cle: "fournisseur",
      detail: `${pieces} pièce${pieces > 1 ? "s" : ""} à recevoir${fournisseurs ? ` · ${fournisseurs}` : ""}${prevu}`,
      href: attendus.length === 1 ? `/atelier-production/attendus/${encodeURIComponent(attendus[0])}` : "/atelier-production/attendus",
    });
  } else if (c.journal?.reassort_fournisseur && !lignes.length) {
    blocages.push({
      cle: "fournisseur",
      detail: `Réassort commandé${c.journal.reassort_fournisseur.commande_le ? ` le ${jjmm(c.journal.reassort_fournisseur.commande_le)}` : ""} · attendu de livraison pas encore saisi`,
      href: "/atelier-production/attendus",
    });
  }

  // 2. DST
  const zonesBrodees = c.articles.flatMap((a) => a.broderies.filter(estBrodee));
  if (zonesBrodees.length && !c.journal?.dst) {
    const sansFichier = zonesBrodees.filter((b) => !b.fichiers?.some((f) => f.kind === "dst")).length;
    blocages.push({
      cle: "dst",
      detail: sansFichier
        ? `${sansFichier} zone${sansFichier > 1 ? "s" : ""} sans fichier DST`
        : "Fichiers DST déposés · à signer au journal",
    });
  }

  // 3. Fiche
  const manques = [...new Set(c.articles.flatMap((a) => manquesArticle(a)))];
  if (manques.length) {
    blocages.push({ cle: "fiche", detail: manques.slice(0, 4).join(", ") + (manques.length > 4 ? "…" : "") });
  }

  return { etat: blocages.length ? "bloquee" : "prete", blocages };
}
