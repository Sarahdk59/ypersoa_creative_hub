/**
 * Facture / bon de livraison fournisseur (PDF ou image) → draft Attendu.
 *
 * Pipeline (même socle que pdf-parser.ts pour les bons Shopify/Etsy) :
 *  1. pdf-parse → texte brut (PDF natif) ; sinon lecture visuelle Gemini (scan, photo)
 *  2. Gemini 2.5 Flash JSON (base), repli OpenAI gpt-4o
 *  3. Rapprochement local de chaque ligne → réf. article YPxxx-CCCC-TTTT
 *     (réf. fabricant + couleur fabricant + taille) via referentiel-articles.ts
 *
 * Ne persiste rien.
 */
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { extractPdfText } from "./pdf-parser";
import {
  chargerReferentiel,
  libelleRefArticle,
  rapprocherLigne,
  type ReferentielEtendu,
} from "./referentiel-articles";
import {
  nouvelIdAttendu,
  nouvelIdLigne,
  plusJoursOuvres,
  type Attendu,
  type LigneAttendu,
} from "./attendus";

interface DraftLigne {
  ref_fournisseur?: string;
  ref_modele?: string;
  designation?: string;
  coloris?: string;
  taille?: string;
  quantite?: number;
  pu_ht?: number | null;
  total_ht?: number | null;
  commande_client?: string;
}

interface DraftFacture {
  fournisseur?: string;
  numero_facture?: string;
  numero_commande_fournisseur?: string;
  date_commande?: string;
  date_facture?: string;
  total_ht?: number | null;
  total_ttc?: number | null;
  devise?: string;
  lignes?: DraftLigne[];
}

function buildPrompt(refsFabricant: string[]): string {
  return [
    "Tu extrais une FACTURE ou un BON DE LIVRAISON de fournisseur textile (Ralawise, Imbretex, L-Shop, B&C, Awdis…) reçu par l'atelier Ypersoa.",
    "Réponds UNIQUEMENT en JSON valide, sans texte autour, selon ce schéma :",
    "{",
    '  "fournisseur": "nom du fournisseur (émetteur du document, ex. RALAWISE)",',
    '  "numero_facture": "n° de facture ou de bon de livraison",',
    '  "numero_commande_fournisseur": "n° de commande chez le fournisseur (ex. W433001)",',
    '  "date_commande": "YYYY-MM-DD ou null",',
    '  "date_facture": "YYYY-MM-DD ou null",',
    '  "total_ht": nombre ou null,',
    '  "total_ttc": nombre ou null,',
    '  "devise": "EUR",',
    '  "lignes": [',
    "    {",
    '      "ref_fournisseur": "code article / variante tel qu\'imprimé (ex. JH001CFPKL)",',
    '      "ref_modele": "réf. modèle fabricant (ex. JH001, BC09T, JH030) — souvent au début du code ou dans la désignation",',
    '      "designation": "désignation complète sur une seule ligne",',
    '      "coloris": "nom de la couleur fabricant en casse titre (ex. Candyfloss Pink, Heather Grey)",',
    '      "taille": "taille telle qu\'imprimée normalisée : XS, S, M, L, XL, XXL, 3XL… (LGE=L, SML=S, MED=M, 2XL=XXL), TU pour taille unique",',
    '      "quantite": entier,',
    '      "pu_ht": nombre (prix unitaire net HT) ou null,',
    '      "total_ht": nombre (valeur nette HT de la ligne) ou null,',
    '      "commande_client": "n° de commande client / référence client de la ligne si présent, sinon null"',
    "    }",
    "  ]",
    "}",
    "",
    "RÈGLES :",
    "- Une ligne JSON par ligne article du document, sur TOUTES les pages. N'invente aucune ligne. Ignore frais de port, éco-participation, remises globales (mais garde-les hors des lignes).",
    "- Les montants utilisent le point décimal (8,99 € → 8.99). Pas de symbole monétaire.",
    "- Dates au format ISO YYYY-MM-DD (15/05/2025 → 2025-05-15). Si seule la date de facture existe, date_commande = null.",
    "- La taille est souvent préfixe de la désignation chez Ralawise (« LGE CANDYFLOSS PINK JH001 COLLEGE HOODIE » → taille L, coloris Candyfloss Pink, ref_modele JH001).",
    `- Réfs fabricant connues du catalogue Ypersoa (pour t'aider à isoler ref_modele) : ${refsFabricant.join(", ")}.`,
  ].join("\n");
}

async function callGeminiTexte(text: string, prompt: string): Promise<DraftFacture> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: `=== DOCUMENT FOURNISSEUR ===\n${text}\n=== FIN ===` }] },
    config: { systemInstruction: prompt, responseMimeType: "application/json", temperature: 0 },
  });
  if (!res.text) throw new Error("Pas de contenu Gemini");
  return JSON.parse(res.text) as DraftFacture;
}

async function callGeminiFichier(buffer: Buffer, mime: string, prompt: string): Promise<DraftFacture> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: mime, data: buffer.toString("base64") } },
        { text: "Voici la facture / le bon de livraison fournisseur. Extrais-le en JSON selon le schéma." },
      ],
    },
    config: { systemInstruction: prompt, responseMimeType: "application/json", temperature: 0 },
  });
  if (!res.text) throw new Error("Pas de contenu Gemini");
  return JSON.parse(res.text) as DraftFacture;
}

async function callOpenAITexte(text: string, prompt: string): Promise<DraftFacture> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `=== DOCUMENT FOURNISSEUR ===\n${text}\n=== FIN ===` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI (${res.status}) : ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as DraftFacture;
}

// ──────────────────────────────────────────────────────────
// Repli sans IA — format Ralawise (crédits Gemini/OpenAI épuisés, panne…)
// ──────────────────────────────────────────────────────────

const frNum = (s: string) => Number(s.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
const frDate = (s?: string) => {
  const m = s?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
};

/**
 * Facture Ralawise : « JH001CFPKL \t LGE CANDYFLOSS PINK JH001 COLLEGE HOODIE \t W433001 \t 1 \t 8,99 € \t 8,99 € ».
 * Taille = 1er mot de la désignation, modèle = mot par lequel commence le code variante,
 * coloris = entre les deux. Renvoie null si le document n'a pas ce format.
 */
export function parseRalawiseDeterministe(text: string): DraftFacture | null {
  if (!/ralawise/i.test(text)) return null;
  const t = text.replace(/\r/g, "");
  const lignes: DraftLigne[] = [];
  const re = /(?:^|\n)([A-Z0-9]{6,16})\s*\t([\s\S]+?)\s*\t?\s*(W\d{5,})\s*\t\s*(\d+)\s*\t\s*([\d.,]+)\s*€\s*([\d.,]+)\s*€/g;
  for (const m of t.matchAll(re)) {
    const [, code, descRaw, , qte, pu, total] = m;
    const desc = descRaw.replace(/\s+/g, " ").trim();
    const mots = desc.split(" ");
    const iModele = mots.findIndex((w, i) => i > 0 && code.startsWith(w.split("/")[0].replace(/[^A-Z0-9]/g, "")) && w.split("/")[0].length >= 4);
    const modele = iModele > 0 ? mots[iModele].split("/")[0] : undefined;
    lignes.push({
      ref_fournisseur: code,
      ref_modele: modele,
      designation: desc,
      taille: mots[0],
      coloris: iModele > 1 ? mots.slice(1, iModele).join(" ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "",
      quantite: Number(qte),
      pu_ht: frNum(pu),
      total_ht: frNum(total),
    });
  }
  if (!lignes.length) return null;
  const facture = t.match(/Numéro de\s*facture\s*\n?\s*([A-Z0-9/\-]+)/i)?.[1];
  const dateFacture = frDate(t.match(/Date de la\s*facture\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1]);
  const commande = t.match(/Ralawise N° de commande\s*\n?\s*(W\d+)/i)?.[1] ?? t.match(/\b(W\d{5,})\b/)?.[1];
  const totalHt = t.match(/Total marchandises:\s*\t?\s*([\d.,]+)\s*€/i)?.[1];
  const totalDu = t.match(/Total dû:\s*\t?\s*([\d.,]+)\s*€/i)?.[1];
  return {
    fournisseur: "RALAWISE",
    numero_facture: facture,
    numero_commande_fournisseur: commande,
    date_facture: dateFacture,
    total_ht: totalHt ? frNum(totalHt) : null,
    total_ttc: totalDu ? frNum(totalDu) : null,
    devise: "EUR",
    lignes,
  };
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const isoOuVide = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

/** (Re)calcule le rattachement d'une ligne — ne touche pas aux lignes déjà rattachées à la main. */
export function rattacherLigne(
  l: Omit<LigneAttendu, "usage" | "etat"> & { usage?: LigneAttendu["usage"]; etat?: LigneAttendu["etat"] },
  r: ReferentielEtendu,
): LigneAttendu {
  const rap = rapprocherLigne(l, r);
  return {
    ...l,
    ref_produit: rap.ref_produit,
    code_couleur: rap.code_couleur,
    code_taille: rap.code_taille,
    ref_article: rap.ref_article,
    libelle_article: rap.ref_article ? libelleRefArticle(rap.ref_article, r) : undefined,
    etat: rap.etat,
    manque: rap.manque,
    produit_rnd: rap.etat === "produit_inconnu" || rap.rnd,
    // Produit inconnu ou R&D de la base (« À compléter ») → destination R&D par défaut.
    usage: l.usage ?? (rap.etat === "produit_inconnu" || rap.rnd ? "rnd" : "stock"),
  };
}

export function draftToAttendu(draft: DraftFacture, r: ReferentielEtendu): Attendu {
  const now = new Date().toISOString();
  const dateBase = isoOuVide(draft.date_commande) ?? isoOuVide(draft.date_facture) ?? now.slice(0, 10);
  const lignes: LigneAttendu[] = (draft.lignes ?? []).map((d) => {
    const base: Parameters<typeof rattacherLigne>[0] = {
      id: nouvelIdLigne(),
      ref_fournisseur: (d.ref_fournisseur ?? "").trim(),
      ref_modele: d.ref_modele?.trim() || undefined,
      designation: (d.designation ?? "").replace(/\s+/g, " ").trim(),
      coloris: (d.coloris ?? "").trim(),
      taille: (d.taille ?? "").trim(),
      quantite: Math.max(0, Math.round(Number(d.quantite) || 0)),
      pu_ht: num(d.pu_ht),
      total_ht: num(d.total_ht),
      commande_client: d.commande_client?.trim() || undefined,
    };
    const rat = rattacherLigne(base, r);
    if (rat.commande_client) rat.usage = "prod";
    return rat;
  });
  const totalHtLignes = lignes.reduce((s, l) => s + (l.total_ht ?? 0), 0);
  return {
    id: nouvelIdAttendu(),
    fournisseur: (draft.fournisseur ?? "").trim().toUpperCase(),
    numero_facture: draft.numero_facture?.trim() || undefined,
    numero_commande_fournisseur: draft.numero_commande_fournisseur?.trim() || undefined,
    date_commande: isoOuVide(draft.date_commande),
    date_facture: isoOuVide(draft.date_facture),
    date_livraison_prevue: plusJoursOuvres(dateBase, 2),
    statut: "attendu",
    total_ht: num(draft.total_ht) ?? (totalHtLignes ? Math.round(totalHtLignes * 100) / 100 : null),
    total_ttc: num(draft.total_ttc),
    devise: draft.devise || "EUR",
    lignes,
    documents: [],
    created_at: now,
    updated_at: now,
  };
}

export interface ParseFactureResult {
  attendu: Attendu;
  warnings: string[];
  engine: "gemini" | "gemini-vision" | "openai" | "sans-ia";
}

export async function parseFacture(buffer: Buffer, mime: string): Promise<ParseFactureResult> {
  const r = await chargerReferentiel();
  const refsFabricant = Array.from(new Set(Array.from(r.produits.values()).map((p) => p.ref_fabricant).filter((x) => x && x !== "—")));
  const prompt = buildPrompt(refsFabricant);

  const text = mime === "application/pdf" ? await extractPdfText(buffer).catch(() => "") : "";
  let draft: DraftFacture;
  let engine: ParseFactureResult["engine"] = "gemini";
  if (!text || text.length < 30) {
    draft = await callGeminiFichier(buffer, mime, prompt);
    engine = "gemini-vision";
  } else {
    try {
      draft = await callGeminiTexte(text, prompt);
    } catch (g) {
      try {
        draft = await callOpenAITexte(text, prompt);
        engine = "openai";
      } catch (o) {
        const secours = parseRalawiseDeterministe(text);
        if (secours) {
          draft = secours;
          engine = "sans-ia";
        } else throw new Error(
          `Lecture échouée sur les deux moteurs — Gemini: ${g instanceof Error ? g.message : g} / OpenAI: ${o instanceof Error ? o.message : o}`,
        );
      }
    }
  }

  const attendu = draftToAttendu(draft, r);
  const warnings: string[] = [];
  if (engine === "sans-ia") warnings.push("IA indisponible (crédits Gemini/OpenAI ?) : facture lue par le lecteur Ralawise sans IA — vérifie les lignes.");
  if (!attendu.lignes.length) warnings.push("Aucune ligne article extraite du document.");
  if (!attendu.numero_facture) warnings.push("N° de facture non trouvé.");
  const sommeLignes = attendu.lignes.reduce((s, l) => s + (l.total_ht ?? 0), 0);
  if (attendu.total_ht && Math.abs(sommeLignes - attendu.total_ht) > 0.05 * attendu.total_ht) {
    warnings.push(
      `La somme des lignes (${sommeLignes.toFixed(2)} €) ne correspond pas au total HT (${attendu.total_ht.toFixed(2)} €) — frais de port ou ligne manquée ?`,
    );
  }
  const aCreer = attendu.lignes.filter((l) => l.etat !== "reference").length;
  if (aCreer) warnings.push(`${aCreer} ligne(s) sans réf. Ypersoa existante — à rattacher ou à créer.`);
  return { attendu, warnings, engine };
}
