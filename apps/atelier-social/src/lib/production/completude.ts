/**
 * Complétude d'une commande — « zéro question pour les opérateurs ».
 * Pur (sans fs) : utilisable côté client ET serveur.
 * Une liste vide = prêt ; sinon les badges « à compléter » (et le bandeau de
 * la packing list).
 */
import type { Article, Commande } from "./commandes-loader";

const TYPES_SYMBOLE = new Set(["symbole_simple", "symbole_complexe"]);

export function manquesArticle(a: Article): string[] {
  const out: string[] = [];
  if (!a.produit_id || !/^YP\d{3}$/.test(a.produit_id)) out.push("produit");
  if (!a.ypm_id) out.push("motif");
  if (!a.code_couleur) out.push("couleur produit");
  if (!a.code_taille) out.push("taille");
  if (!a.broderies.length) out.push("broderie");
  a.broderies.forEach((b, i) => {
    const z = a.broderies.length > 1 ? ` (broderie ${i + 1})` : "";
    if (!b.champs.some((c) => c.valeur.trim())) out.push(`texte${z}`);
    if (!b.fil_code_gunold) out.push(`fil Gunold${z}`);
    const aDuTexte = b.champs.some((c) => c.valeur.trim() && !TYPES_SYMBOLE.has(c.type));
    if (aDuTexte && !b.police) out.push(`police${z}`);
  });
  return out;
}

/** Manques au niveau commande (expédition, contact). */
export function manquesCommande(c: Commande): string[] {
  const out: string[] = [];
  if (!c.livraison?.transporteur) out.push("transporteur");
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
  retrait_atelier: "Retrait atelier",
};

export const TRANSPORTEURS = ["Mondial Relay", "Colissimo", "Chronopost", "La Poste", "UPS", "DHL", "GLS"];
