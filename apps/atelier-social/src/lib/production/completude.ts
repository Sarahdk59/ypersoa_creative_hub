/**
 * Complétude d'une commande — « zéro question pour les opérateurs ».
 * Pur (sans fs) : utilisable côté client ET serveur.
 * Une liste vide = article prêt à broder ; sinon les badges « à compléter ».
 */
import type { Article, Commande } from "./commandes-loader";

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
  });
  return out;
}

export function articlesIncomplets(c: Commande): Array<{ article: Article; manques: string[] }> {
  return c.articles.map((article) => ({ article, manques: manquesArticle(article) })).filter((x) => x.manques.length);
}
