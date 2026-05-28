/**
 * Parsing d'un bon de préparation Shopify (PDF) → draft Commande.
 *
 * Pipeline :
 *  1. pdf-parse pour extraire le texte brut du PDF (côté Node, server-only)
 *  2. OpenAI gpt-4o (JSON mode strict) pour transformer le texte non structuré
 *     en payload typé : numéro, dates, expé/facturation, articles avec SKU,
 *     broderies (placement + champs + couleur de fil libre)
 *  3. Hydratation locale via les référentiels :
 *      - SKU `YP005-CAL-BEIGE-XS` → produit_id, ypm_id, ypm_nom, couleur, taille
 *      - Couleur libre du fil → fil_id puis fil_hex / fil_code_gunold via la
 *        palette_fils_broderie_v2.json
 *  4. recalculerDureesCommande() pour calculer toutes les durées
 *
 * Renvoie une Commande prête à valider par l'admin. Ne persiste rien.
 */
import "server-only";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

import {
  getSkuMapping,
  getDureesRef,
  getFichesTechniques,
  recalculerDureesCommande,
  type Commande,
  type Article,
  type Broderie,
  type ChampBroderie,
  type Placement,
  type AdressePostale,
  type PrioriteCommande,
} from "./commandes-loader";

const REFS_DIR = join(process.cwd(), "..", "..", "referentiels");
const PALETTE_FILS_PATH = join(REFS_DIR, "palette_fils_broderie_v2.json");

// ──────────────────────────────────────────────────────────
// Étape 1 — Extraction texte brut du PDF
// ──────────────────────────────────────────────────────────

/**
 * Extrait le texte brut d'un PDF via pdf-parse v2 (API class-based).
 * Import dynamique pour rester compatible avec le bundler Next.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("pdf-parse");
  const PDFParse = mod.PDFParse ?? mod.default?.PDFParse;
  if (!PDFParse) throw new Error("pdf-parse: classe PDFParse introuvable");
  // pdf-parse attend un Uint8Array — Buffer en hérite, mais on convertit pour être explicite.
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return (result?.text ?? "").trim();
}

// ──────────────────────────────────────────────────────────
// Étape 2 — Structuration via OpenAI gpt-4o (JSON mode)
// ──────────────────────────────────────────────────────────

interface DraftArticle {
  sku: string;
  couleur_support?: string;
  taille?: string;
  quantite: number;
  broderies: Array<{
    placement?: string;
    fil_nom?: string;
    champs: Array<{ label: string; valeur: string }>;
    note_atelier?: string;
  }>;
  notes?: string;
}

interface DraftCommande {
  numero_shopify: string;
  date_commande?: string;
  date_impression_bon?: string;
  priorite?: PrioriteCommande;
  expedition: AdressePostale;
  facturation?: AdressePostale;
  articles: DraftArticle[];
  notes?: string;
}

const VALID_PLACEMENTS: Placement[] = ["buste", "poignet", "dos", "nuque"];

function buildSystemPrompt(motifsKnown: string[]): string {
  return [
    "Tu es un assistant qui transforme un bon de préparation Shopify Ypersoa (vêtements brodés à la commande) en JSON structuré.",
    "",
    "Schéma de sortie EXACT (renvoie UNIQUEMENT un JSON valide qui respecte cette forme) :",
    "{",
    '  "numero_shopify": "#1002",                           // avec le # le cas échéant',
    '  "date_commande": "YYYY-MM-DD",                       // date de commande, format ISO',
    '  "date_impression_bon": "YYYY-MM-DD",                 // date d\'impression du bon si présente, sinon omettre',
    '  "priorite": "normale" | "urgente",                   // "urgente" uniquement si le PDF le précise',
    '  "expedition": {                                       // ADRESSE DE LIVRAISON',
    '    "nom": "Prénom NOM",',
    '    "adresse_ligne1": "12 rue de Paris",',
    '    "adresse_ligne2": "Apt 3B",                        // omettre si absent',
    '    "code_postal": "59000",',
    '    "ville": "Lille",',
    '    "pays": "France"',
    "  },",
    '  "facturation": { … même structure },                 // omettre si identique à expedition',
    '  "articles": [',
    "    {",
    '      "sku": "YP005-CAL-BEIGE-XS",                     // format YPxxx-MMM-COULEUR-TAILLE',
    '      "couleur_support": "Beige",                      // couleur du textile telle qu\'affichée sur le bon',
    '      "taille": "XS",',
    '      "quantite": 1,',
    '      "broderies": [',
    "        {",
    '          "placement": "buste" | "poignet" | "dos" | "nuque",   // emplacement de la broderie',
    '          "fil_nom": "rose pâle",                       // couleur du fil saisie côté client, en français',
    '          "champs": [',
    '            { "label": "Texte buste", "valeur": "Maman" }',
    "          ],",
    '          "note_atelier": "remarque éventuelle"        // omettre si rien',
    "        }",
    "      ],",
    '      "notes": "remarque article"                      // omettre si rien',
    "    }",
    "  ],",
    '  "notes": "remarque générale"                          // omettre si rien',
    "}",
    "",
    "Règles importantes :",
    "- Le format SKU est OBLIGATOIREMENT YPxxx-MMM-COULEUR-TAILLE. Si tu vois un libellé produit type \"Sweat brodé Le Câlin Beige XS\", reconstruis le SKU à partir des codes connus.",
    `- Codes motifs valides (MMM dans le SKU) : ${motifsKnown.join(", ")}.`,
    "- Si un texte brodé est demandé, label = \"Texte buste\" (ou poignet/dos/nuque selon placement) et valeur = le texte saisi (respecte la casse).",
    "- Si plusieurs broderies sur le même article (ex. texte buste + initiale poignet), crée plusieurs entrées dans `broderies`.",
    "- Couleur du fil : extrais le nom libre français exact (ex. \"rose pâle\", \"vert sauge\", \"bordeaux\"). Si non précisé, omets `fil_nom`.",
    "- Placement par défaut si non précisé : \"buste\".",
    "- Adresse : sépare bien adresse_ligne1 (rue + n°) et adresse_ligne2 (complément type Apt/Bât). Pays par défaut = \"France\".",
    "- Si une info est absente du PDF, OMETS le champ (ne mets pas null ni \"\" ni \"N/A\").",
    "- Ne devine PAS le SKU si le PDF ne donne aucune référence produit/motif identifiable — préfère lever une erreur en mettant `\"sku\": \"UNKNOWN\"`.",
  ].join("\n");
}

export async function callOpenAIStructurePdf(
  pdfText: string,
  motifsKnown: string[],
): Promise<DraftCommande> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante");

  const body = {
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt(motifsKnown) },
      {
        role: "user",
        content: [
          "Voici le texte brut extrait du bon de préparation Shopify. Transforme-le en JSON selon le schéma fourni.",
          "",
          "=== TEXTE BON DE PRÉPARATION ===",
          pdfText,
          "=== FIN TEXTE ===",
        ].join("\n"),
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI parsing échoué (${res.status}) : ${err.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: DraftCommande;
  try {
    parsed = JSON.parse(content) as DraftCommande;
  } catch {
    throw new Error("Réponse OpenAI non parseable en JSON");
  }
  return parsed;
}

// ──────────────────────────────────────────────────────────
// Étape 3 — Hydratation via référentiels Hub
// ──────────────────────────────────────────────────────────

interface FilCanonique {
  id: string;
  nom: string;
  hex: string;
  code_gunold?: string;
}

interface PaletteFils {
  couleurs: Array<{
    id: string;
    nom: string;
    hex: string;
    code_gunold?: string;
  }>;
}

function loadFilsById(): Map<string, FilCanonique> {
  const map = new Map<string, FilCanonique>();
  if (!existsSync(PALETTE_FILS_PATH)) return map;
  const raw = JSON.parse(readFileSync(PALETTE_FILS_PATH, "utf-8")) as PaletteFils;
  for (const c of raw.couleurs ?? []) {
    map.set(c.id, {
      id: c.id,
      nom: c.nom,
      hex: c.hex,
      code_gunold: c.code_gunold,
    });
  }
  return map;
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveFil(
  filNomLibre: string | undefined,
  skuMapping: ReturnType<typeof getSkuMapping>,
  filsById: Map<string, FilCanonique>,
): FilCanonique | null {
  if (!filNomLibre) return null;
  const key = normalizeKey(filNomLibre);
  // Le mapping accepte des entrées avec/sans accents — on cherche en clé normalisée
  for (const [libre, id] of Object.entries(skuMapping.fils_couleur_libre_to_id)) {
    if (libre.startsWith("_")) continue;
    if (normalizeKey(libre) === key) {
      return filsById.get(id) ?? null;
    }
  }
  return null;
}

function shortRandom(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Convertit un DraftCommande (sortie OpenAI) en Commande complète, prête à être
 * écrite via writeCommande. Toutes les durées sont recalculées via les
 * référentiels. Les valeurs manquantes (fil non reconnu, motif inconnu) sont
 * conservées telles quelles avec un placeholder lisible pour que l'admin
 * puisse corriger côté UI avant validation.
 */
export function hydrateDraftToCommande(draft: DraftCommande): Commande {
  const skuMapping = getSkuMapping();
  const durees = getDureesRef();
  const fts = getFichesTechniques();
  const filsById = loadFilsById();

  const cadrageMin = durees.operations.cadrage_zone?.duree_min ?? 3;
  const setupInitialDefault = durees.operations.setup_produit_initial?.duree_min ?? 5;
  const cqMin = durees.operations.controle_qualite_final?.duree_min ?? 3;

  const numeroNet = (draft.numero_shopify ?? "").replace(/^#/, "").trim() || `tmp-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  const articles: Article[] = (draft.articles ?? []).map((a, idx) => {
    // 1) Découpe du SKU YPxxx-MMM-COULEUR-TAILLE
    const parts = (a.sku ?? "").split("-");
    const produitId = parts[0] ?? "";
    const motifCode = parts[1] ?? "";
    const couleurFromSku = parts[2] ?? "";
    const tailleFromSku = parts.slice(3).join("-") ?? "";

    const produit = skuMapping.produits[produitId];
    const motif = skuMapping.motifs_sku_to_ypm[motifCode];

    const broderies: Broderie[] = (a.broderies ?? []).map((b) => {
      const placement: Placement = VALID_PLACEMENTS.includes(b.placement as Placement)
        ? (b.placement as Placement)
        : "buste";

      const fil = resolveFil(b.fil_nom, skuMapping, filsById);

      const champs: ChampBroderie[] = (b.champs ?? []).map((c) => ({
        label: c.label || `Texte ${placement}`,
        valeur: c.valeur ?? "",
        type: "mot_court", // sera reclassifié par recalculerDureesCommande
        duree_min: 0,
        fil_id: fil?.id,
      }));

      return {
        placement,
        champs,
        fil_id: fil?.id ?? "",
        fil_nom: fil?.nom ?? b.fil_nom ?? "",
        fil_hex: fil?.hex ?? "#000000",
        fil_code_gunold: fil?.code_gunold ?? "",
        duree_broderie_min: 0,
        duree_cadrage_min: cadrageMin,
        duree_changement_fil_min: 0,
        duree_total_min: 0,
        note_atelier: b.note_atelier,
      };
    });

    return {
      id: `${numeroNet}-A${String(idx + 1).padStart(2, "0")}-${shortRandom()}`,
      sku: a.sku || "",
      produit_id: produitId,
      produit_nom: produit?.nom_commercial ?? produitId ?? "(produit inconnu)",
      motif_sku: motifCode,
      ypm_id: motif?.ypm_id ?? "",
      ypm_nom: motif?.nom_commercial ?? motifCode ?? "(motif inconnu)",
      couleur_support: a.couleur_support || couleurFromSku || "",
      taille: a.taille || tailleFromSku || "",
      quantite: a.quantite && a.quantite > 0 ? a.quantite : 1,
      broderies,
      duree_preparation_dst_min: 5, // sera recalculé (mutualisé par YPM)
      duree_setup_min: produit?.duree_setup_machine_min ?? setupInitialDefault,
      duree_cq_min: cqMin,
      duree_total_article_min: 0,
      notes: a.notes,
    };
  });

  const expedition: AdressePostale = draft.expedition ?? {
    nom: "",
    adresse_ligne1: "",
    code_postal: "",
    ville: "",
    pays: "France",
  };

  const commande: Commande = {
    id: numeroNet,
    numero_shopify: draft.numero_shopify || `#${numeroNet}`,
    date_commande: draft.date_commande || today,
    date_impression_bon: draft.date_impression_bon,
    statut: "a_planifier",
    priorite: draft.priorite ?? "normale",
    expedition,
    facturation: draft.facturation ?? expedition,
    articles,
    planning: null,
    duree_total_min: 0,
    nb_changements_fil_total: 0,
    notes: draft.notes,
    created_at: today,
    updated_at: today,
  };

  return recalculerDureesCommande(commande, durees, fts);
}

// ──────────────────────────────────────────────────────────
// Étape 4 — Orchestration complète
// ──────────────────────────────────────────────────────────

export interface ParsedPdfWarning {
  level: "warning" | "info";
  message: string;
}

export interface ParsedPdfResult {
  commande: Commande;
  warnings: ParsedPdfWarning[];
  pdf_text_preview: string;
}

/** Pipeline complet : Buffer PDF → Commande hydratée + warnings de qualité. */
export async function parsePdfToCommande(buffer: Buffer): Promise<ParsedPdfResult> {
  const text = await extractPdfText(buffer);
  if (!text || text.length < 30) {
    throw new Error("PDF illisible ou vide (pdf-parse n'a rien extrait).");
  }

  const skuMapping = getSkuMapping();
  const motifsKnown = Object.keys(skuMapping.motifs_sku_to_ypm);

  const draft = await callOpenAIStructurePdf(text, motifsKnown);
  const commande = hydrateDraftToCommande(draft);

  const warnings: ParsedPdfWarning[] = [];
  if (!commande.articles.length) {
    warnings.push({ level: "warning", message: "Aucun article extrait du PDF." });
  }
  for (const a of commande.articles) {
    if (!a.produit_id || !skuMapping.produits[a.produit_id]) {
      warnings.push({
        level: "warning",
        message: `Produit non reconnu pour l'article ${a.sku || "(sans SKU)"} — à corriger.`,
      });
    }
    if (!a.ypm_id) {
      warnings.push({
        level: "warning",
        message: `Motif non reconnu pour l'article ${a.sku || "(sans SKU)"} — à corriger.`,
      });
    }
    for (const b of a.broderies) {
      if (!b.fil_id) {
        warnings.push({
          level: "warning",
          message: `Couleur de fil non reconnue (${b.fil_nom || "vide"}) pour l'article ${a.sku || "(sans SKU)"}.`,
        });
      }
    }
  }

  return {
    commande,
    warnings,
    pdf_text_preview: text.slice(0, 1200),
  };
}
