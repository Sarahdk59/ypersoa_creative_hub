/**
 * /api/production/commandes/[id]
 *   GET   → détail d'une commande
 *   PATCH → mise à jour (statut, priorité, notes, articles partiels)
 *           + mode série B2B : { serie: { modele_article_id } | null } et { action: "regrouper_declinaisons" }
 *   DELETE → suppression définitive (admin seul) : erreur de saisie, devis mal importé…
 *            Supprime aussi les fichiers Storage propres à la commande (bon PDF,
 *            pièces du dossier, fichiers broderie) s'ils ne servent à aucune autre commande.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { supabase } from "@/lib/supabase";
import {
  deleteCommande,
  listCommandes,
  getCommande,
  writeCommande,
  recalculerDureesCommande,
  getDureesRef,
  type Commande,
} from "@/lib/production/commandes-loader";
import { activerSerie, desactiverSerie, regrouperDeclinaisons } from "@/lib/production/serie";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commande = await getCommande(id);
  if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, data: commande });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<Commande> & {
      serie?: { modele_article_id: string } | null;
      action?: "regrouper_declinaisons";
    };
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    // Mode série (B2B) : un marquage commun saisi une fois, recopié sur toutes les lignes.
    if (body.serie !== undefined || body.action) {
      if (commande.statut === "archivee") {
        return NextResponse.json({ ok: false, error: "Commande archivée : désarchive-la d'abord." }, { status: 400 });
      }
      let lignesSupprimees = 0;
      if (body.serie === null) desactiverSerie(commande);
      else if (body.serie) activerSerie(commande, body.serie.modele_article_id);
      if (body.action === "regrouper_declinaisons") {
        lignesSupprimees = regrouperDeclinaisons(commande);
        // Les créneaux pointaient vers des lignes fusionnées : planning à régénérer.
        if (lignesSupprimees && commande.planning) {
          commande.planning = null;
          if (commande.statut === "planifiee") commande.statut = "a_planifier";
        }
      }
      recalculerDureesCommande(commande, getDureesRef());
      await writeCommande(commande);
      return NextResponse.json({ ok: true, data: commande, lignes_supprimees: lignesSupprimees });
    }

    if (body.statut) commande.statut = body.statut;
    if (body.priorite) commande.priorite = body.priorite;
    if (typeof body.notes === "string") commande.notes = body.notes;
    if (body.montant_total_ttc !== undefined) commande.montant_total_ttc = body.montant_total_ttc;
    if (body.contact !== undefined) commande.contact = body.contact ?? undefined;
    if (body.livraison !== undefined) commande.livraison = body.livraison ?? undefined;
    if (body.articles) {
      commande.articles = body.articles;
      const durees = getDureesRef();
      recalculerDureesCommande(commande, durees);
    }
    if (body.planning !== undefined) commande.planning = body.planning;
    if (body.journal !== undefined) {
      commande.journal = body.journal ?? undefined;
      // Cohérence : si on enregistre une date d'archivage, on passe le statut à archivee
      if (commande.journal?.archivee_le) commande.statut = "archivee";
    }

    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** Chemins Storage référencés par une commande, regroupés par bucket. */
function fichiersStorage(c: Commande): Record<string, string[]> {
  const pdf = new Set<string>();
  const broderies = new Set<string>();
  if (c.bon_preparation_pdf?.storage_path) pdf.add(c.bon_preparation_pdf.storage_path);
  for (const d of c.documents ?? []) if (d.storage_path) pdf.add(d.storage_path);
  for (const a of c.articles) {
    for (const b of a.broderies) for (const f of b.fichiers ?? []) if (f.storage_path) broderies.add(f.storage_path);
  }
  return { "commandes-pdf": [...pdf], "commandes-broderies": [...broderies] };
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Action destructive = admin uniquement (matrice de droits : l'atelier corrige, ne supprime pas).
  const auth = await requireRole(["admin"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Suppression réservée à l'admin." }, { status: 403 });
  try {
    const { id } = await params;
    const commande = await getCommande(id);
    if (!commande) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

    const autres = (await listCommandes()).filter((c) => c.id !== id);
    const reworks = autres.filter((c) => c.rework_de?.commande_id === id).map((c) => c.id);

    // Un fichier partagé avec une autre commande (rework, re-import) est conservé.
    const utilisesAilleurs = new Set(autres.flatMap((c) => Object.values(fichiersStorage(c)).flat()));
    await deleteCommande(id);

    let fichiersSupprimes = 0;
    if (supabase) {
      for (const [bucket, paths] of Object.entries(fichiersStorage(commande))) {
        const aSupprimer = paths.filter((p) => !utilisesAilleurs.has(p));
        if (!aSupprimer.length) continue;
        const { error } = await supabase.storage.from(bucket).remove(aSupprimer); // best effort
        if (!error) fichiersSupprimes += aSupprimer.length;
      }
    }

    return NextResponse.json({ ok: true, data: { id, fichiers_supprimes: fichiersSupprimes, reworks_orphelins: reworks } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
