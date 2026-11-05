/**
 * Référentiel articles étendu (serveur) — socle `catalogue_produits.json`
 * (classeur Akanea) + tout ce que l'atelier a créé depuis le Hub :
 *   - produits R&D       → table catalogue_produits_ajouts
 *   - couleurs produit   → table catalogue_couleurs_ajouts (existante)
 *   - tailles produit    → table catalogue_tailles_ajouts
 *   - réf. articles      → table catalogue_skus_ajouts
 *
 * Sert les attendus de livraison (rapprochement ligne de facture → YPxxx-CCCC-TTTT),
 * la création de référence et l'export de la base produit.
 */
import "server-only";
import { supabase } from "@/lib/supabase";
import {
  couleursPourProduit,
  getCatalogue,
  getCouleursAjouts,
  normalizeKey,
  resolveCouleurProduit,
  createCouleurAjout,
  verifierCouleur,
  taillesPourProduit,
  type CatalogueProduit,
  type CatalogueTaille,
  type CouleurAjoutRow,
  type CouleurProduit,
} from "./catalogue";

const TBL_PRODUITS = "catalogue_produits_ajouts";
const TBL_TAILLES = "catalogue_tailles_ajouts";
const TBL_SKUS = "catalogue_skus_ajouts";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface ProduitAjoutRow {
  ref: string;
  ref_fabricant: string;
  libelle: string;
  famille: string;
  sous_famille: string;
  genre: string;
  statut: string;
  fournisseur: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TailleAjoutRow {
  ref_produit: string;
  code_taille: string;
  created_by: string | null;
  created_at: string;
}

export interface SkuAjoutRow {
  ref_article: string;
  ref_produit: string;
  code_couleur: string;
  code_taille: string;
  origine: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProduitEtendu extends CatalogueProduit {
  origine: "catalogue" | "hub";
}

export interface ReferentielEtendu {
  produits: Map<string, ProduitEtendu>;
  couleursAjouts: CouleurAjoutRow[];
  taillesAjouts: TailleAjoutRow[];
  skusAjouts: SkuAjoutRow[];
}

// ──────────────────────────────────────────────────────────
// Lecture
// ──────────────────────────────────────────────────────────

async function lireTable<T>(table: string): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.warn(`[referentiel-articles] lecture ${table} impossible : ${error.message}`);
    return [];
  }
  return (data ?? []) as T[];
}

export async function chargerReferentiel(): Promise<ReferentielEtendu> {
  const cat = getCatalogue();
  const [produitsAjouts, couleursAjouts, taillesAjouts, skusAjouts] = await Promise.all([
    lireTable<ProduitAjoutRow>(TBL_PRODUITS),
    getCouleursAjouts(),
    lireTable<TailleAjoutRow>(TBL_TAILLES),
    lireTable<SkuAjoutRow>(TBL_SKUS),
  ]);
  const produits = new Map<string, ProduitEtendu>();
  for (const p of Object.values(cat.produits)) produits.set(p.ref, { ...p, origine: "catalogue" });
  for (const p of produitsAjouts) {
    if (produits.has(p.ref)) continue;
    produits.set(p.ref, {
      ref: p.ref,
      ref_fabricant: p.ref_fabricant,
      libelle: p.libelle,
      famille: p.famille,
      sous_famille: p.sous_famille,
      genre: p.genre,
      gabarit: "",
      technos: [],
      statut: p.statut,
      synonymes: [],
      origine: "hub",
    });
  }
  return { produits, couleursAjouts, taillesAjouts, skusAjouts };
}

export function couleursProduitEtendu(ref: string, r: ReferentielEtendu): CouleurProduit[] {
  return couleursPourProduit(ref, r.couleursAjouts);
}

/** Tailles d'un produit : catalogue + ajouts Hub. Produit Hub sans taille → liste vide (à compléter). */
export function taillesProduitEtendu(ref: string, r: ReferentielEtendu): CatalogueTaille[] {
  const cat = getCatalogue();
  const base = r.produits.get(ref)?.origine === "catalogue" ? taillesPourProduit(ref) : [];
  const out = new Map(base.map((t) => [t.code, t]));
  for (const a of r.taillesAjouts) {
    if (a.ref_produit !== ref) continue;
    const t = cat.tailles[a.code_taille];
    if (t) out.set(t.code, t);
  }
  return Array.from(out.values()).sort((a, b) => a.ordre - b.ordre);
}

/** Toutes les tailles Akanea (pour ajouter une taille à un produit). */
export function toutesTailles(): CatalogueTaille[] {
  return Object.values(getCatalogue().tailles)
    .filter((t) => t.code !== "9999")
    .sort((a, b) => a.ordre - b.ordre);
}

/** La réf. article existe-t-elle déjà (classeur ou création Hub) ? */
export function refArticleExiste(refArticle: string, r: ReferentielEtendu): boolean {
  const m = refArticle.match(/^(YP\d{3})-(\d{4})-(\d{4})$/);
  if (!m) return false;
  const [, ref, cc, tt] = m;
  if ((getCatalogue().skus[ref] ?? []).includes(`${cc}-${tt}`)) return true;
  return r.skusAjouts.some((s) => s.ref_article === refArticle);
}

/** Prochaine réf. produit libre (YP133…). */
export function prochaineRefProduit(r: ReferentielEtendu): string {
  const max = Math.max(0, ...Array.from(r.produits.keys()).map((k) => Number(k.slice(2)) || 0));
  return `YP${String(max + 1).padStart(3, "0")}`;
}

// ──────────────────────────────────────────────────────────
// Rapprochement ligne fournisseur → réf. Ypersoa
// ──────────────────────────────────────────────────────────

/** Tailles fournisseurs (Ralawise LGE/SML/MED, 2XL…) → taille Akanea. */
const ALIAS_TAILLES: Record<string, string> = {
  xsm: "XS", xsml: "XS", "x small": "XS", "extra small": "XS",
  sml: "S", small: "S", sm: "S",
  med: "M", medium: "M", md: "M",
  lge: "L", large: "L", lg: "L",
  xlg: "XL", "x large": "XL", "extra large": "XL",
  "2xl": "XXL", xxl: "XXL", "2xlg": "XXL", "xx large": "XXL",
  "3xl": "3XL", xxxl: "3XL", "4xl": "4XL", "5xl": "5XL",
  "one size": "TU", os: "TU", tu: "TU", "taille unique": "TU", unique: "TU",
};

export function resoudreTailleFournisseur(input: string | undefined): CatalogueTaille | null {
  if (!input) return null;
  const cat = getCatalogue();
  const k = normalizeKey(input);
  const alias = ALIAS_TAILLES[k] ?? ALIAS_TAILLES[k.replace(/\s+/g, "")];
  const cible = normalizeKey(alias ?? input);
  if (/^\d{4}$/.test(input.trim()) && cat.tailles[input.trim()]) return cat.tailles[input.trim()];
  return Object.values(cat.tailles).find((t) => normalizeKey(t.taille) === cible || normalizeKey(t.libelle) === cible) ?? null;
}

/** Réf. modèle fournisseur (JH001, BC09T, JH001CFPKL…) → produit Ypersoa via la réf. fabricant. */
export function resoudreProduitFournisseur(
  refModele: string | undefined,
  refVariante: string | undefined,
  designation: string | undefined,
  r: ReferentielEtendu,
): ProduitEtendu | null {
  const produits = Array.from(r.produits.values()).filter((p) => p.ref_fabricant && p.ref_fabricant !== "—");
  // JH043J (classeur) = JH43J (Ralawise) : on ignore les zéros de tête du bloc chiffré.
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^([A-Z]+)0+(?=\d)/, "$1");
  const candidats = [refModele, refVariante].filter(Boolean).map((s) => norm(s!));
  // 1. égalité stricte sur la réf. modèle
  for (const c of candidats) {
    const hit = produits.find((p) => norm(p.ref_fabricant) === c);
    if (hit) return hit;
  }
  // 2. la réf. variante commence par la réf. fabricant (JH001CFPKL → JH001) — la plus longue gagne (JH001J > JH001)
  for (const c of candidats) {
    const hits = produits.filter((p) => c.startsWith(norm(p.ref_fabricant))).sort((a, b) => b.ref_fabricant.length - a.ref_fabricant.length);
    if (hits.length) return hits[0];
  }
  // 3. réf. fabricant citée dans la désignation (« … JH001 COLLEGE HOODIE »)
  if (designation) {
    const mots = new Set(designation.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));
    const hit = produits
      .filter((p) => mots.has(norm(p.ref_fabricant)))
      .sort((a, b) => b.ref_fabricant.length - a.ref_fabricant.length)[0];
    if (hit) return hit;
  }
  return null;
}

/** « ARCT WHT » ⊂ « ARCTIC WHITE » : même 1re lettre et lettres dans l'ordre, mot à mot. */
function abrege(mot: string, cible: string): boolean {
  if (!mot || mot[0] !== cible[0]) return false;
  let i = 0;
  for (const ch of cible) if (ch === mot[i]) i++;
  return i === mot.length;
}

/**
 * Coloris fournisseur → couleur du produit : exact (libellé / nom fabricant / code),
 * puis abréviations Ralawise (« VAN.MILKSHAKE », « ARCT WHT », « DK.CHOCOLATE »).
 * Ambiguïté (2 candidats) → null : on laisse l'atelier trancher.
 */
export function resoudreCouleurFournisseur(couleurs: CouleurProduit[], input: string | undefined): CouleurProduit | null {
  const exact = resolveCouleurProduit(couleurs, input);
  if (exact || !input) return exact;
  const mots = normalizeKey(input).split(" ").filter(Boolean);
  if (!mots.length) return null;
  const hits = couleurs.filter((c) =>
    [c.couleur_fabricant, c.libelle].filter(Boolean).some((nom) => {
      const cible = normalizeKey(nom!).split(" ").filter(Boolean);
      return cible.length === mots.length && mots.every((m, i) => abrege(m, cible[i]));
    }),
  );
  return hits.length === 1 ? hits[0] : null;
}

/** Produit R&D : « À compléter » dans la base produit, ou créé depuis le Hub. */
export function estProduitRnd(p: ProduitEtendu | undefined): boolean {
  if (!p) return false;
  return p.origine === "hub" || /compl[ée]ter|r\s*&\s*d/i.test(p.statut);
}

export interface Rapprochement {
  /** Produit R&D (base « À compléter » ou créé depuis le Hub). */
  rnd?: boolean;
  ref_produit?: string;
  code_couleur?: string;
  code_taille?: string;
  ref_article?: string;
  /** reference = réf. existante ; a_creer = produit connu, combinaison/couleur/taille à créer ; produit_inconnu = produit à créer (R&D). */
  etat: "reference" | "a_creer" | "produit_inconnu";
  manque: string[];
}

export function rapprocherLigne(
  l: { ref_fournisseur?: string; ref_modele?: string; designation?: string; coloris?: string; taille?: string },
  r: ReferentielEtendu,
): Rapprochement {
  const produit = resoudreProduitFournisseur(l.ref_modele, l.ref_fournisseur, l.designation, r);
  if (!produit) return { etat: "produit_inconnu", manque: ["produit"] };
  const couleur = resoudreCouleurFournisseur(couleursProduitEtendu(produit.ref, r), l.coloris);
  const taille = resoudreTailleFournisseur(l.taille);
  const tailleDuProduit = taille && taillesProduitEtendu(produit.ref, r).some((t) => t.code === taille.code);
  const manque: string[] = [];
  if (!couleur) manque.push("couleur");
  if (!taille) manque.push("taille");
  else if (!tailleDuProduit) manque.push("taille du produit");
  const refArticle = couleur && taille ? `${produit.ref}-${couleur.code}-${taille.code}` : undefined;
  const existe = refArticle ? refArticleExiste(refArticle, r) : false;
  if (refArticle && !existe && !manque.length) manque.push("réf. article");
  return {
    rnd: estProduitRnd(produit),
    ref_produit: produit.ref,
    code_couleur: couleur?.code,
    code_taille: taille?.code,
    ref_article: refArticle,
    etat: existe ? "reference" : "a_creer",
    manque,
  };
}

// ──────────────────────────────────────────────────────────
// Création de référence
// ──────────────────────────────────────────────────────────

export interface CreationReferenceInput {
  /** Produit existant… */
  ref_produit?: string;
  /** …ou nouveau produit R&D. */
  nouveau_produit?: {
    ref?: string;
    ref_fabricant: string;
    libelle: string;
    famille?: string;
    sous_famille?: string;
    genre?: string;
    fournisseur?: string;
  };
  /** Couleur : code existant (Couleurs_ref / produit)… */
  code_couleur: string;
  /** …avec libellé + hex si la couleur est nouvelle pour ce produit. */
  libelle_couleur?: string;
  hex?: string | null;
  code_taille: string;
  origine?: string;
  created_by?: string;
}

function erreurTable(table: string, msg: string): Error {
  if (/does not exist|schema cache/i.test(msg)) {
    return new Error(`Table ${table} absente : appliquer la migration 20261105_attendus_livraison.sql.`);
  }
  return new Error(msg);
}

/**
 * Crée (si besoin) produit, couleur produit, taille produit et réf. article.
 * Idempotent : ce qui existe déjà est conservé. Renvoie la réf. article.
 */
export async function creerReference(input: CreationReferenceInput): Promise<{ ref_article: string; cree: string[] }> {
  if (!supabase) throw new Error("Supabase non configuré — impossible de créer la référence.");
  const r = await chargerReferentiel();
  const cat = getCatalogue();
  const cree: string[] = [];

  // 1. Produit
  let ref = input.ref_produit?.trim().toUpperCase();
  if (!ref && input.nouveau_produit) {
    const np = input.nouveau_produit;
    if (!np.libelle?.trim()) throw new Error("Libellé du nouveau produit obligatoire.");
    ref = (np.ref?.trim().toUpperCase() || prochaineRefProduit(r));
    if (!/^YP\d{3}$/.test(ref)) throw new Error(`Réf. produit ${ref} invalide (format YPxxx).`);
    if (r.produits.has(ref)) throw new Error(`La réf. ${ref} existe déjà (${r.produits.get(ref)!.libelle}).`);
    const { error } = await supabase.from(TBL_PRODUITS).insert({
      ref,
      ref_fabricant: np.ref_fabricant?.trim() ?? "",
      libelle: np.libelle.trim(),
      famille: np.famille?.trim() ?? "",
      sous_famille: np.sous_famille?.trim() ?? "",
      genre: np.genre?.trim() ?? "",
      statut: "R&D",
      fournisseur: np.fournisseur?.trim() || null,
      created_by: input.created_by ?? null,
    });
    if (error) throw erreurTable(TBL_PRODUITS, `Création produit échouée : ${error.message}`);
    cree.push(`produit ${ref}`);
  }
  if (!ref) throw new Error("Produit manquant (réf. existante ou nouveau produit).");
  if (!cree.length && !r.produits.has(ref)) throw new Error(`Produit ${ref} inconnu.`);

  // 2. Couleur
  const code = input.code_couleur?.trim().padStart(4, "0");
  if (!/^\d{4}$/.test(code)) throw new Error("Code couleur invalide (4 chiffres).");
  const couleursProduit = couleursProduitEtendu(ref, r);
  if (!couleursProduit.some((c) => c.code === code)) {
    // Un code = un libellé : refuse « 0150 = Vintage Marron » si 0150 est déjà Almond.
    const v = verifierCouleur(code, input.libelle_couleur, r.couleursAjouts);
    await createCouleurAjout({
      ref_produit: ref,
      code_couleur: v.code,
      libelle: v.libelle,
      hex: (v.nouvelle_famille && input.hex) || v.hex || input.hex || null,
      nouvelle_famille: v.nouvelle_famille,
      created_by: input.created_by ?? null,
    });
    cree.push(`couleur ${v.code} ${v.libelle}`);
  }

  // 3. Taille
  const tt = input.code_taille?.trim();
  const taille = cat.tailles[tt];
  if (!taille) throw new Error(`Code taille ${tt} inconnu.`);
  if (!taillesProduitEtendu(ref, r).some((t) => t.code === tt)) {
    const { error } = await supabase.from(TBL_TAILLES).insert({ ref_produit: ref, code_taille: tt, created_by: input.created_by ?? null });
    if (error && !/duplicate|unique/i.test(error.message)) throw erreurTable(TBL_TAILLES, `Ajout taille échoué : ${error.message}`);
    cree.push(`taille ${taille.taille}`);
  }

  // 4. Réf. article
  const refArticle = `${ref}-${code}-${tt}`;
  if (!refArticleExiste(refArticle, r)) {
    const { error } = await supabase.from(TBL_SKUS).insert({
      ref_article: refArticle,
      ref_produit: ref,
      code_couleur: code,
      code_taille: tt,
      origine: input.origine ?? null,
      created_by: input.created_by ?? null,
    });
    if (error && !/duplicate|unique/i.test(error.message)) throw erreurTable(TBL_SKUS, `Création réf. article échouée : ${error.message}`);
    cree.push(`réf. ${refArticle}`);
  }
  return { ref_article: refArticle, cree };
}

/** Libellé lisible d'une réf. article : « College Hoodie Blanc XS ». */
export function libelleRefArticle(refArticle: string | undefined, r: ReferentielEtendu): string {
  if (!refArticle) return "";
  const m = refArticle.match(/^(YP\d{3})-(\d{4})-(\d{4})$/);
  if (!m) return refArticle;
  const [, ref, cc, tt] = m;
  const p = r.produits.get(ref);
  const c = couleursProduitEtendu(ref, r).find((x) => x.code === cc)?.libelle ?? getCatalogue().couleurs_ref[cc]?.libelle ?? cc;
  const t = getCatalogue().tailles[tt]?.taille ?? tt;
  return [p?.libelle ?? ref, c, t].join(" ");
}
