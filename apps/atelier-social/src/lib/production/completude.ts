/**
 * Complétude d'une commande — « zéro question pour les opérateurs ».
 * Pur (sans fs) : utilisable côté client ET serveur.
 * Une liste vide = prêt ; sinon les badges « à compléter » (et le bandeau de
 * la packing list).
 */
import type { Article, Commande } from "./commandes-loader";
import { attributionManquante, estBrodee, filsBroderie, policesBroderie, TECHNIQUE_LABEL, techniqueZone } from "./broderie-utils";

const TYPES_SYMBOLE = new Set(["symbole_simple", "symbole_complexe"]);

export function manquesArticle(a: Article): string[] {
  const out: string[] = [];
  if (!a.produit_id || !/^YP\d{3}$/.test(a.produit_id)) out.push("produit");
  if (!a.ypm_id) out.push("motif");
  if (!a.code_couleur) out.push("couleur produit");
  if (!a.code_taille) out.push("taille");
  if (!a.broderies.length) out.push("marquage");
  a.broderies.forEach((b, i) => {
    const z = a.broderies.length > 1 ? ` (zone ${i + 1})` : "";
    if (!estBrodee(b)) {
      // DTF / écusson / sublimation : pas de fil ni de police, juste de quoi produire.
      if (!b.champs.some((c) => c.valeur.trim()) && !b.detail_technique?.trim()) {
        out.push(`détail ${TECHNIQUE_LABEL[techniqueZone(b)]}${z}`);
      }
      return;
    }
    if (!b.champs.some((c) => c.valeur.trim())) out.push(`texte${z}`);
    const fils = filsBroderie(b);
    if (!fils.length || fils.some((f) => !f.fil_code_gunold)) out.push(`fil Gunold${z}`);
    const aDuTexte = b.champs.some((c) => c.valeur.trim() && !TYPES_SYMBOLE.has(c.type));
    if (aDuTexte && !policesBroderie(b).length) out.push(`police${z}`);
    if (attributionManquante(b)) out.push(`couleur par lettre${z}`);
  });
  return out;
}

/** Manques au niveau commande (expédition, contact). */
export function manquesCommande(c: Commande): string[] {
  const out: string[] = [];
  if (!c.livraison?.transporteur && !sansTransporteur(c.livraison)) out.push("transporteur");
  if (!c.livraison?.mode) out.push("mode de livraison");
  if ((c.livraison?.mode === "locker" || c.livraison?.mode === "point_relais") && !c.livraison.point_relais) {
    out.push(c.livraison.mode === "locker" ? "locker" : "point relais");
  }
  if (!c.contact?.email && !c.contact?.telephone) out.push("contact client");
  return out;
}

export function articlesIncomplets(c: Commande): Array<{ article: Article; manques: string[] }> {
  return c.articles.map((article) => ({ article, manques: manquesArticle(article) })).filter((x) => x.manques.length);
}

export const MODE_LIVRAISON_LABEL: Record<string, string> = {
  locker: "Locker",
  point_relais: "Point relais",
  domicile: "Domicile",
  main_propre: "Remise en main propre",
  retrait_atelier: "Retrait atelier",
};

/** Remise en main propre / retrait atelier : pas de transporteur, pas de n° de suivi. */
export function sansTransporteur(liv?: { mode?: string; transporteur?: string } | null): boolean {
  return liv?.mode === "main_propre" || liv?.mode === "retrait_atelier";
}

export const TRANSPORTEURS = ["Mondial Relay", "Colissimo", "Chronopost", "La Poste", "UPS", "DHL", "GLS"];

/** Libellé du canal de vente d'une commande. */
export const SOURCE_LABEL: Record<string, string> = {
  shopify: "Shopify",
  etsy: "Etsy",
  b2b: "B2B",
  manuel: "Manuel",
};

export const TYPE_DOCUMENT_LABEL: Record<string, string> = {
  bon_commande: "Bon de commande",
  devis: "Devis WAP payé (= bon de commande)",
  facture: "Copie facture",
  bat: "BAT",
  fiche_technique: "Fiche technique",
  fichier_emb: "Fichier EMB (Hatch)",
  fichier_graphique: "Fichier graphique (AI, EPS, SVG…)",
  mail_client: "Mail client",
  bon_livraison: "Bon d'expédition / livraison",
  etiquette: "Étiquette d'expédition",
  autre: "Autre",
};

/** `accept` des champs fichier du dossier (miroir client de lib/production/dossier.ts). */
export const ACCEPT_DOCUMENTS =
  "application/pdf,image/png,image/jpeg,image/webp,.emb,.ai,.eps,.svg,.psd,.zip,.eml,.msg";
const EXTENSIONS_NATIVES = [".emb", ".ai", ".eps", ".svg", ".psd", ".zip", ".eml", ".msg"];

/** Pièce acceptée par le dossier (le navigateur donne un MIME vide ou fantaisiste aux .ai / .eml). */
export function fichierAccepte(f: File): boolean {
  const n = f.name.toLowerCase();
  return EXTENSIONS_NATIVES.some((ext) => n.endsWith(ext)) || !f.type || ACCEPT_DOCUMENTS.split(",").includes(f.type);
}

/** Format natif (EMB, AI, EML…) : se télécharge, ne s'ouvre pas dans le navigateur. */
export function estFormatNatif(filename: string): boolean {
  const n = filename.toLowerCase();
  return EXTENSIONS_NATIVES.some((ext) => n.endsWith(ext));
}

/** Devine le type d'une pièce d'après son nom de fichier (modifiable ensuite). */
export function devinerTypeDocument(filename: string): string {
  const n = filename.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.endsWith(".emb")) return "fichier_emb";
  if (/\.(ai|eps|svg|psd|zip)$/.test(n)) return "fichier_graphique";
  if (/\.(eml|msg)$/.test(n) || /(^|[^a-z])(mail|e-?mail|courriel)([^a-z]|$)/.test(n)) return "mail_client";
  if (/fiche.?tech|(^|[^a-z])ft([^a-z]|$)|tech.?sheet|production.?worksheet/.test(n)) return "fiche_technique";
  if (/etiquette|label|mondial|colissimo|chronopost|relay|shipping|expedition/.test(n)) return "etiquette";
  if (/(^|[^a-z])bat([^a-z]|$)|bon.a.tirer|maquette|proof|mockup/.test(n)) return "bat";
  if (/facture|invoice|(^|[^a-z])fa[-_ ]?\d/.test(n)) return "facture";
  if (/devis|quote|estimate|(^|[^a-z])wap[-_ ]?\d/.test(n)) return "devis";
  if (/livraison|delivery|bon.?d.?exp|(^|[^a-z])bl([^a-z]|$)/.test(n)) return "bon_livraison";
  return "bon_commande";
}
