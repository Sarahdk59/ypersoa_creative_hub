/**
 * PATCH /api/production/commandes/[id]/articles/[articleId]
 *   { produit_id?: "YP013", ypm_id?: "YPM018", code_couleur?: "0064", code_taille?: "0000", quantite?: 1 }
 *
 * Correction manuelle d'un article « à identifier » par l'atelier.
 *  - produit : réf. du catalogue ; casquette/bonnet → zones buste basculées en « tête »
 *  - motif   : YPM-XXX existant (motifs_ypm)
 *  - couleur : code présent pour ce produit (catalogue ou ajout Hub) — sinon
 *              la créer d'abord via POST /api/production/catalogue/couleurs
 *  - taille  : code taille Akanea
 *  - broderie: police / fil d'une zone (fil → nom, hex, code Gunold)
 * Recalcule la réf. article YPxxx-CCCC-TTTT et les durées.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  getCommande,
  getDureesRef,
  getFichesTechniques,
  getSkuMapping,
  recalculerDureesCommande,
  writeCommande,
} from "@/lib/production/commandes-loader";
import {
  buildRefArticle,
  couleursPourProduit,
  getCatalogue,
  getCouleursAjouts,
  isHeadwear,
  normalizeYpmId,
  produitCatalogue,
} from "@/lib/production/catalogue";
import { getFils, getMotifs } from "@/lib/atelier-da/referentiels-loader";

type Body = {
  produit_id?: string;
  ypm_id?: string;
  code_couleur?: string;
  code_taille?: string;
  quantite?: number;
  /** Édition d'une broderie de l'article : police et/ou fil (id palette_fils_broderie_v2). */
  broderie?: { index: number; police?: string; fil_id?: string };
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; articleId: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  try {
    const { id, articleId } = await params;
    const body = (await req.json()) as Body;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
    if (commande.statut === "archivee") {
      return NextResponse.json({ ok: false, error: "Commande archivée : désarchive-la avant de la modifier." }, { status: 409 });
    }
    const article = commande.articles.find((a) => a.id === articleId);
    if (!article) return NextResponse.json({ ok: false, error: "Article introuvable" }, { status: 404 });

    const mapping = getSkuMapping();
    const cat = getCatalogue();
    const bad = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });

    // 1) Produit
    if (body.produit_id !== undefined) {
      const ref = body.produit_id.trim().toUpperCase();
      const p = produitCatalogue(ref);
      if (!p) return bad(`Produit ${ref} inconnu du catalogue.`);
      article.produit_id = ref;
      article.produit_nom = mapping.produits[ref]?.nom_commercial ?? p.libelle;
      const setup = mapping.produits[ref]?.duree_setup_machine_min;
      if (setup) article.duree_setup_min = setup;
      const coiffe = isHeadwear(ref);
      for (const b of article.broderies) {
        if (coiffe && b.placement === "buste") b.placement = "tete";
        if (!coiffe && b.placement === "tete") b.placement = "buste";
        for (const c of b.champs) {
          if (coiffe) c.label = c.label.replace(/buste/i, "tête");
          else c.label = c.label.replace(/t[êe]te/i, "buste");
        }
      }
    }

    const ajouts = await getCouleursAjouts();
    const couleurs = article.produit_id ? couleursPourProduit(article.produit_id, ajouts) : [];

    // 2) Couleur (explicite, ou revalidée si le produit a changé)
    if (body.code_couleur !== undefined) {
      const code = body.code_couleur.trim().padStart(4, "0");
      const c = couleurs.find((x) => x.code === code);
      if (!c) return bad(`Couleur ${code} inexistante pour ${article.produit_id || "ce produit"} : crée-la d'abord.`);
      article.code_couleur = c.code;
      article.couleur_support = c.libelle;
    } else if (body.produit_id !== undefined && article.code_couleur) {
      const c = couleurs.find((x) => x.code === article.code_couleur);
      if (!c) article.code_couleur = undefined; // couleur pas dispo sur le nouveau produit → à re-choisir
    }

    // 3) Taille
    if (body.code_taille !== undefined) {
      const t = cat.tailles[body.code_taille.trim()];
      if (!t) return bad(`Code taille ${body.code_taille} inconnu.`);
      article.code_taille = t.code;
      article.taille = t.taille;
    }

    // 4) Motif
    if (body.ypm_id !== undefined) {
      const ypm = normalizeYpmId(body.ypm_id);
      if (!ypm) return bad(`Motif ${body.ypm_id} illisible (attendu YPM018 ou YPM-018).`);
      const motifs = await getMotifs();
      const m = motifs.motifs.find((x) => x.id === ypm);
      if (!m) return bad(`Motif ${ypm} absent de la base motifs.`);
      article.ypm_id = m.id;
      article.ypm_nom = m.nom_commercial;
      // Police par défaut = typographie de la bible motif, sans écraser une saisie.
      const typo = m.bible?.typographie;
      if (typo) for (const b of article.broderies) if (!b.police) b.police = typo;
    }

    if (body.broderie) {
      const b = article.broderies[body.broderie.index];
      if (!b) return bad(`Broderie ${body.broderie.index} introuvable.`);
      if (body.broderie.police !== undefined) b.police = body.broderie.police.trim() || undefined;
      if (body.broderie.fil_id !== undefined) {
        const fil = getFils().couleurs.find((f) => f.id === body.broderie!.fil_id);
        if (!fil) return bad(`Fil ${body.broderie.fil_id} inconnu de la palette.`);
        b.fil_id = fil.id;
        b.fil_nom = fil.nom;
        b.fil_hex = fil.hex;
        b.fil_code_gunold = fil.code_gunold ?? "";
        for (const c of b.champs) c.fil_id = fil.id;
      }
    }

    if (body.quantite !== undefined) {
      if (!Number.isInteger(body.quantite) || body.quantite < 1) return bad("Quantité invalide.");
      article.quantite = body.quantite;
    }

    article.ref_article = buildRefArticle(article.produit_id, article.code_couleur, article.code_taille);

    recalculerDureesCommande(commande, getDureesRef(), getFichesTechniques());
    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
