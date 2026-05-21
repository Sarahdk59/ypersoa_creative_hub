/**
 * Loader serveur pour le module Atelier Production → Commandes.
 *
 * Lit/écrit :
 *  - referentiels/commandes/*.json (1 fichier par commande)
 *  - referentiels/shopify_sku_mapping.json (pivot SKU ↔ YPM / fils)
 *  - referentiels/durees_broderie.json (paramètres planning)
 *
 * Aucun import statique de gros JSON : tout via fs côté API route.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export const COMMANDES_DIR = join(REFS_DIR, "commandes");
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

export interface JournalEntree {
  par: string;
  le: string; // YYYY-MM-DD
  note?: string;
}

export interface JournalCommande {
  dst?: JournalEntree;
  broderie?: JournalEntree;
  cq?: JournalEntree;
  expedition?: JournalEntree;
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
export type Placement = "buste" | "poignet" | "dos" | "nuque";
export type Machine = "TMEZ-1" | "TMEZ-2";

export interface AdressePostale {
  nom: string;
  adresse_ligne1: string;
  adresse_ligne2?: string;
  code_postal: string;
  ville: string;
  pays: string;
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

export interface Broderie {
  placement: Placement;
  champs: ChampBroderie[];
  fil_id: string;
  fil_nom: string;
  fil_hex: string;
  fil_code_gunold: string;
  fil_id_secondaire?: string;
  fil_nom_secondaire?: string;
  fil_hex_secondaire?: string;
  fil_code_gunold_secondaire?: string;
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

export interface Commande {
  id: string;
  numero_shopify: string;
  date_commande: string;
  date_impression_bon?: string;
  statut: StatutCommande;
  priorite: PrioriteCommande;
  expedition: AdressePostale;
  facturation: AdressePostale;
  articles: Article[];
  planning: Planning | null;
  journal?: JournalCommande;
  rework_de?: ReworkOrigine;
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
  placements: Record<Placement, { label: string; cerceau: string; cote: string; note: string }>;
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
// Commandes (CRUD fichier)
// ──────────────────────────────────────────────────────────

function ensureCommandesDir() {
  if (!existsSync(COMMANDES_DIR)) {
    mkdirSync(COMMANDES_DIR, { recursive: true });
  }
}

export function listCommandes(): Commande[] {
  ensureCommandesDir();
  const files = readdirSync(COMMANDES_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  return files
    .map((f) => {
      try {
        const raw = readFileSync(join(COMMANDES_DIR, f), "utf-8");
        return JSON.parse(raw) as Commande;
      } catch {
        return null;
      }
    })
    .filter((c): c is Commande => c !== null)
    .sort((a, b) => b.id.localeCompare(a.id));
}

export function getCommande(id: string): Commande | null {
  const path = join(COMMANDES_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Commande;
}

export function writeCommande(commande: Commande): void {
  ensureCommandesDir();
  commande.updated_at = new Date().toISOString().slice(0, 10);
  const path = join(COMMANDES_DIR, `${commande.id}.json`);
  writeFileSync(path, JSON.stringify(commande, null, 2) + "\n", "utf-8");
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
