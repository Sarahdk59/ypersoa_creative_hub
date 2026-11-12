/**
 * PATCH /api/production/commandes/[id]/articles/[articleId]
 *   { produit_id?: "YP013", ypm_id?: "YPM018", code_couleur?: "0064", code_taille?: "0000", quantite?: 1 }
 *
 * Correction manuelle d'un article « à identifier » par l'atelier.
 *  - ref_article : YPxxx-CCCC-TTTT en une fois (rattachement depuis un attendu de livraison)
 *  - produit : réf. du catalogue OU produit créé depuis le Hub (R&D, attendus) ;
 *              casquette/bonnet → zones buste basculées en « tête »
 *  - motif   : YPM-XXX existant (motifs_ypm)
 *  - couleur : code présent pour ce produit (catalogue ou ajout Hub) — sinon
 *              la créer d'abord via POST /api/production/catalogue/couleurs
 *  - taille  : code taille Akanea
 *  - zone    : technique (broderie / DTF / écusson / sublimation) + détail
 *  - broderie: polices (1 à 3) / fil unique OU palette nommée (Orage, Printemps…)
 *              d'une zone, police dédiée d'un champ quand la zone en combine plusieurs
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
  getCatalogue,
  alignerZoneCoiffe,
  normalizeYpmId,
} from "@/lib/production/catalogue";
import { chargerReferentiel, couleursProduitEtendu } from "@/lib/production/referentiel-articles";
import { getFils, getMotifs, getPalettes } from "@/lib/atelier-da/referentiels-loader";
import { MAX_POLICES_PAR_ZONE, normaliserPolices, splitTypos, TECHNIQUES_MARQUAGE } from "@/lib/production/broderie-utils";
import type { TechniqueMarquage } from "@/lib/production/commandes-loader";

type Body = {
  /** Raccourci : réf. article complète YPxxx-CCCC-TTTT (ex. créée depuis un attendu de livraison). */
  ref_article?: string;
  /** Traçabilité : ligne d'attendu fournisseur d'où vient la réf. */
  depuis_attendu?: { attendu_id: string; ligne_id: string };
  produit_id?: string;
  ypm_id?: string;
  code_couleur?: string;
  code_taille?: string;
  quantite?: number;
  /** Édition d'une broderie de l'article. */
  broderie?: {
    index: number;
    /** Héritage : une seule police (remplace la liste). */
    police?: string;
    /** 1 à 3 polices combinées dans la zone ([] = à compléter). */
    polices?: string[];
    /** Police dédiée d'un champ (index dans champs) — "" = police par défaut de la zone. */
    champ_police?: { champ: number; police: string };
    /** Fil unique (id palette_fils_broderie_v2) — retire la palette éventuelle. */
    fil_id?: string;
    /** Palette nommée (palettes_fils_associations) — "" = retirer la palette. */
    palette_id?: string;
    /** Technique de la zone : broderie (TMEZ) / dtf / ecusson / sublimation. */
    technique?: string;
    /** Précisions d'une zone non brodée (taille, couleurs, réf. écusson). "" = effacer. */
    detail_technique?: string;
  };
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; articleId: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  try {
    const { id, articleId } = await params;
    const body = (await req.json()) as Body;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
    // Archivée : on autorise seulement la correction d'identification (produit / motif /
    // couleur / taille) — utile pour fiabiliser le bilan de ventes sur l'historique.
    // Broderie et quantité restent verrouillées (prod déjà faite).
    if (commande.statut === "archivee" && (body.broderie !== undefined || body.quantite !== undefined)) {
      return NextResponse.json({ ok: false, error: "Commande archivée : désarchive-la avant de modifier la broderie ou la quantité." }, { status: 409 });
    }
    const article = commande.articles.find((a) => a.id === articleId);
    if (!article) return NextResponse.json({ ok: false, error: "Article introuvable" }, { status: 404 });

    const mapping = getSkuMapping();
    const cat = getCatalogue();
    const bad = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });
    // Catalogue Akanea + produits / couleurs / tailles créés depuis le Hub (attendus, R&D).
    const referentiel = await chargerReferentiel();

    if (body.ref_article !== undefined) {
      const m = body.ref_article.trim().toUpperCase().match(/^(YP\d{3})-(\d{4})-(\d{4})$/);
      if (!m) return bad(`Réf. article ${body.ref_article} invalide (attendu YPxxx-CCCC-TTTT).`);
      body.produit_id = m[1];
      body.code_couleur = m[2];
      body.code_taille = m[3];
    }

    // 1) Produit
    if (body.produit_id !== undefined) {
      const ref = body.produit_id.trim().toUpperCase();
      const p = referentiel.produits.get(ref);
      if (!p) return bad(`Produit ${ref} inconnu du catalogue (ni créé depuis le Hub).`);
      article.produit_id = ref;
      article.produit_nom = mapping.produits[ref]?.nom_commercial ?? p.libelle;
      const setup = mapping.produits[ref]?.duree_setup_machine_min;
      if (setup) article.duree_setup_min = setup;
      alignerZoneCoiffe(article, true);
    }

    const couleurs = article.produit_id ? couleursProduitEtendu(article.produit_id, referentiel) : [];

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
      // Polices par défaut = typographie(s) de la bible motif (« Russ Times + Diana Star »), sans écraser une saisie.
      const typos = splitTypos(m.bible?.typographie);
      if (typos.length) {
        for (const b of article.broderies) {
          if (!b.police && !b.polices?.length) {
            b.polices = typos;
            b.police = typos[0];
          }
        }
      }
    }

    if (body.broderie) {
      const b = article.broderies[body.broderie.index];
      if (!b) return bad(`Broderie ${body.broderie.index} introuvable.`);
      if (body.broderie.technique !== undefined) {
        const t = body.broderie.technique as TechniqueMarquage;
        if (!TECHNIQUES_MARQUAGE.includes(t)) return bad(`Technique ${body.broderie.technique} inconnue.`);
        b.technique = t === "broderie" ? undefined : t;
        if (t === "broderie") {
          // Retour en broderie : cadrage TMEZ standard (remis à 0 tant que la zone était hors machine).
          const cadrage = getDureesRef().operations.cadrage_zone?.duree_min ?? 3;
          if (!b.duree_cadrage_min) b.duree_cadrage_min = cadrage;
        } else {
          b.attribution_couleurs = undefined;
        }
      }
      if (body.broderie.detail_technique !== undefined) {
        b.detail_technique = String(body.broderie.detail_technique).trim() || undefined;
      }
      const setPolices = (list: string[]) => {
        const ps = normaliserPolices(list);
        b.polices = ps.length ? ps : undefined;
        b.police = ps[0];
        // Une police de champ qui ne fait plus partie de la zone retombe sur le défaut.
        for (const c of b.champs) if (c.police && !ps.includes(c.police)) c.police = undefined;
      };
      if (body.broderie.police !== undefined) setPolices([body.broderie.police]);
      if (body.broderie.polices !== undefined) {
        if (!Array.isArray(body.broderie.polices)) return bad("polices doit être une liste.");
        const distinctes = new Set(body.broderie.polices.map((p) => String(p).trim()).filter(Boolean));
        if (distinctes.size > MAX_POLICES_PAR_ZONE) return bad(`${MAX_POLICES_PAR_ZONE} polices maximum par zone.`);
        setPolices(body.broderie.polices);
      }
      if (body.broderie.champ_police !== undefined) {
        const { champ, police } = body.broderie.champ_police;
        const c = b.champs[champ];
        if (!c) return bad(`Champ ${champ} introuvable.`);
        const p = police.trim();
        if (p && !(b.polices ?? (b.police ? [b.police] : [])).includes(p)) return bad(`La police « ${p} » n'est pas dans la zone.`);
        c.police = p || undefined;
      }

      const fils = getFils().couleurs;
      const appliquerFilPrincipal = (fil: (typeof fils)[number]) => {
        b.fil_id = fil.id;
        b.fil_nom = fil.nom;
        b.fil_hex = fil.hex;
        b.fil_code_gunold = fil.code_gunold ?? "";
        for (const c of b.champs) c.fil_id = fil.id;
      };
      const retirerPalette = () => {
        b.palette_id = undefined;
        b.palette_nom = undefined;
        b.palette_type = undefined;
        b.fils_palette = undefined;
        b.duree_changement_fil_min = b.fil_id_secondaire ? b.duree_changement_fil_min : 0;
      };

      // Changer les fils rend l'attribution lettre → fil caduque.
      if (body.broderie.fil_id !== undefined || body.broderie.palette_id !== undefined) b.attribution_couleurs = undefined;

      if (body.broderie.fil_id !== undefined) {
        const fil = fils.find((f) => f.id === body.broderie!.fil_id);
        if (!fil) return bad(`Fil ${body.broderie.fil_id} inconnu de la palette.`);
        retirerPalette();
        appliquerFilPrincipal(fil);
      }

      if (body.broderie.palette_id !== undefined) {
        const pid = body.broderie.palette_id.trim();
        if (!pid) {
          retirerPalette();
        } else {
          const pal = getPalettes().palettes.find((p) => p.id === pid);
          if (!pal) return bad(`Palette ${pid} inconnue.`);
          const filsPal = pal.fils.map((id) => fils.find((f) => f.id === id));
          const manquant = pal.fils.find((_, i) => !filsPal[i]);
          if (manquant) return bad(`Fil ${manquant} de la palette ${pal.nom} absent du nuancier.`);
          const ok = filsPal as Array<(typeof fils)[number]>;
          b.palette_id = pal.id;
          b.palette_nom = pal.nom;
          b.palette_type = pal.type;
          b.fils_palette = ok.map((f) => ({ fil_id: f.id, fil_nom: f.nom, fil_hex: f.hex, fil_code_gunold: f.code_gunold ?? "" }));
          // Le fil secondaire n'a plus de sens : la palette décrit tous les fils.
          b.fil_id_secondaire = undefined;
          b.fil_nom_secondaire = undefined;
          b.fil_hex_secondaire = undefined;
          b.fil_code_gunold_secondaire = undefined;
          appliquerFilPrincipal(ok[0]);
        }
      }
    }

    if (body.quantite !== undefined) {
      if (!Number.isInteger(body.quantite) || body.quantite < 1) return bad("Quantité invalide.");
      article.quantite = body.quantite;
    }

    article.ref_article = buildRefArticle(article.produit_id, article.code_couleur, article.code_taille);
    if (body.depuis_attendu?.attendu_id && body.depuis_attendu.ligne_id && article.ref_article) {
      article.rattachement_attendu = {
        attendu_id: body.depuis_attendu.attendu_id,
        ligne_id: body.depuis_attendu.ligne_id,
        le: new Date().toISOString().slice(0, 10),
        par: auth.email ?? undefined,
      };
    }

    recalculerDureesCommande(commande, getDureesRef(), getFichesTechniques());
    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
