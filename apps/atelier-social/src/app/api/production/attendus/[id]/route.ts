/**
 * GET    /api/production/attendus/[id]  → attendu + référentiel utile aux sélecteurs
 * PATCH  /api/production/attendus/[id]  → en-tête, lignes, réception, rattachement
 * DELETE /api/production/attendus/[id]  → suppression (admin)
 *
 * PATCH body :
 *  - champs d'en-tête : fournisseur, numero_facture, numero_commande_fournisseur,
 *    date_commande, date_facture, date_livraison_prevue, statut, total_ht,
 *    total_ttc, notes, recu_par, recu_le
 *  - lignes: [{ id, quantite_recue?, usage?, commande_client?, note?, quantite?,
 *    ref_fournisseur?, designation?, coloris?, taille?, pu_ht?, total_ht?,
 *    ref_article? (rattachement manuel à une réf. existante, "" pour détacher) }]
 *  - ajouter_ligne: { … } (ligne saisie à la main)
 *  - supprimer_ligne: id
 *  - action: "tout_recu" | "rapprocher" (recalcule les lignes non manuelles)
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import {
  deleteAttendu,
  getAttendu,
  nouvelIdLigne,
  statutDepuisReception,
  writeAttendu,
  type LigneAttendu,
  type StatutAttendu,
} from "@/lib/production/attendus";
import { rattacherLigne } from "@/lib/production/facture-parser";
import { chargerReferentiel, estProduitRnd, libelleRefArticle, refArticleExiste } from "@/lib/production/referentiel-articles";

type Ctx = { params: Promise<{ id: string }> };
const err = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return err("Accès réservé à l'atelier.", 403);
  const { id } = await params;
  try {
    const a = await getAttendu(id);
    if (!a) return err(`Attendu ${id} introuvable.`, 404);
    return NextResponse.json({ ok: true, data: a, role: auth.role });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
}

const ENTETE = [
  "fournisseur", "numero_facture", "numero_commande_fournisseur", "date_commande", "date_facture",
  "date_livraison_prevue", "total_ht", "total_ttc", "notes", "recu_par", "recu_le",
] as const;
const STATUTS: StatutAttendu[] = ["attendu", "recu_partiel", "recu", "litige"];

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return err("Accès réservé à l'atelier.", 403);
  const { id } = await params;
  try {
    const a = await getAttendu(id);
    if (!a) return err(`Attendu ${id} introuvable.`, 404);
    const body = (await req.json()) as Record<string, unknown>;
    const r = await chargerReferentiel();

    // En-tête
    for (const k of ENTETE) {
      if (body[k] === undefined) continue;
      const v = body[k];
      if (k === "total_ht" || k === "total_ttc") (a as unknown as Record<string, unknown>)[k] = v === null || v === "" ? null : Number(v);
      else (a as unknown as Record<string, unknown>)[k] = typeof v === "string" ? (v.trim() || undefined) : v;
    }
    if (typeof body.fournisseur === "string") a.fournisseur = body.fournisseur.trim().toUpperCase();

    // Lignes
    const majLignes = Array.isArray(body.lignes) ? (body.lignes as Array<Partial<LigneAttendu> & { id: string }>) : [];
    for (const m of majLignes) {
      const l = a.lignes.find((x) => x.id === m.id);
      if (!l) return err(`Ligne ${m.id} introuvable.`);
      if (m.quantite_recue !== undefined) l.quantite_recue = Math.max(0, Math.round(Number(m.quantite_recue) || 0));
      if (m.quantite !== undefined) l.quantite = Math.max(0, Math.round(Number(m.quantite) || 0));
      if (m.usage !== undefined) l.usage = m.usage;
      if (m.commande_client !== undefined) l.commande_client = m.commande_client?.trim() || undefined;
      if (m.note !== undefined) l.note = m.note?.trim() || undefined;
      if (m.pu_ht !== undefined) l.pu_ht = m.pu_ht === null ? null : Number(m.pu_ht);
      if (m.total_ht !== undefined) l.total_ht = m.total_ht === null ? null : Number(m.total_ht);
      let reRapprocher = false;
      for (const k of ["ref_fournisseur", "ref_modele", "designation", "coloris", "taille"] as const) {
        if (m[k] !== undefined) { l[k] = (m[k] as string).trim(); reRapprocher = true; }
      }
      if (m.ref_article !== undefined) {
        const ref = (m.ref_article ?? "").trim().toUpperCase();
        if (!ref) {
          Object.assign(l, rattacherLigne({ ...l, rattachement_manuel: false }, r), { rattachement_manuel: false });
        } else {
          if (!refArticleExiste(ref, r)) return err(`La réf. ${ref} n'existe pas encore — crée-la d'abord.`);
          const [p, c, t] = ref.split("-");
          Object.assign(l, {
            ref_article: ref, ref_produit: p, code_couleur: c, code_taille: t,
            libelle_article: libelleRefArticle(ref, r), etat: "reference", manque: [], rattachement_manuel: true,
          });
          l.produit_rnd = estProduitRnd(r.produits.get(p));
          if (l.usage === "rnd" && !l.produit_rnd && !l.commande_client) l.usage = "stock";
        }
      } else if (reRapprocher && !l.rattachement_manuel) {
        Object.assign(l, rattacherLigne(l, r));
      }
    }

    if (body.ajouter_ligne && typeof body.ajouter_ligne === "object") {
      const n = body.ajouter_ligne as Partial<LigneAttendu>;
      a.lignes.push(rattacherLigne({
        id: nouvelIdLigne(),
        ref_fournisseur: n.ref_fournisseur?.trim() ?? "",
        ref_modele: n.ref_modele?.trim(),
        designation: n.designation?.trim() ?? "",
        coloris: n.coloris?.trim() ?? "",
        taille: n.taille?.trim() ?? "",
        quantite: Math.max(1, Math.round(Number(n.quantite) || 1)),
        pu_ht: n.pu_ht ?? null,
        total_ht: n.total_ht ?? null,
        usage: n.usage,
        commande_client: n.commande_client?.trim() || undefined,
      }, r));
    }
    if (typeof body.supprimer_ligne === "string") a.lignes = a.lignes.filter((l) => l.id !== body.supprimer_ligne);

    // Répartir une ligne sur 2 destinations (ex. 3 pièces → 2 stock + 1 commande client).
    // La nouvelle ligne garde la même réf. ; montants et quantité reçue sont ventilés.
    if (body.scinder_ligne && typeof body.scinder_ligne === "object") {
      const { id: lid, quantite: q } = body.scinder_ligne as { id?: string; quantite?: number };
      const i = a.lignes.findIndex((x) => x.id === lid);
      if (i < 0) return err(`Ligne ${lid} introuvable.`);
      const src = a.lignes[i];
      const n = Math.round(Number(q) || 0);
      if (n < 1 || n >= src.quantite) return err(`Quantité à répartir entre 1 et ${src.quantite - 1}.`);
      const reste = src.quantite - n;
      const recue = src.quantite_recue ?? 0;
      const totalPour = (qte: number) =>
        src.pu_ht != null ? Math.round(src.pu_ht * qte * 100) / 100
        : src.total_ht != null ? Math.round((src.total_ht * qte / src.quantite) * 100) / 100
        : null;
      const nouvelle: LigneAttendu = {
        ...src,
        id: nouvelIdLigne(),
        quantite: n,
        total_ht: totalPour(n),
        quantite_recue: recue > reste ? recue - reste : undefined,
        usage: src.usage === "prod" ? "stock" : "prod",
        commande_client: undefined,
        note: undefined,
      };
      src.quantite = reste;
      src.total_ht = totalPour(reste);
      if (src.quantite_recue !== undefined) src.quantite_recue = Math.min(recue, reste);
      a.lignes.splice(i + 1, 0, nouvelle);
    }

    if (body.action === "rapprocher") {
      a.lignes = a.lignes.map((l) => (l.rattachement_manuel ? l : rattacherLigne(l, r)));
    }
    if (body.action === "tout_recu") {
      for (const l of a.lignes) l.quantite_recue = l.quantite;
      a.recu_le = a.recu_le ?? new Date().toISOString().slice(0, 10);
      a.recu_par = a.recu_par ?? auth.email ?? undefined;
    }

    // Statut : explicite (litige / retour à « attendu ») sinon déduit de la réception.
    if (typeof body.statut === "string" && STATUTS.includes(body.statut as StatutAttendu)) {
      a.statut = body.statut as StatutAttendu;
      if (a.statut !== "litige") a.statut = statutDepuisReception(a);
    } else {
      a.statut = statutDepuisReception(a);
    }

    await writeAttendu(a);
    return NextResponse.json({ ok: true, data: a });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireRole(["admin"]);
  if (!auth) return err("Suppression réservée à l'admin.", 403);
  const { id } = await params;
  try {
    await deleteAttendu(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
}

