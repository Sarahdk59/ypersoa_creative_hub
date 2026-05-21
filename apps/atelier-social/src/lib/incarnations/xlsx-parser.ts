/**
 * Parser XLSX `04_INCARNATIONS.xlsx`.
 *
 * Lit la feuille INCARNATIONS et produit des ImportRow prêtes à appliquer.
 * Les autres feuilles (CHIPS_CONFIGURATEUR, COLLECTIONS_PHOTOS, AUDIT_MANQUES,
 * STATUTS) sont ignorées en Sprint 1.
 *
 * Tolérant aux variations de noms de colonnes — accepte les casses et accents
 * différents (ex. "Nom commercial" / "nom_commercial" / "NOM COMMERCIAL").
 */

import * as XLSX from "xlsx";

import type {
  IncarnationStatut,
  IncarnationTon,
  SpecBroderie,
} from "@/types/incarnations";
import type { ImportRow, ImportRowAction } from "./store";

const VALID_STATUTS: IncarnationStatut[] = [
  "concept",
  "a_digitaliser",
  "a_shooter",
  "a_publier",
  "actif",
  "archive",
];

const VALID_TONS: IncarnationTon[] = ["tendre", "complice", "humour", "affirme"];

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  code: ["code", "ypi", "code_ypi", "id"],
  nom_commercial: ["nom_commercial", "nom", "incarnation", "label"],
  motif_ypm: ["motif_ypm", "motif", "ypm", "code_motif"],
  mot_haut: ["mot_haut", "mot1", "mot_du_haut", "haut"],
  mot_bas: ["mot_bas", "mot2", "mot_du_bas", "bas"],
  symbole: ["symbole", "symbol", "icone", "icon"],
  couleur_fil_defaut: [
    "couleur_fil_defaut",
    "couleur_fil",
    "fil_defaut",
    "fil",
    "couleur",
  ],
  gabarits_cibles: ["gabarits_cibles", "gabarits", "yp", "gabarit"],
  collections_cibles: [
    "collections_cibles",
    "collections",
    "tags",
    "collections_shopify",
  ],
  ton: ["ton", "registre", "tonalite"],
  statut: ["statut", "status", "etat"],
  notes: ["notes", "note", "remarques", "commentaires"],
};

function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const normalized = headers.map((h) => norm(String(h ?? "")));
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) {
        map.set(key, idx);
        break;
      }
    }
  }
  return map;
}

function readCell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  const v = row[idx];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function splitList(raw: string): string[] {
  if (!raw) return [];
  // Supporte : "YP001,YP005,YP019" / "YP001 · YP005" / "YP001 | YP005"
  return raw
    .split(/[,;··|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTon(raw: string): IncarnationTon | null {
  const n = norm(raw);
  if (!n) return null;
  for (const t of VALID_TONS) {
    if (norm(t) === n) return t;
  }
  // Variantes courantes : "affirmé" → "affirme", "complice & fun" → "complice"
  if (n.startsWith("affirm")) return "affirme";
  if (n.startsWith("tendr")) return "tendre";
  if (n.startsWith("complic")) return "complice";
  if (n.startsWith("humour")) return "humour";
  return null;
}

function parseStatut(raw: string): IncarnationStatut {
  const n = norm(raw);
  if (!n) return "concept";
  for (const s of VALID_STATUTS) {
    if (norm(s) === n) return s;
  }
  // Variantes
  if (n.includes("digitalis")) return "a_digitaliser";
  if (n.includes("shoot")) return "a_shooter";
  if (n.includes("publi")) return "a_publier";
  if (n === "actif" || n === "active" || n === "live") return "actif";
  if (n === "archive" || n === "archived") return "archive";
  return "concept";
}

export interface ParseXlsxResult {
  rows: ImportRow[];
  errors: string[];
  sheetUsed: string | null;
  totalRows: number;
}

function pickIncarnationsSheet(workbook: XLSX.WorkBook): string | null {
  const candidates = workbook.SheetNames.map((n) => ({ original: n, normalized: norm(n) }));
  // Priorité : nom contient "incarnation"
  const exact = candidates.find((c) => c.normalized.includes("incarnation"));
  if (exact) return exact.original;
  // Sinon, première feuille
  return workbook.SheetNames[0] ?? null;
}

/**
 * Parse un buffer XLSX et retourne les lignes prêtes à importer (action 'create' / 'update').
 * Décide create vs update via la liste d'incarnations existantes (codes connus).
 */
export function parseIncarnationsXlsx(
  buffer: ArrayBuffer | Uint8Array,
  existingCodes: Set<string>,
): ParseXlsxResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = pickIncarnationsSheet(workbook);
  if (!sheetName) {
    return { rows: [], errors: ["Aucune feuille trouvée dans le fichier."], sheetUsed: null, totalRows: 0 };
  }
  const sheet = workbook.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (aoa.length < 2) {
    return {
      rows: [],
      errors: [`Feuille "${sheetName}" vide ou sans en-têtes.`],
      sheetUsed: sheetName,
      totalRows: 0,
    };
  }

  const headers = aoa[0] as unknown[];
  const headerMap = buildHeaderMap(headers.map((h) => String(h ?? "")));
  const errors: string[] = [];

  // Validation : colonnes critiques
  const required = ["code", "nom_commercial", "motif_ypm"];
  const missing = required.filter((k) => !headerMap.has(k));
  if (missing.length > 0) {
    errors.push(
      `Colonnes manquantes dans la feuille "${sheetName}" : ${missing.join(", ")}. Colonnes lues : ${headers.join(" / ")}`,
    );
    return { rows: [], errors, sheetUsed: sheetName, totalRows: aoa.length - 1 };
  }

  const rows: ImportRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.length === 0) continue;

    const code = readCell(row, headerMap.get("code"));
    const nom = readCell(row, headerMap.get("nom_commercial"));
    const motifYpm = readCell(row, headerMap.get("motif_ypm"));

    // Ligne vide ?
    if (!code && !nom && !motifYpm) continue;

    const rowErrors: string[] = [];
    if (!code) rowErrors.push("code manquant");
    if (!nom) rowErrors.push("nom_commercial manquant");
    if (!motifYpm) rowErrors.push("motif_ypm manquant");

    const spec: SpecBroderie = {
      mot_haut: readCell(row, headerMap.get("mot_haut")),
      mot_bas: readCell(row, headerMap.get("mot_bas")),
      symbole: readCell(row, headerMap.get("symbole")) || "Aucun",
      couleur_fil_defaut: readCell(row, headerMap.get("couleur_fil_defaut")),
    };

    const action: ImportRowAction = rowErrors.length > 0
      ? "skip"
      : existingCodes.has(code)
        ? "update"
        : "create";

    rows.push({
      action,
      code,
      nom_commercial: nom,
      motif_ypm: motifYpm,
      spec_broderie: spec,
      gabarits_cibles: splitList(readCell(row, headerMap.get("gabarits_cibles"))),
      collections_cibles: splitList(readCell(row, headerMap.get("collections_cibles"))),
      ton: parseTon(readCell(row, headerMap.get("ton"))),
      statut: parseStatut(readCell(row, headerMap.get("statut"))),
      notes: readCell(row, headerMap.get("notes")) || null,
      errors: rowErrors.length > 0 ? rowErrors : undefined,
    });
  }

  return {
    rows,
    errors,
    sheetUsed: sheetName,
    totalRows: aoa.length - 1,
  };
}
