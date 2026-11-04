/**
 * Attendus de livraison fournisseur — types + lecture/écriture Supabase.
 *
 * 1 attendu = 1 facture / bon de livraison fournisseur. Chaque ligne est
 * rattachée (ou à rattacher) à une réf. article Ypersoa YPxxx-CCCC-TTTT, et
 * peut être destinée à une commande client (prod) ou à la R&D.
 */
import "server-only";
import { supabase } from "@/lib/supabase";

const TBL = "attendus_livraison";

export type StatutAttendu = "attendu" | "recu_partiel" | "recu" | "litige";
export type UsageLigne = "prod" | "stock" | "rnd";
export type EtatRapprochement = "reference" | "a_creer" | "produit_inconnu";

export interface LigneAttendu {
  id: string;
  /** Code variante fournisseur tel qu'imprimé (ex. JH001CFPKL). */
  ref_fournisseur: string;
  /** Réf. modèle fabricant (ex. JH001). */
  ref_modele?: string;
  designation: string;
  coloris: string;
  taille: string;
  quantite: number;
  pu_ht: number | null;
  total_ht: number | null;
  /** Rattachement Ypersoa. */
  ref_produit?: string;
  code_couleur?: string;
  code_taille?: string;
  ref_article?: string;
  libelle_article?: string;
  etat: EtatRapprochement;
  manque?: string[];
  /** Produit R&D (« À compléter » dans la base produit ou créé depuis le Hub). */
  produit_rnd?: boolean;
  /** true = réf. choisie/créée à la main : le recalcul auto ne l'écrase pas. */
  rattachement_manuel?: boolean;
  /** Destination : prod (commande client), stock, R&D. */
  usage: UsageLigne;
  commande_client?: string;
  /** Réception. */
  quantite_recue?: number;
  note?: string;
}

export interface DocumentAttendu {
  storage_path: string;
  public_url: string;
  filename: string;
  uploaded_at: string;
}

export interface Attendu {
  id: string;
  fournisseur: string;
  numero_facture?: string;
  numero_commande_fournisseur?: string;
  date_commande?: string;
  date_facture?: string;
  date_livraison_prevue?: string;
  statut: StatutAttendu;
  total_ht?: number | null;
  total_ttc?: number | null;
  devise: string;
  lignes: LigneAttendu[];
  documents: DocumentAttendu[];
  notes?: string;
  recu_par?: string;
  recu_le?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface AttenduRow extends Omit<Attendu, "numero_facture" | "numero_commande_fournisseur" | "date_commande" | "date_facture" | "date_livraison_prevue" | "notes" | "recu_par" | "recu_le" | "created_by"> {
  numero_facture: string | null;
  numero_commande_fournisseur: string | null;
  date_commande: string | null;
  date_facture: string | null;
  date_livraison_prevue: string | null;
  notes: string | null;
  recu_par: string | null;
  recu_le: string | null;
  created_by: string | null;
}

const u = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);

function rowToAttendu(row: AttenduRow): Attendu {
  return {
    ...row,
    numero_facture: u(row.numero_facture),
    numero_commande_fournisseur: u(row.numero_commande_fournisseur),
    date_commande: u(row.date_commande),
    date_facture: u(row.date_facture),
    date_livraison_prevue: u(row.date_livraison_prevue),
    notes: u(row.notes),
    recu_par: u(row.recu_par),
    recu_le: u(row.recu_le),
    created_by: u(row.created_by),
    total_ht: row.total_ht === null ? null : Number(row.total_ht),
    total_ttc: row.total_ttc === null ? null : Number(row.total_ttc),
    lignes: row.lignes ?? [],
    documents: row.documents ?? [],
  };
}

function attenduToRow(a: Attendu): AttenduRow {
  return {
    id: a.id,
    fournisseur: a.fournisseur ?? "",
    numero_facture: a.numero_facture ?? null,
    numero_commande_fournisseur: a.numero_commande_fournisseur ?? null,
    date_commande: a.date_commande || null,
    date_facture: a.date_facture || null,
    date_livraison_prevue: a.date_livraison_prevue || null,
    statut: a.statut,
    total_ht: a.total_ht ?? null,
    total_ttc: a.total_ttc ?? null,
    devise: a.devise || "EUR",
    lignes: a.lignes,
    documents: a.documents ?? [],
    notes: a.notes ?? null,
    recu_par: a.recu_par ?? null,
    recu_le: a.recu_le || null,
    created_by: a.created_by ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

function tableAbsente(msg: string): Error {
  return /does not exist|schema cache/i.test(msg)
    ? new Error("Table attendus_livraison absente : appliquer la migration 20261105_attendus_livraison.sql.")
    : new Error(msg);
}

export async function listAttendus(): Promise<Attendu[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TBL).select("*");
  if (error) throw tableAbsente(`Lecture attendus échouée : ${error.message}`);
  return (data as AttenduRow[])
    .map(rowToAttendu)
    .sort((a, b) => (b.date_livraison_prevue ?? b.created_at).localeCompare(a.date_livraison_prevue ?? a.created_at));
}

export async function getAttendu(id: string): Promise<Attendu | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TBL).select("*").eq("id", id).maybeSingle();
  if (error) throw tableAbsente(`Lecture attendu ${id} échouée : ${error.message}`);
  return data ? rowToAttendu(data as AttenduRow) : null;
}

export async function writeAttendu(a: Attendu): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré.");
  a.updated_at = new Date().toISOString();
  const { error } = await supabase.from(TBL).upsert(attenduToRow(a), { onConflict: "id" });
  if (error) throw tableAbsente(`Écriture attendu ${a.id} échouée : ${error.message}`);
}

export async function deleteAttendu(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase non configuré.");
  const { error } = await supabase.from(TBL).delete().eq("id", id);
  if (error) throw tableAbsente(`Suppression attendu ${id} échouée : ${error.message}`);
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

export function nouvelIdAttendu(date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `AL-${d}-${Math.random().toString(36).slice(2, 6)}`;
}

export function nouvelIdLigne(): string {
  return `L-${Math.random().toString(36).slice(2, 8)}`;
}

/** Date + n jours ouvrés (sam/dim sautés). Livraison fournisseur = 24/48h. */
export function plusJoursOuvres(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  let reste = n;
  while (reste > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const j = d.getUTCDay();
    if (j !== 0 && j !== 6) reste--;
  }
  return d.toISOString().slice(0, 10);
}

/** Statut déduit des quantités reçues (le litige reste manuel). */
export function statutDepuisReception(a: Attendu): StatutAttendu {
  if (a.statut === "litige") return "litige";
  const total = a.lignes.reduce((s, l) => s + (l.quantite || 0), 0);
  const recu = a.lignes.reduce((s, l) => s + Math.min(l.quantite_recue ?? 0, l.quantite || 0), 0);
  if (total > 0 && recu >= total) return "recu";
  if (recu > 0) return "recu_partiel";
  return "attendu";
}

export function resumeAttendu(a: Attendu) {
  const pieces = a.lignes.reduce((s, l) => s + (l.quantite || 0), 0);
  const recues = a.lignes.reduce((s, l) => s + Math.min(l.quantite_recue ?? 0, l.quantite || 0), 0);
  const aCreer = a.lignes.filter((l) => l.etat !== "reference").length;
  const rnd = a.lignes.filter((l) => l.usage === "rnd").length;
  return { pieces, recues, aCreer, rnd, nbLignes: a.lignes.length };
}
