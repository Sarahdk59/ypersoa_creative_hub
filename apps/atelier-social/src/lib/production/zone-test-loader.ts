/**
 * Loader serveur pour le module Atelier Production → Zone de test.
 *
 * Lit/écrit :
 *  - referentiels/zone_test.json (1 fichier, tableau de tests)
 *  - assets/zone-test/{file_id}.{ext} (fichiers DST / PXF / aperçu JPG-PNG sur disque)
 *
 * Aucun import statique : tout via fs côté API route (pattern aligné prod_kanban / commandes).
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");

export const ZONE_TEST_PATH = join(REFS_DIR, "zone_test.json");
/** Dossier des fichiers attachés aux tests (repo root). */
export const ASSETS_ZONE_TEST_DIR = join(process.cwd(), "..", "..", "assets", "zone-test");

// ──────────────────────────────────────────────────────────
// Attribution
// ──────────────────────────────────────────────────────────
export type ZoneTestAssignee = "Adriana" | "Rebecca" | "Cyrielle";
export const ZONE_TEST_ASSIGNEES: ZoneTestAssignee[] = ["Adriana", "Rebecca", "Cyrielle"];

// ──────────────────────────────────────────────────────────
// Phases (suivi de l'avancement du test)
// ──────────────────────────────────────────────────────────
export type ZoneTestPhase =
  | "reception"
  | "machine"
  | "modif_a_prevoir"
  | "modif_faite"
  | "valide";

export interface ZoneTestPhaseMeta {
  id: ZoneTestPhase;
  numero: number;
  label: string;
  couleur: string;
}

export const ZONE_TEST_PHASES: ZoneTestPhaseMeta[] = [
  { id: "reception", numero: 1, label: "En réception", couleur: "#B5B0A6" },
  { id: "machine", numero: 2, label: "En machine", couleur: "#176B7A" },
  { id: "modif_a_prevoir", numero: 3, label: "Modification à prévoir", couleur: "#E8B547" },
  { id: "modif_faite", numero: 4, label: "Modification faite", couleur: "#6F8E70" },
  { id: "valide", numero: 5, label: "Validé", couleur: "#2F7A3E" },
];

export function isZoneTestPhase(v: unknown): v is ZoneTestPhase {
  return typeof v === "string" && ZONE_TEST_PHASES.some((p) => p.id === v);
}

// ──────────────────────────────────────────────────────────
// Fichiers attachés
// ──────────────────────────────────────────────────────────
export type ZoneTestFileKind = "dst" | "pxf" | "jpg";

/** Extensions acceptées par type de fichier. */
export const ZONE_TEST_KIND_EXT: Record<ZoneTestFileKind, string[]> = {
  dst: ["dst"],
  pxf: ["pxf"],
  jpg: ["jpg", "jpeg", "png"],
};

export interface ZoneTestFile {
  id: string;
  kind: ZoneTestFileKind;
  /** Nom sur disque dans assets/zone-test/ : {file_id}.{ext}. */
  filename: string;
  original_name: string;
  size: number;
  uploaded_at: string;
}

// ──────────────────────────────────────────────────────────
// Test
// ──────────────────────────────────────────────────────────
export interface ZoneTest {
  id: string;
  titre: string;
  description?: string;
  /** Personne à qui le test est attribué. */
  assignee?: ZoneTestAssignee;
  phase: ZoneTestPhase;
  /** Date de réalisation de la modification (renseignée quand phase = modif_faite). */
  modif_faite_le?: string; // YYYY-MM-DD
  /** Lien optionnel vers un motif YPM (ex. "YPM-006"). */
  motif_ypm?: string;
  files: ZoneTestFile[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ZoneTestRef {
  _meta: { schema_version: string; referentiel: string; last_updated?: string; description?: string };
  tests: ZoneTest[];
}

// ──────────────────────────────────────────────────────────
// CRUD fichier JSON
// ──────────────────────────────────────────────────────────
export function readZoneTest(): ZoneTestRef {
  const ref = JSON.parse(readFileSync(ZONE_TEST_PATH, "utf-8")) as ZoneTestRef;
  if (!Array.isArray(ref.tests)) ref.tests = [];
  return ref;
}

export function writeZoneTest(data: ZoneTestRef) {
  data._meta.last_updated = new Date().toISOString().slice(0, 10);
  writeFileSync(ZONE_TEST_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function makeTestId() {
  return `test_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function makeFileId() {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
