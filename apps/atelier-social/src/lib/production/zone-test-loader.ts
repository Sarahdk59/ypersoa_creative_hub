/**
 * Loader serveur pour le module Atelier Production → Zone de test.
 *
 * Persisté en Supabase (12/11/2026) — le disque Railway est éphémère et
 * chaque déploiement effaçait les tests créés en ligne :
 *  - table `zone_tests` (1 ligne = 1 test, ZoneTest complet en jsonb)
 *  - bucket privé `zone-test` : fichiers DST / PXF / aperçus, {test_id}/{file_id}.{ext}
 *
 * Remplace referentiels/zone_test.json + assets/zone-test/ (cf. migration 20261112_zone_tests.sql).
 */
import "server-only";
import { supabase } from "@/lib/supabase";

const TBL = "zone_tests";
export const BUCKET_ZONE_TEST = "zone-test";

// ──────────────────────────────────────────────────────────
// Attribution
// ──────────────────────────────────────────────────────────
export type ZoneTestAssignee = "Adriana" | "Cyrielle" | "Yasmine";
export const ZONE_TEST_ASSIGNEES: ZoneTestAssignee[] = ["Adriana", "Cyrielle", "Yasmine"];

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
// CRUD Supabase
// ──────────────────────────────────────────────────────────
function client() {
  if (!supabase) throw new Error("Supabase non configuré : la Zone de test ne peut pas être enregistrée.");
  return supabase;
}

function erreur(contexte: string, message: string): Error {
  return /does not exist|schema cache|bucket not found/i.test(message)
    ? new Error(`${contexte} : stockage Zone de test absent — appliquer la migration 20261112_zone_tests.sql.`)
    : new Error(`${contexte} : ${message}`);
}

/** Tous les tests, plus récents d'abord (même forme que l'ancien fichier JSON). */
export async function readZoneTest(): Promise<ZoneTestRef> {
  const { data, error } = await client().from(TBL).select("data, created_at").order("created_at", { ascending: false });
  if (error) throw erreur("Lecture des tests", error.message);
  const tests = (data ?? []).map((r) => {
    const t = r.data as ZoneTest;
    if (!Array.isArray(t.files)) t.files = [];
    return t;
  });
  return {
    _meta: { schema_version: "2.0", referentiel: "zone_test", description: "Supabase — table zone_tests + bucket zone-test" },
    tests,
  };
}

export async function getZoneTest(id: string): Promise<ZoneTest | null> {
  const { data, error } = await client().from(TBL).select("data").eq("id", id).maybeSingle();
  if (error) throw erreur(`Lecture du test ${id}`, error.message);
  if (!data) return null;
  const t = data.data as ZoneTest;
  if (!Array.isArray(t.files)) t.files = [];
  return t;
}

export async function saveZoneTest(test: ZoneTest): Promise<void> {
  const { error } = await client().from(TBL).upsert({ id: test.id, data: test }, { onConflict: "id" });
  if (error) throw erreur(`Enregistrement du test ${test.id}`, error.message);
}

export async function deleteZoneTest(test: ZoneTest): Promise<void> {
  const paths = test.files.map((f) => storagePath(test.id, f));
  if (paths.length) await client().storage.from(BUCKET_ZONE_TEST).remove(paths); // best effort
  const { error } = await client().from(TBL).delete().eq("id", test.id);
  if (error) throw erreur(`Suppression du test ${test.id}`, error.message);
}

export function storagePath(testId: string, f: Pick<ZoneTestFile, "filename">): string {
  return `${testId}/${f.filename}`;
}

export function contentTypeZoneTest(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream"; // .dst / .pxf : binaire générique
}

export async function uploadZoneTestFile(testId: string, filename: string, buffer: Buffer): Promise<void> {
  const { error } = await client()
    .storage.from(BUCKET_ZONE_TEST)
    .upload(`${testId}/${filename}`, buffer, { contentType: contentTypeZoneTest(filename), upsert: true });
  if (error) throw erreur("Envoi du fichier", error.message);
}

export async function downloadZoneTestFile(testId: string, f: ZoneTestFile): Promise<Buffer | null> {
  const { data, error } = await client().storage.from(BUCKET_ZONE_TEST).download(storagePath(testId, f));
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeZoneTestFile(testId: string, f: ZoneTestFile): Promise<void> {
  await client().storage.from(BUCKET_ZONE_TEST).remove([storagePath(testId, f)]); // best effort
}

export function makeTestId() {
  return `test_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function makeFileId() {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
