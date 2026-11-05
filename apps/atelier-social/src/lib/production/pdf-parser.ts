/**
 * Parsing d'un bon de commande Shopify OU Etsy (PDF) → draft Commande.
 *
 * Pipeline :
 *  1. pdf-parse pour extraire le texte brut du PDF (côté Node, server-only)
 *  2. Gemini (gemini-2.5-flash, JSON mode) en solution de base pour transformer
 *     le texte non structuré en payload typé : numéro, dates, expé/facturation,
 *     articles avec SKU, broderies (placement + champs + couleur de fil libre) —
 *     repli sur OpenAI gpt-4o si Gemini échoue ou si la clé est absente (même
 *     schéma de sortie, même prompt). Choix du 27/08/2026 : Gemini passe en
 *     premier car déjà utilisé partout ailleurs dans le Hub, OpenAI reste un
 *     filet de sécurité.
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
import { GoogleGenAI } from "@google/genai";

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
  type ContactClient,
  type Livraison,
  type ModeLivraison,
} from "./commandes-loader";
import {
  buildRefArticle,
  couleursPourProduit,
  getCouleursAjouts,
  isHeadwear,
  normalizeYpmId,
  placementParDefaut,
  produitCatalogue,
  produitParDefautEtsy,
  resolveCouleurProduit,
  resolveTaille,
  type CouleurAjoutRow,
} from "./catalogue";
import { getMotifs } from "@/lib/atelier-da/referentiels-loader";
import { splitTypos } from "./broderie-utils";

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
// Étape 2 — Structuration via Gemini (base) puis OpenAI gpt-4o (repli)
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
  source?: "shopify" | "etsy";
  date_commande?: string;
  date_impression_bon?: string;
  priorite?: PrioriteCommande;
  expedition: AdressePostale;
  facturation?: AdressePostale;
  contact?: ContactClient;
  livraison?: { transporteur?: string; mode?: string; point_relais?: string; numero_suivi?: string };
  articles: DraftArticle[];
  montant_total_ttc?: number;
  notes?: string;
}

const VALID_PLACEMENTS: Placement[] = ["buste", "poignet", "dos", "nuque", "tete"];

function buildSystemPrompt(motifsKnown: string[], produitsKnown: string[]): string {
  return [
    "Tu es un assistant qui transforme un bon de commande Ypersoa (vêtements brodés à la commande) en JSON structuré.",
    "Le PDF peut venir de DEUX sources différentes, à reconnaître automatiquement :",
    "  (A) Shopify — bon de préparation interne, souvent avec un SKU explicite ou un libellé produit structuré.",
    "  (B) Etsy — confirmation de commande / reçu client. Le numéro de commande y apparaît en général comme",
    "      \"Order #XXXXXXXX\" ou un simple numéro (reprends-le tel quel dans `numero_shopify`, avec ou sans #).",
    "      Le texte à broder et les choix du client (couleur de fil, initiale, prénom, dédicace…) se trouvent",
    "      dans un champ de personnalisation (\"Personalization\", \"Note from buyer\", \"From [acheteur]:\" ou",
    "      équivalent) — c'est CE contenu qui remplit `champs[].valeur`, jamais le titre générique de l'annonce.",
    "      Les variantes (taille, couleur du support) apparaissent en clair après \"Variation:\" ou similaire.",
    "",
    "Schéma de sortie EXACT (renvoie UNIQUEMENT un JSON valide qui respecte cette forme) :",
    "{",
    '  "numero_shopify": "#1002",                           // avec le # le cas échéant',
    '  "source": "shopify" | "etsy",                        // selon le format reconnu en (A)/(B) ci-dessus',
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
    '  "contact": { "email": "client@mail.fr", "telephone": "06 12 34 56 78" },   // coordonnées acheteur si présentes, omettre sinon',
    '  "livraison": {                                         // mode d\'expédition choisi par le client, omettre si absent',
    '    "transporteur": "Mondial Relay",                     // Mondial Relay, Colissimo, Chronopost, La Poste, UPS…',
    '    "mode": "locker" | "point_relais" | "domicile" | "retrait_atelier",',
    '    "point_relais": "Locker Auchan Leers 12345",         // nom/ID du locker ou point relais si indiqué',
    '    "numero_suivi": "…"                                  // omettre si absent',
    '  },',
    '  "articles": [',
    "    {",
    '      "sku": "YP005-CAL-BEIGE-XS",                     // format YPxxx-MMM-COULEUR-TAILLE',
    '      "couleur_support": "Beige",                      // couleur du textile telle qu\'affichée sur le bon',
    '      "taille": "XS",',
    '      "quantite": 1,',
    '      "broderies": [',
    "        {",
    '          "placement": "buste" | "poignet" | "dos" | "nuque" | "tete",   // emplacement ("tete" pour casquette/bonnet)',
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
    '  "montant_total_ttc": 42.90,                           // total payé par le client SI explicitement écrit sur le document — OMETTRE si absent',
    '  "notes": "remarque générale"                          // omettre si rien',
    "}",
    "",
    "Règles importantes :",
    "- Indique toujours \"source\": \"shopify\" ou \"etsy\" selon le format reconnu en (A)/(B) ci-dessus.",
    "- N'extrait \"montant_total_ttc\" que s'il est explicitement écrit sur le document (total commande, order total, amount paid…). Ne calcule JAMAIS ce total à partir des lignes d'articles — si le document ne donne pas de total explicite, OMETS ce champ plutôt que d'estimer (les bons de préparation Shopify n'ont généralement pas de prix, les confirmations Etsy en ont souvent).",
    "- Le format SKU est OBLIGATOIREMENT YPxxx-MMM-COULEUR-TAILLE. Que le bon donne un SKU Shopify explicite,",
    "  un libellé produit structuré (\"Sweat brodé Le Câlin Beige XS\"), ou un titre d'annonce Etsy en langage",
    "  naturel (\"Personalized Embroidered Sweatshirt - Le Câlin\" + variation \"Beige / XS\"), reconstruis le SKU",
    "  à partir des indices produit + motif + couleur + taille disponibles, dans les deux cas.",
    `- Codes motifs valides (MMM dans le SKU) : ${motifsKnown.join(", ")}.`,
    `- Codes produits valides (YPxxx dans le SKU, avec leur nom commercial pour t'aider à identifier le bon code depuis un libellé produit) : ${produitsKnown.join(" ; ")}.`,
    "- IMPORTANT — le produit et le motif se résolvent INDÉPENDAMMENT l'un de l'autre. D'ABORD cherche si le nom du motif est explicitement écrit sur le bon (dans le titre produit, ex. \"T-Shirt L'Annonce\" → motif ANN) ou clairement suggéré (ex. \"Le Club\", \"Le Câlin\") : si OUI, utilise TOUJOURS ce code motif précis, jamais LIB. Le code LIB est réservé au cas SPÉCIFIQUE où AUCUN nom de motif n'apparaît nulle part sur le bon — uniquement de la personnalisation libre (casquette « à personnaliser », « Le Message », initiale seule, texte au choix du client). Beaucoup d'articles n'ont PAS de motif décoratif nommé : c'est normal, ce n'est PAS une raison de mettre `\"sku\": \"UNKNOWN\"` — utilise LIB et garde le vrai code produit identifié. Ne mets `\"sku\": \"UNKNOWN\"` QUE si le PRODUIT lui-même (pas le motif) ne correspond à AUCUN nom commercial listé ci-dessus.",
    "- Si le nom du produit sur le bon ne correspond exactement à AUCUN nom commercial listé ci-dessus (ex. nouveau produit jamais catalogué), NE DEVINE PAS un code YPxxx au hasard : mets `\"sku\": \"UNKNOWN\"` et reporte le libellé produit exact tel quel dans `notes` de l'article.",
    "- Même règle pour le motif SEUL quand un vrai dessin décoratif est mentionné mais ne correspond à AUCUN code motif listé (hors cas « texte libre » ci-dessus, qui utilise LIB) : ne force pas un code existant qui ne correspond pas — utilise le code produit correctement identifié avec motif LIB, et indique le nom exact du motif dans `notes`.",
    "- Si un texte brodé est demandé, label = \"Texte buste\" (ou poignet/dos/nuque selon placement) et valeur = le texte saisi (respecte la casse).",
    "- Si plusieurs broderies sur le même article (ex. texte buste + initiale poignet), crée plusieurs entrées dans `broderies`.",
    "- Couleur du fil : extrais le nom libre français exact (ex. \"rose pâle\", \"vert sauge\", \"bordeaux\"). Si non précisé, omets `fil_nom`.",
    "- Placement par défaut si non précisé : \"buste\" pour un vêtement, \"tete\" pour une casquette ou un bonnet (on ne parle JAMAIS de buste sur une coiffe).",
    "- SKU réel au format Akanea YPxxx-CCCC-TTTT ou YPxxx-CCCC-TTTT-YPMxxx (ex. \"YP019-0049-0005-YPM005\", \"YP013-0064-0000\") : recopie-le TEL QUEL dans `sku`, sans le reformater.",
    "- Etsy — si le titre d'annonce ne permet pas d'identifier un produit précis, applique ces défauts : sweat à capuche / hoodie → YP001 ; sweat (sans capuche) → YP005 ; t-shirt → YP019 ; bonnet → YP009 ; casquette → YP013. Reporte toujours le titre d'annonce exact dans `notes` de l'article.",
    "- Couleur du SKU : si le bon donne un nom de couleur en clair (ex. \"Off-White\", \"Vintage sable\"), utilise-le tel quel comme segment COULEUR. Si le SKU réel du bon contient un code numérique à la place (ex. \"YP019-0049-...\"), garde ce code numérique tel quel comme segment COULEUR (ex. \"0049\") plutôt que d'inventer un nom — l'hydratation locale le décodera via le nuancier interne.",
    "- Livraison : lis la méthode d'expédition (\"Shipping method\", \"Mode de livraison\", \"Expédition\"). « Locker » / « Lockers » → mode \"locker\" ; « Point Relais » / « Relais » → \"point_relais\" ; « Domicile » / « Colissimo à domicile » / « Standard » → \"domicile\" ; « Retrait » → \"retrait_atelier\".",
    "- Contact : reprends l'e-mail et le téléphone de l'acheteur s'ils sont écrits sur le document, tels quels.",
    "- Adresse : sépare bien adresse_ligne1 (rue + n°) et adresse_ligne2 (complément type Apt/Bât). Pays par défaut = \"France\".",
    "- Si une info est absente du PDF, OMETS le champ (ne mets pas null ni \"\" ni \"N/A\").",
    "- Ne devine PAS le SKU si le PDF ne donne aucune référence produit/motif identifiable — préfère lever une erreur en mettant `\"sku\": \"UNKNOWN\"`.",
  ].join("\n");
}

export async function callOpenAIStructurePdf(
  pdfText: string,
  motifsKnown: string[],
  produitsKnown: string[],
): Promise<DraftCommande> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante");

  const body = {
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt(motifsKnown, produitsKnown) },
      {
        role: "user",
        content: [
          "Voici le texte brut extrait du bon de commande (Shopify ou Etsy). Transforme-le en JSON selon le schéma fourni.",
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

/** Solution de base (27/08/2026) : mêmes schéma et prompt que callOpenAIStructurePdf. */
export async function callGeminiStructurePdf(
  pdfText: string,
  motifsKnown: string[],
  produitsKnown: string[],
): Promise<DraftCommande> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          text: [
            "Voici le texte brut extrait du bon de commande (Shopify ou Etsy). Transforme-le en JSON selon le schéma fourni.",
            "",
            "=== TEXTE BON DE PRÉPARATION ===",
            pdfText,
            "=== FIN TEXTE ===",
          ].join("\n"),
        },
      ],
    },
    config: {
      systemInstruction: buildSystemPrompt(motifsKnown, produitsKnown),
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  try {
    return JSON.parse(raw) as DraftCommande;
  } catch {
    throw new Error("Réponse Gemini non parseable en JSON");
  }
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
export interface HydrateContext {
  /** Couleurs ajoutées depuis le Hub (table catalogue_couleurs_ajouts). */
  ajouts?: CouleurAjoutRow[];
  /** Index motifs YPM-XXX → nom (motifs_ypm en base). */
  motifsNom?: Map<string, string>;
  /** Index motifs YPM-XXX → typographie de la bible motif (police par défaut). */
  motifsTypo?: Map<string, string>;
}

/**
 * Découpe un SKU. Deux formats coexistent :
 *  - réel Akanea/Shopify : YP019-0049-0005-YPM005 (produit-couleur-taille-motif)
 *  - historique Hub      : YP005-CAL-BEIGE-XS     (produit-motif-couleur-taille)
 */
function splitSku(sku: string): { produit: string; motifCode: string; ypmFromSku: string | null; couleur: string; taille: string } {
  const parts = sku.split("-");
  const produit = parts[0] ?? "";
  if (/^\d{3,4}$/.test(parts[1] ?? "")) {
    return {
      produit,
      motifCode: "",
      ypmFromSku: normalizeYpmId((parts[3] ?? "").replace(/^YPM/i, "")) ,
      couleur: (parts[1] ?? "").padStart(4, "0"),
      taille: /^\d{1,4}$/.test(parts[2] ?? "") ? (parts[2] ?? "").padStart(4, "0") : (parts[2] ?? ""),
    };
  }
  return { produit, motifCode: parts[1] ?? "", ypmFromSku: null, couleur: parts[2] ?? "", taille: parts.slice(3).join("-") };
}

const MODES_LIVRAISON: ModeLivraison[] = ["locker", "point_relais", "domicile", "retrait_atelier"];

function normalizeLivraison(l: DraftCommande["livraison"]): Livraison | undefined {
  if (!l) return undefined;
  const mode = MODES_LIVRAISON.includes(l.mode as ModeLivraison) ? (l.mode as ModeLivraison) : undefined;
  const out: Livraison = { transporteur: l.transporteur || undefined, mode, point_relais: l.point_relais || undefined, numero_suivi: l.numero_suivi || undefined };
  return Object.values(out).some(Boolean) ? out : undefined;
}

export function hydrateDraftToCommande(draft: DraftCommande, ctx: HydrateContext = {}): Commande {
  const skuMapping = getSkuMapping();
  const ajouts = ctx.ajouts ?? [];
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
    // "UNKNOWN" est un sentinelle du LLM (ni produit ni motif identifiables) : on ne le
    // découpe pas comme un vrai SKU, sinon "UNKNOWN" fuit tel quel comme produit_id/nom.
    const skuValue = (a.sku ?? "").trim();
    const isUnknownSku = skuValue === "" || skuValue.toUpperCase() === "UNKNOWN";
    const split = isUnknownSku
      ? { produit: "", motifCode: "", ypmFromSku: null, couleur: "", taille: "" }
      : splitSku(skuValue);
    // Défauts Etsy : produit non identifié → déduit du libellé d'annonce (notes article).
    let produitId = split.produit;
    if ((!produitId || !/^YP\d{3}$/.test(produitId)) && draft.source === "etsy") {
      produitId = produitParDefautEtsy(`${a.notes ?? ""} ${skuValue}`) ?? produitId;
    }
    const motifCode = split.motifCode;
    const couleurFromSku = split.couleur;
    const tailleFromSku = split.taille;

    const produit = skuMapping.produits[produitId];
    const motifMapped = skuMapping.motifs_sku_to_ypm[motifCode];
    const ypmId = motifMapped?.ypm_id ?? split.ypmFromSku ?? "";
    const ypmNom = motifMapped?.nom_commercial ?? (ypmId ? ctx.motifsNom?.get(ypmId) : undefined);
    const couleursProduit = produitId ? couleursPourProduit(produitId, ajouts) : [];
    const couleurAkanea =
      resolveCouleurProduit(couleursProduit, couleurFromSku) ??
      resolveCouleurProduit(couleursProduit, a.couleur_support);
    const tailleAkanea = resolveTaille(a.taille) ?? resolveTaille(tailleFromSku);
    const produitCat = produitId ? produitCatalogue(produitId) : null;
    // Le vrai SKU Shopify encode parfois la couleur du support en code numérique interne
    // (ex. YP019-0049-... = 0049 = Off-White) plutôt qu'en nom en clair — on décode via le
    // nuancier si le segment couleur du SKU est purement numérique.
    const couleurCodeInterne = /^\d{1,4}$/.test(couleurFromSku)
      ? skuMapping.couleurs_support_code_interne?.couleurs[couleurFromSku.padStart(4, "0")]
      : undefined;

    const broderies: Broderie[] = (a.broderies ?? []).map((b) => {
      let placement: Placement = VALID_PLACEMENTS.includes(b.placement as Placement)
        ? (b.placement as Placement)
        : placementParDefaut(produitId);
      // Coiffe : on ne parle jamais de buste (casquette = panneau frontal, bonnet = revers).
      if (isHeadwear(produitId) && placement === "buste") placement = "tete";

      const fil = resolveFil(b.fil_nom, skuMapping, filsById);

      const champs: ChampBroderie[] = (b.champs ?? []).map((c) => ({
        // GPT renvoie souvent « Texte buste » même sur une casquette : on suit la zone retenue.
        label: placement === "tete"
          ? (c.label || "Texte tête").replace(/buste/i, "tête")
          : c.label || `Texte ${placement}`,
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
        ...(() => {
          const ps = splitTypos(ypmId ? ctx.motifsTypo?.get(ypmId) : undefined);
          return ps.length ? { police: ps[0], polices: ps } : {};
        })(),
      };
    });

    return {
      id: `${numeroNet}-A${String(idx + 1).padStart(2, "0")}-${shortRandom()}`,
      sku: a.sku || "",
      produit_id: produitId,
      produit_nom: produit?.nom_commercial ?? produitCat?.libelle ?? (produitId || "(produit à identifier)"),
      motif_sku: motifCode,
      ypm_id: ypmId,
      ypm_nom: ypmNom ?? (motifCode || "(motif à identifier)"),
      couleur_support: couleurAkanea?.libelle || a.couleur_support || couleurCodeInterne?.libelle_interne || couleurFromSku || "",
      taille: tailleAkanea?.taille || a.taille || tailleFromSku || "",
      code_couleur: couleurAkanea?.code,
      code_taille: tailleAkanea?.code,
      ref_article: buildRefArticle(produitCat ? produitId : undefined, couleurAkanea?.code, tailleAkanea?.code),
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
    source: draft.source ?? "manuel",
    date_commande: draft.date_commande || today,
    date_impression_bon: draft.date_impression_bon,
    statut: "a_planifier",
    priorite: draft.priorite ?? "normale",
    expedition,
    facturation: draft.facturation ?? expedition,
    contact: draft.contact && (draft.contact.email || draft.contact.telephone) ? draft.contact : undefined,
    livraison: normalizeLivraison(draft.livraison),
    articles,
    planning: null,
    montant_total_ttc: draft.montant_total_ttc ?? null,
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
  /** Moteur qui a structuré le PDF — Gemini en base, OpenAI en repli. */
  parse_engine: "gemini" | "openai";
}

/** Pipeline complet : Buffer PDF → Commande hydratée + warnings de qualité. */
export async function parsePdfToCommande(buffer: Buffer): Promise<ParsedPdfResult> {
  return parseDocumentToCommande(buffer, "application/pdf");
}

/**
 * Lecture directe du fichier par Gemini (multimodal) : image (PNG/JPG/WebP)
 * ou PDF scanné sans couche texte. Même schéma et même prompt que le texte.
 */
export async function callGeminiStructureFile(
  buffer: Buffer,
  mime: string,
  motifsKnown: string[],
  produitsKnown: string[],
): Promise<DraftCommande> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: mime, data: buffer.toString("base64") } },
        { text: "Voici le bon de commande (Shopify, Etsy ou devis). Transforme-le en JSON selon le schéma fourni." },
      ],
    },
    config: {
      systemInstruction: buildSystemPrompt(motifsKnown, produitsKnown),
      responseMimeType: "application/json",
      temperature: 0,
    },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  try {
    return JSON.parse(raw) as DraftCommande;
  } catch {
    throw new Error("Réponse Gemini non parseable en JSON");
  }
}

/**
 * Pipeline générique : PDF texte → texte + Gemini (repli OpenAI) ;
 * image ou PDF scanné → lecture directe Gemini.
 */
export async function parseDocumentToCommande(buffer: Buffer, mime: string): Promise<ParsedPdfResult> {
  const skuMapping = getSkuMapping();
  const motifsKnown = Object.keys(skuMapping.motifs_sku_to_ypm);
  const produitsKnown = Object.entries(skuMapping.produits).map(
    ([id, p]) => `${id} = ${p.nom_commercial}`,
  );

  const text = mime === "application/pdf" ? await extractPdfText(buffer).catch(() => "") : "";

  let draft: DraftCommande;
  let parseEngine: "gemini" | "openai" = "gemini";
  if (!text || text.length < 30) {
    // Image ou PDF sans couche texte (scan) : lecture visuelle.
    draft = await callGeminiStructureFile(buffer, mime, motifsKnown, produitsKnown);
  } else {
    try {
      draft = await callGeminiStructurePdf(text, motifsKnown, produitsKnown);
    } catch (geminiErr) {
      try {
        draft = await callOpenAIStructurePdf(text, motifsKnown, produitsKnown);
        parseEngine = "openai";
      } catch (openaiErr) {
        const g = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        const o = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
        throw new Error(`Parsing échoué sur les deux moteurs — Gemini: ${g} / OpenAI: ${o}`);
      }
    }
  }
  const [ajouts, motifs] = await Promise.all([
    getCouleursAjouts(),
    getMotifs().then((m) => m.motifs).catch(() => []),
  ]);
  const motifsNom = new Map(motifs.map((x) => [x.id, x.nom_commercial] as [string, string]));
  const motifsTypo = new Map(
    motifs.filter((x) => x.bible?.typographie).map((x) => [x.id, x.bible!.typographie!] as [string, string]),
  );
  const commande = hydrateDraftToCommande(draft, { ajouts, motifsNom, motifsTypo });

  const warnings: ParsedPdfWarning[] = [];
  if (!commande.articles.length) {
    warnings.push({ level: "warning", message: "Aucun article extrait du PDF." });
  }
  for (const a of commande.articles) {
    if (a.produit_id && produitCatalogue(a.produit_id) && !a.code_couleur) {
      warnings.push({
        level: "warning",
        message: `Couleur « ${a.couleur_support || "vide"} » inconnue pour ${a.produit_id} — à rattacher à un code couleur avant production.`,
      });
    }
    if (!a.produit_id || (!skuMapping.produits[a.produit_id] && !produitCatalogue(a.produit_id))) {
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
    parse_engine: parseEngine,
  };
}
