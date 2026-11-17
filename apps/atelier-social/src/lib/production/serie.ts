/**
 * Mode série (commandes B2B type devis WAP) : un seul marquage — même fichier
 * DST / DTF / écusson — reproduit 20, 40, 150 fois sur des déclinaisons
 * produit × couleur × taille.
 *
 * L'article « modèle » (`modele_serie: true`) porte les zones de marquage, les
 * fichiers, fils et polices. À chaque écriture de la commande, ses zones sont
 * recopiées sur toutes les autres lignes : on ne saisit et ne dépose qu'une fois.
 *
 * Pur (sans fs) : utilisable côté client ET serveur.
 */
import type { Article, Broderie, BroderieFile, Commande } from "./commandes-loader";

export function articleModeleSerie(c: Pick<Commande, "articles">): Article | undefined {
  return c.articles.find((a) => a.modele_serie);
}

export function estEnSerie(c: Pick<Commande, "articles">): boolean {
  return !!articleModeleSerie(c);
}

export function nbPieces(c: Pick<Commande, "articles">): number {
  return c.articles.reduce((s, a) => s + (a.quantite || 1), 0);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Recopie les zones (et le motif) du modèle sur toutes les autres lignes. Mutant. */
export function propagerSerie(c: Commande): Commande {
  const modele = articleModeleSerie(c);
  if (!modele) return c;
  for (const a of c.articles) {
    if (a === modele) continue;
    a.modele_serie = undefined;
    a.broderies = clone(modele.broderies);
    a.ypm_id = modele.ypm_id;
    a.ypm_nom = modele.ypm_nom;
    a.motif_sku = modele.motif_sku;
  }
  return c;
}

/**
 * Active la série sur `modeleId`. Les fichiers déjà déposés sur d'autres lignes
 * (même zone) sont rapatriés sur le modèle avant recopie : rien n'est perdu.
 */
export function activerSerie(c: Commande, modeleId: string): Commande {
  const modele = c.articles.find((a) => a.id === modeleId);
  if (!modele) throw new Error("Article modèle introuvable.");
  for (const a of c.articles) a.modele_serie = a === modele ? true : undefined;
  modele.broderies.forEach((zone: Broderie, i) => {
    const vus = new Set((zone.fichiers ?? []).map((f) => f.storage_path));
    const rapatries: BroderieFile[] = [];
    for (const a of c.articles) {
      if (a === modele) continue;
      for (const f of a.broderies[i]?.fichiers ?? []) {
        if (vus.has(f.storage_path)) continue;
        vus.add(f.storage_path);
        rapatries.push(f);
      }
    }
    if (rapatries.length) zone.fichiers = [...(zone.fichiers ?? []), ...rapatries];
  });
  return propagerSerie(c);
}

export function desactiverSerie(c: Commande): Commande {
  for (const a of c.articles) a.modele_serie = undefined;
  return c;
}

/** Même déclinaison = même réf. article, sinon même produit + couleur + taille. */
function cleDeclinaison(a: Article): string {
  if (a.ref_article) return a.ref_article;
  return [a.produit_id, a.code_couleur ?? a.couleur_support, a.code_taille ?? a.taille, a.produit_nom].join("|");
}

/** Signature du marquage (sans les durées recalculées) pour vérifier que 2 lignes sont fusionnables. */
function signatureMarquage(a: Article): string {
  return JSON.stringify(
    a.broderies.map((b) => ({
      p: b.placement,
      t: b.technique ?? "broderie",
      d: b.detail_technique ?? "",
      c: b.champs.map((x) => [x.label, x.valeur]),
      f: [b.fil_id, b.fil_id_secondaire ?? "", b.palette_id ?? ""],
      po: b.polices ?? (b.police ? [b.police] : []),
      fi: (b.fichiers ?? []).map((x) => x.storage_path).sort(),
    })),
  );
}

/** Nombre de lignes après regroupement des déclinaisons identiques (aperçu du bouton). */
export function lignesApresRegroupement(c: Pick<Commande, "articles">): number {
  return new Set(c.articles.map((a) => `${cleDeclinaison(a)}#${signatureMarquage(a)}`)).size;
}

/**
 * Fusionne les lignes de même déclinaison ET même marquage en additionnant les
 * quantités (ex. 23 lignes « T-shirt bleu M ×1 » → 9 lignes). Mutant.
 * Retourne le nombre de lignes supprimées. Le modèle de série est toujours conservé.
 */
export function regrouperDeclinaisons(c: Commande): number {
  const garde = new Map<string, Article>();
  const out: Article[] = [];
  // Le modèle passe en premier pour être la ligne conservée de son groupe.
  const ordre = [...c.articles].sort((a, b) => Number(!!b.modele_serie) - Number(!!a.modele_serie));
  for (const a of ordre) {
    const k = `${cleDeclinaison(a)}#${signatureMarquage(a)}`;
    const cible = garde.get(k);
    if (!cible) {
      garde.set(k, a);
      out.push(a);
      continue;
    }
    cible.quantite = (cible.quantite || 1) + (a.quantite || 1);
    if (a.notes && !cible.notes?.includes(a.notes)) cible.notes = [cible.notes, a.notes].filter(Boolean).join(" · ");
    if (!cible.rattachement_attendu && a.rattachement_attendu) cible.rattachement_attendu = a.rattachement_attendu;
  }
  const supprimees = c.articles.length - out.length;
  // Ordre d'origine conservé.
  c.articles = c.articles.filter((a) => out.includes(a));
  return supprimees;
}

/** Message d'erreur si on tente de modifier le marquage d'une ligne qui n'est pas le modèle de la série. */
export function refusMarquageHorsModele(c: Pick<Commande, "articles">, articleId: string): string | null {
  const modele = articleModeleSerie(c);
  if (!modele || modele.id === articleId) return null;
  return "Commande en série : le marquage se modifie sur la ligne modèle, il est recopié sur toutes les déclinaisons.";
}
