/**
 * Loader serveur pour le module Atelier Production → Commandes.
 *
 * Les commandes vivent en base Supabase (table `commandes`) — le disque
 * Railway est éphémère et repart de zéro à chaque déploiement.
 *
 * Lit encore via fs (référentiels statiques, non liés à une commande) :
 *  - referentiels/shopify_sku_mapping.json (pivot SKU ↔ YPM / fils)
 *  - referentiels/durees_broderie.json (paramètres planning)
 *  - referentiels/fiches_techniques_ypm.json (FT Tajima Pulse)
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { supabase } from "@/lib/supabase";
import { alignerZoneCoiffe } from "./catalogue";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export const SKU_MAPPING_PATH = join(REFS_DIR, "shopify_sku_mapping.json");
export const DUREES_PATH = join(REFS_DIR, "durees_broderie.json");
export const FICHES_TECHNIQUES_PATH = join(REFS_DIR, "fiches_techniques_ypm.json");

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type StatutCommande = "a_planifier" | "planifiee" | "en_cours" | "terminee" | "expediee" | "archivee";
export type PrioriteCommande = "normale" | "urgente";
export type EtapeJournal = "dst" | "broderie" | "cq" | "expedition";
export type AlgoPlanning = "lpt" | "otif";
export type CommandeSource = "shopify" | "etsy" | "manuel";

export interface JournalEntree {
  par: string;
  le: string; // YYYY-MM-DD
  note?: string;
}

export interface ReassortFournisseur {
  commande_le: string; // YYYY-MM-DD — date de la commande fournisseur
  note?: string;
}

export interface JournalCommande {
  dst?: JournalEntree;
  broderie?: JournalEntree;
  cq?: JournalEntree;
  expedition?: JournalEntree;
  reassort_fournisseur?: ReassortFournisseur;
  archivee_le?: string;
}

export interface ReworkOrigine {
  commande_id: string;
  article_id: string;
  motif: string;
  zones_a_rebroder?: Placement[];
}
export type TypeBroderie =
  | "initiale_simple"
  | "mot_court"
  | "mot_moyen"
  | "texte_long"
  | "texte_tres_long"
  | "symbole_simple"
  | "symbole_complexe";
/** "tete" = coiffe (casquette : panneau frontal / bonnet : revers) — jamais « buste » sur une coiffe. */
export type Placement = "buste" | "poignet" | "dos" | "nuque" | "tete";
export type Machine = "TMEZ-1" | "TMEZ-2";

export interface AdressePostale {
  nom: string;
  adresse_ligne1: string;
  adresse_ligne2?: string;
  code_postal: string;
  ville: string;
  pays: string;
}

export interface ContactClient {
  email?: string;
  telephone?: string;
}

export type ModeLivraison = "locker" | "point_relais" | "domicile" | "retrait_atelier";

export interface Livraison {
  /** Ex. "Mondial Relay", "Colissimo", "Chronopost", "La Poste". */
  transporteur?: string;
  mode?: ModeLivraison;
  /** Nom / identifiant du locker ou du point relais. */
  point_relais?: string;
  numero_suivi?: string;
}

export interface ChampBroderie {
  label: string;
  valeur: string;
  type: TypeBroderie;
  duree_min: number;
  fil_id?: string;
  variante_filename?: string;
  source_duree?: "fiche_technique" | "classification" | "manuel";
  nb_points?: number;
}

export type BroderieFileKind = "visuel" | "pxf" | "dst" | "pdf";

export interface BroderieFile {
  id: string;
  kind: BroderieFileKind;
  storage_path: string;
  public_url: string;
  filename: string;
  uploaded_at: string; // ISO datetime
}

export interface Broderie {
  placement: Placement;
  champs: ChampBroderie[];
  /** Visuel attendu, fichier machine (PXF/DST) et/ou capture de la demande client — bucket Supabase `commandes-broderies`. */
  fichiers?: BroderieFile[];
  fil_id: string;
  fil_nom: string;
  fil_hex: string;
  fil_code_gunold: string;
  fil_id_secondaire?: string;
  fil_nom_secondaire?: string;
  fil_hex_secondaire?: string;
  fil_code_gunold_secondaire?: string;
  /** Police / typo du texte brodé (ex. "Russ Times", "Museo"). Défaut = typographie du motif. */
  police?: string;
  duree_broderie_min: number;
  duree_cadrage_min: number;
  duree_changement_fil_min: number;
  duree_total_min: number;
  note_atelier?: string;
}

export interface Article {
  id: string;
  sku: string;
  produit_id: string;
  produit_nom: string;
  motif_sku: string;
  ypm_id: string;
  ypm_nom: string;
  couleur_support: string;
  taille: string;
  /** Code couleur famille Akanea (4 chiffres, ex. "0064" = Vintage Bleu). */
  code_couleur?: string;
  /** Code taille Akanea (4 chiffres, ex. "0001" = XS, "0000" = TU). */
  code_taille?: string;
  /** Réf. article Akanea YPxxx-CCCC-TTTT (ex. YP013-0064-0000). */
  ref_article?: string;
  quantite: number;
  broderies: Broderie[];
  duree_preparation_dst_min: number;
  duree_setup_min: number;
  duree_cq_min: number;
  duree_total_article_min: number;
  notes?: string;
}

export interface PlanningSlot {
  id: string;
  machine: Machine;
  jour: string; // YYYY-MM-DD
  heure_debut: string; // HH:MM
  heure_fin: string;
  duree_min: number;
  article_id: string;
  commande_id: string;
}

export interface Planning {
  mode: "auto" | "manuel";
  algo?: AlgoPlanning;
  horizon_jours: number;
  date_debut: string;
  slots: PlanningSlot[];
  genere_le?: string;
}

export type TypeDocument = "bon_commande" | "devis" | "bat" | "bon_livraison" | "etiquette" | "autre";

/** Pièce du dossier de commande (bucket `commandes-pdf`). */
export interface DocumentCommande {
  id: string;
  type: TypeDocument;
  storage_path: string;
  public_url: string;
  filename: string;
  mime: string;
  size_bytes?: number;
  uploaded_by?: string;
  uploaded_at: string; // ISO datetime
  /** Ce que l'IA a lu dans la pièce (résumé court), pour traçabilité. */
  extraction?: string;
}

export interface BonPreparationPdf {
  storage_path: string;
  public_url: string;
  filename: string;
  uploaded_by?: string; // email admin
  uploaded_at: string;  // ISO datetime
  size_bytes?: number;
}

export interface Commande {
  id: string;
  numero_shopify: string;
  source: CommandeSource;
  date_commande: string;
  date_impression_bon?: string;
  statut: StatutCommande;
  priorite: PrioriteCommande;
  expedition: AdressePostale;
  facturation: AdressePostale;
  contact?: ContactClient;
  livraison?: Livraison;
  articles: Article[];
  planning: Planning | null;
  journal?: JournalCommande;
  rework_de?: ReworkOrigine;
  bon_preparation_pdf?: BonPreparationPdf;
  /** Dossier de commande : toutes les pièces jointes, typées. */
  documents?: DocumentCommande[];
  montant_total_ttc?: number | null;
  duree_total_min: number;
  nb_changements_fil_total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────
// SKU mapping
// ──────────────────────────────────────────────────────────

export interface SkuMapping {
  _meta: Record<string, unknown>;
  produits: Record<string, { type: string; nom_commercial: string; fournisseur: string; ref_fournisseur: string; duree_setup_machine_min: number; note: string }>;
  motifs_sku_to_ypm: Record<string, { ypm_id: string; nom_commercial: string; note: string }>;
  fils_couleur_libre_to_id: Record<string, string>;
  placements: Partial<Record<Placement, { label: string; cerceau: string; cote: string; note: string }>>;
  /** Nuancier interne (code_interne 4 chiffres → couleur fournisseur/libellé/id_palette), ex. "0049" = Off-White. */
  couleurs_support_code_interne?: {
    _meta: Record<string, unknown>;
    couleurs: Record<string, { code_interne: number; couleur_fournisseur: string; libelle_interne: string; id_palette?: string }>;
  };
}

export function getSkuMapping(): SkuMapping {
  return JSON.parse(readFileSync(SKU_MAPPING_PATH, "utf-8")) as SkuMapping;
}

// ──────────────────────────────────────────────────────────
// Durées broderie
// ──────────────────────────────────────────────────────────

export interface DureesRef {
  _meta: { vitesse_machine_pts_par_min?: number; [k: string]: unknown };
  operations: Record<string, { label: string; duree_min: number; note: string; scope?: string }>;
  broderie_types: Record<string, { label: string; duree_min: number; exemples?: string[]; points_estim?: number }>;
  regles_classification_auto: {
    longueur_caracteres: Array<{ max: number; type: TypeBroderie }>;
    symboles_simples: string[];
    symboles_complexes: string[];
  };
  capacite_atelier: {
    nb_machines: number;
    noms_machines: Machine[];
    heures_effectives_par_jour: number;
    minutes_effectives_par_jour: number;
    jours_ouvres: string[];
    pause_dejeuner_min: number;
    mutualiser_prep_dst_par_motif?: boolean;
  };
}

export function getDureesRef(): DureesRef {
  return JSON.parse(readFileSync(DUREES_PATH, "utf-8")) as DureesRef;
}

// ──────────────────────────────────────────────────────────
// Fiches techniques YPM (Tajima Pulse exports)
// ──────────────────────────────────────────────────────────

export interface FicheTechniqueYpm {
  variante_id: string;
  ypm_id: string;
  ypm_nom: string;
  label_variante?: string;
  nb_points: number;
  dimensions_mm: { largeur: number; hauteur: number };
  nb_changements_couleur: number;
  nb_coupe_fils?: number;
  usage_fil_m?: number;
  usage_bobine_m?: number;
  cout_eur?: number;
  aiguilles?: Array<{ numero: number; code_fil: string; fournisseur_fil: string; usage_fil_m?: number; nb_points?: number }>;
  duree_broderie_calculee_min?: number;
  source_pdf?: string;
  importe_le?: string;
  note?: string;
}

export interface FichesTechniquesRef {
  _meta: { vitesse_machine_pts_par_min?: number; [k: string]: unknown };
  fiches: Record<string, FicheTechniqueYpm>;
}

export function getFichesTechniques(): FichesTechniquesRef {
  if (!existsSync(FICHES_TECHNIQUES_PATH)) return { _meta: {}, fiches: {} };
  return JSON.parse(readFileSync(FICHES_TECHNIQUES_PATH, "utf-8")) as FichesTechniquesRef;
}

export function findFicheTechnique(
  fts: FichesTechniquesRef,
  variantFilename?: string
): FicheTechniqueYpm | null {
  if (!variantFilename) return null;
  // Match exact, puis insensible casse
  if (fts.fiches[variantFilename]) return fts.fiches[variantFilename];
  const lower = variantFilename.toLowerCase();
  const found = Object.entries(fts.fiches).find(([k]) => k.toLowerCase() === lower);
  return found ? found[1] : null;
}

// ──────────────────────────────────────────────────────────
// Commandes (CRUD Supabase, table `commandes`)
// ──────────────────────────────────────────────────────────

const TBL_COMMANDES = "commandes";

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_commandes_mem__: Map<string, Commande> | undefined;
}

/** Fallback en mémoire pour le dev local sans Supabase configuré (pas de persistance réelle). */
function memStore(): Map<string, Commande> {
  if (!globalThis.__ypersoa_commandes_mem__) {
    globalThis.__ypersoa_commandes_mem__ = new Map();
  }
  return globalThis.__ypersoa_commandes_mem__;
}

interface CommandeRow {
  id: string;
  numero_shopify: string;
  source: CommandeSource;
  date_commande: string;
  date_impression_bon: string | null;
  statut: StatutCommande;
  priorite: PrioriteCommande;
  montant_total_ttc: number | null;
  duree_total_min: number;
  nb_changements_fil_total: number;
  expedition: AdressePostale;
  facturation: AdressePostale;
  contact: ContactClient | null;
  livraison: Livraison | null;
  articles: Article[];
  planning: Planning | null;
  journal: JournalCommande | null;
  rework_de: ReworkOrigine | null;
  bon_preparation_pdf: BonPreparationPdf | null;
  documents: DocumentCommande[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCommande(row: CommandeRow): Commande {
  // Commandes saisies avant la règle « coiffe = tête » : corrigées à la lecture.
  for (const a of row.articles ?? []) alignerZoneCoiffe(a);
  return {
    id: row.id,
    numero_shopify: row.numero_shopify,
    source: row.source,
    date_commande: row.date_commande,
    date_impression_bon: row.date_impression_bon ?? undefined,
    statut: row.statut,
    priorite: row.priorite,
    expedition: row.expedition,
    facturation: row.facturation,
    contact: row.contact ?? undefined,
    livraison: row.livraison ?? undefined,
    articles: row.articles,
    planning: row.planning,
    journal: row.journal ?? undefined,
    rework_de: row.rework_de ?? undefined,
    bon_preparation_pdf: row.bon_preparation_pdf ?? undefined,
    documents: row.documents ?? undefined,
    montant_total_ttc: row.montant_total_ttc,
    duree_total_min: row.duree_total_min,
    nb_changements_fil_total: row.nb_changements_fil_total,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function commandeToRow(commande: Commande): CommandeRow {
  return {
    id: commande.id,
    numero_shopify: commande.numero_shopify,
    source: commande.source ?? "manuel",
    date_commande: commande.date_commande,
    date_impression_bon: commande.date_impression_bon ?? null,
    statut: commande.statut,
    priorite: commande.priorite,
    montant_total_ttc: commande.montant_total_ttc ?? null,
    duree_total_min: commande.duree_total_min,
    nb_changements_fil_total: commande.nb_changements_fil_total,
    expedition: commande.expedition,
    facturation: commande.facturation,
    contact: commande.contact ?? null,
    livraison: commande.livraison ?? null,
    articles: commande.articles,
    planning: commande.planning,
    journal: commande.journal ?? null,
    rework_de: commande.rework_de ?? null,
    bon_preparation_pdf: commande.bon_preparation_pdf ?? null,
    documents: commande.documents ?? null,
    notes: commande.notes ?? null,
    created_at: commande.created_at,
    updated_at: commande.updated_at,
  };
}

export async function listCommandes(): Promise<Commande[]> {
  if (!supabase) {
    return Array.from(memStore().values()).sort((a, b) => b.id.localeCompare(a.id));
  }
  const { data, error } = await supabase.from(TBL_COMMANDES).select("*");
  if (error) throw new Error(`Lecture commandes échouée : ${error.message}`);
  return (data as CommandeRow[]).map(rowToCommande).sort((a, b) => b.id.localeCompare(a.id));
}

export async function getCommande(id: string): Promise<Commande | null> {
  if (!supabase) return memStore().get(id) ?? null;
  const { data, error } = await supabase.from(TBL_COMMANDES).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Lecture commande ${id} échouée : ${error.message}`);
  return data ? rowToCommande(data as CommandeRow) : null;
}

export async function writeCommande(commande: Commande): Promise<void> {
  commande.updated_at = new Date().toISOString();
  // Colonnes dénormalisées pour recherche/tri — resynchronisées depuis expedition à chaque écriture.
  const clientNom = commande.expedition?.nom ?? null;
  const clientVille = commande.expedition?.ville ?? null;
  const clientCodePostal = commande.expedition?.code_postal ?? null;

  if (!supabase) {
    memStore().set(commande.id, commande);
    return;
  }
  const row = {
    ...commandeToRow(commande),
    client_nom: clientNom,
    client_ville: clientVille,
    client_code_postal: clientCodePostal,
  };
  const { error } = await supabase.from(TBL_COMMANDES).upsert(row, { onConflict: "id" });
  if (error) throw new Error(`Écriture commande ${commande.id} échouée : ${error.message}`);
}

// ──────────────────────────────────────────────────────────
// Helpers calcul
// ──────────────────────────────────────────────────────────

export function classifierTexteEnType(
  valeur: string,
  durees: DureesRef,
  label?: string
): TypeBroderie {
  const v = valeur.trim().toLowerCase();
  const labelL = (label ?? "").toLowerCase();
  const labelForceTexte = /mot|texte|initiale|prenom|prénom|nom|date/.test(labelL);
  const labelForceSymbole = /symbole|icon|motif/.test(labelL);

  const isSymboleSimple = durees.regles_classification_auto.symboles_simples.includes(v);
  const isSymboleComplexe = durees.regles_classification_auto.symboles_complexes.includes(v);

  if (labelForceSymbole && !labelForceTexte) {
    return isSymboleComplexe ? "symbole_complexe" : "symbole_simple";
  }
  if (!labelForceTexte) {
    if (isSymboleComplexe) return "symbole_complexe";
    if (isSymboleSimple) return "symbole_simple";
  }
  for (const regle of durees.regles_classification_auto.longueur_caracteres) {
    if (valeur.length <= regle.max) return regle.type;
  }
  return "texte_tres_long";
}

export function dureeBroderiePourType(type: TypeBroderie, durees: DureesRef): number {
  return durees.broderie_types[type]?.duree_min ?? 0;
}

/**
 * Recalcule toutes les durées d'une commande à partir des référentiels.
 *
 * Pour chaque champ broderie :
 *  - si `variante_filename` référence une FT connue → duree = nb_points / vitesse (650 pts/min)
 *  - sinon → classifier par longueur/symbole et lire dans `broderie_types`
 *
 * Pour chaque article :
 *  - duree_preparation_dst_min = 5 min, mutualisée par YPM unique si l'option est activée
 *    (1er article qui rencontre un YPM "paye" la prep, les suivants identiques = 0)
 *  - on conserve duree_setup_min et duree_cq_min existants
 */
export function recalculerDureesCommande(
  commande: Commande,
  durees: DureesRef,
  fts?: FichesTechniquesRef
): Commande {
  const fichesTech = fts ?? getFichesTechniques();
  const vitesse = durees._meta.vitesse_machine_pts_par_min ?? 650;
  const prepDstMin = durees.operations.preparation_dst?.duree_min ?? 5;
  const mutualiser = durees.capacite_atelier.mutualiser_prep_dst_par_motif ?? true;
  const ypmAvecPrepDejaCompte = new Set<string>();

  let totalMin = 0;
  let nbChangementsFil = 0;

  for (const article of commande.articles) {
    // (1) Préparation DST : mutualisée par YPM si activée
    if (mutualiser && ypmAvecPrepDejaCompte.has(article.ypm_id)) {
      article.duree_preparation_dst_min = 0;
    } else {
      article.duree_preparation_dst_min = prepDstMin;
      ypmAvecPrepDejaCompte.add(article.ypm_id);
    }

    // (2) Recalcul des champs broderie
    for (const broderie of article.broderies) {
      for (const champ of broderie.champs) {
        const ft = findFicheTechnique(fichesTech, champ.variante_filename);
        if (ft) {
          champ.nb_points = ft.nb_points;
          champ.duree_min = Math.round((ft.nb_points / vitesse) * 10) / 10;
          champ.source_duree = "fiche_technique";
        } else if (champ.source_duree !== "manuel") {
          const type = classifierTexteEnType(champ.valeur, durees, champ.label);
          champ.type = type;
          champ.duree_min = dureeBroderiePourType(type, durees);
          champ.source_duree = "classification";
        }
      }
      const dureeBrod = Math.round(broderie.champs.reduce((s, c) => s + c.duree_min, 0));
      broderie.duree_broderie_min = dureeBrod;
      broderie.duree_total_min = dureeBrod + broderie.duree_cadrage_min + broderie.duree_changement_fil_min;
      if (broderie.duree_changement_fil_min > 0) {
        nbChangementsFil += Math.round(broderie.duree_changement_fil_min / 2);
      }
    }

    // (3) Total article = DST + setup + somme(broderies) + CQ
    const articleTotal =
      article.duree_preparation_dst_min +
      article.duree_setup_min +
      article.broderies.reduce((s, b) => s + b.duree_total_min, 0) +
      article.duree_cq_min;
    article.duree_total_article_min = articleTotal;
    totalMin += articleTotal * (article.quantite || 1);
  }

  commande.duree_total_min = totalMin;
  commande.nb_changements_fil_total = nbChangementsFil;
  return commande;
}
