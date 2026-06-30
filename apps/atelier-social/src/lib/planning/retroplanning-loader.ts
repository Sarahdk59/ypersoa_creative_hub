/**
 * Loader serveur — Planning commun créa / prod / comm (Atelier DA).
 *
 * Lit/écrit referentiels/retroplanning/actions_2027.json.
 * Pattern aligné sur lib/production/commandes-loader.ts (fs côté API route, pas d'import statique).
 *
 * Source des dates : docs/RETROPLANNING_2027.md (4 drops trimestriels + temps forts comm).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
export const RETROPLANNING_PATH = join(REFS_DIR, "retroplanning", "actions_2027.json");

export type Equipe = "crea" | "prod" | "comm";
export type StatutAction = "a_faire" | "en_cours" | "fait";
export type TypeAction =
  // CRÉA
  | "inspiration"
  | "plan_collection"
  | "choix_produits_motifs"
  | "sourcing"
  | "reunion"
  | "validation_collection"
  | "generation_variantes"
  | "shooting_photo"
  | "fiche_produit"
  | "integration_shopify"
  | "liquid_perso"
  | "dev_motifs"
  | "mise_en_ligne"
  | "seo"
  // PROD
  | "base_dst"
  | "tests_motifs"
  | "correction_tests"
  | "creation_png"
  | "production"
  | "cutoff"
  // COMM
  | "creation_contenu"
  | "photos_carrousels"
  | "videos"
  | "validation_contenus"
  | "validation_tags"
  | "planning_publi"
  | "validation_fiches"
  | "presentation"
  | "pinterest"
  | "insta";

export interface ActionPlanning {
  id: string;
  date: string; // YYYY-MM-DD
  date_fin?: string; // YYYY-MM-DD (plages, ex. dév motifs)
  equipe: Equipe;
  type: TypeAction;
  drop: string; // drop1..drop4
  campagne: string;
  titre: string;
  statut: StatutAction;
  responsable: string;
  notes: string;
}

export interface DropMeta {
  code: string;
  nom: string;
  periode: string;
  campagnes: string;
}

export interface RetroplanningFile {
  _meta: Record<string, unknown>;
  drops: DropMeta[];
  actions: ActionPlanning[];
}

export function loadRetroplanning(): RetroplanningFile {
  if (!existsSync(RETROPLANNING_PATH)) {
    return { _meta: {}, drops: [], actions: [] };
  }
  return JSON.parse(readFileSync(RETROPLANNING_PATH, "utf8")) as RetroplanningFile;
}

function writeRetroplanning(data: RetroplanningFile): void {
  writeFileSync(RETROPLANNING_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** Champs éditables depuis l'UI (les autres sont figés par le seed). */
export type ActionPatch = Partial<Pick<ActionPlanning, "statut" | "date" | "date_fin" | "responsable" | "notes" | "titre">>;

/** Met à jour une action par id. Retourne l'action modifiée, ou null si introuvable. */
export function patchAction(id: string, patch: ActionPatch): ActionPlanning | null {
  const data = loadRetroplanning();
  const action = data.actions.find((a) => a.id === id);
  if (!action) return null;
  Object.assign(action, patch);
  writeRetroplanning(data);
  return action;
}

function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Crée une action (champs métier requis). Génère un id unique si absent. */
export function createAction(input: Partial<ActionPlanning>): ActionPlanning {
  const data = loadRetroplanning();
  let id = input.id || `manuel-${slugify(input.titre || "action")}-${input.date || ""}`;
  let n = 2;
  while (data.actions.some((a) => a.id === id)) id = `${id}-${n++}`;
  const action: ActionPlanning = {
    id,
    date: input.date || "",
    date_fin: input.date_fin || undefined,
    equipe: (input.equipe as Equipe) || "crea",
    type: (input.type as TypeAction) || "plan_collection",
    drop: input.drop || "manuel",
    campagne: input.campagne || "",
    titre: input.titre || "Nouvel événement",
    statut: (input.statut as StatutAction) || "a_faire",
    responsable: input.responsable || "",
    notes: input.notes || "",
  };
  data.actions.push(action);
  data.actions.sort((a, b) => a.date.localeCompare(b.date));
  writeRetroplanning(data);
  return action;
}

/** Supprime une action par id. Retourne true si supprimée. */
export function deleteAction(id: string): boolean {
  const data = loadRetroplanning();
  const before = data.actions.length;
  data.actions = data.actions.filter((a) => a.id !== id);
  if (data.actions.length === before) return false;
  writeRetroplanning(data);
  return true;
}
