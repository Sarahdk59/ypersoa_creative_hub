/**
 * GET /api/production/catalogue/export
 *
 * Base produit à jour (classeur Akanea + créations Hub) en .xlsx, colonnes
 * alignées sur les onglets du classeur « base produit » pour pouvoir recopier
 * dans les autres fichiers :
 *   - Nouveautés Hub : uniquement ce qui a été créé depuis le Hub (à reporter dans Akanea)
 *   - Produits / Couleurs / Tailles_produit / SKU : base complète, colonne « Origine »
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireRole } from "@/lib/auth-guard";
import { getCatalogue } from "@/lib/production/catalogue";
import {
  chargerReferentiel,
  couleursProduitEtendu,
  libelleRefArticle,
  taillesProduitEtendu,
} from "@/lib/production/referentiel-articles";

const ORIGINE = (o: string) => (o === "hub" ? "Hub" : "Classeur");

export async function GET() {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });

  const r = await chargerReferentiel();
  const cat = getCatalogue();
  const produits = Array.from(r.produits.values()).sort((a, b) => a.ref.localeCompare(b.ref));

  // Produits
  const shProduits = [
    ["Réf interne", "Réf fabricant", "Libellé", "Famille", "Sous-famille", "Genre", "Technos", "Statut", "Origine"],
    ...produits.map((p) => [p.ref, p.ref_fabricant, p.libelle, p.famille, p.sous_famille, p.genre, p.technos.join("|"), p.statut, ORIGINE(p.origine)]),
  ];

  // Couleurs par produit
  const shCouleurs: (string | null)[][] = [["Réf interne", "Couleur fabricant", "Code couleur", "Libellé", "Hex", "Origine"]];
  for (const p of produits) {
    for (const c of couleursProduitEtendu(p.ref, r)) {
      shCouleurs.push([p.ref, c.couleur_fabricant ?? "", c.code, c.libelle, c.hex, c.origine === "hub" ? (c.nouvelle_famille ? "Hub (nouvelle famille à créer dans Akanea)" : "Hub") : "Classeur"]);
    }
  }

  // Tailles par produit
  const taillesHub = new Set(r.taillesAjouts.map((t) => `${t.ref_produit}|${t.code_taille}`));
  const shTailles: string[][] = [["Réf interne", "Taille", "Code taille", "Origine"]];
  for (const p of produits) {
    for (const t of taillesProduitEtendu(p.ref, r)) {
      shTailles.push([p.ref, t.taille, t.code, taillesHub.has(`${p.ref}|${t.code}`) ? "Hub" : "Classeur"]);
    }
  }

  // SKU
  const skuHub = new Map(r.skusAjouts.map((s) => [s.ref_article, s]));
  const shSku: string[][] = [["SKU", "Réf interne", "Code couleur", "Code taille", "Libellé article", "Origine", "Créé le", "Source"]];
  for (const p of produits) {
    const codes = new Set<string>((cat.skus[p.ref] ?? []).map((cc) => `${p.ref}-${cc}`));
    for (const s of r.skusAjouts) if (s.ref_produit === p.ref) codes.add(s.ref_article);
    for (const sku of Array.from(codes).sort()) {
      const [, cc, tt] = sku.split("-");
      const hub = skuHub.get(sku);
      shSku.push([sku, p.ref, cc, tt, libelleRefArticle(sku, r), hub ? "Hub" : "Classeur", hub?.created_at.slice(0, 10) ?? "", hub?.origine ?? ""]);
    }
  }

  // Nouveautés Hub (à reporter dans le classeur / Akanea)
  const shNouv: (string | null)[][] = [["Type", "Réf", "Détail", "Code", "Libellé / valeur", "Créé le", "Par", "Source"]];
  for (const p of produits.filter((x) => x.origine === "hub")) {
    shNouv.push(["Produit", p.ref, `${p.ref_fabricant} · ${p.famille}`, "", p.libelle, "", "", p.statut]);
  }
  for (const c of r.couleursAjouts) {
    shNouv.push(["Couleur produit", c.ref_produit, c.nouvelle_famille ? "Nouvelle famille Akanea" : "Famille existante", c.code_couleur, c.libelle, c.created_at.slice(0, 10), c.created_by, ""]);
  }
  for (const t of r.taillesAjouts) {
    shNouv.push(["Taille produit", t.ref_produit, "", t.code_taille, cat.tailles[t.code_taille]?.taille ?? "", t.created_at.slice(0, 10), t.created_by, ""]);
  }
  for (const s of r.skusAjouts) {
    shNouv.push(["Réf. article", s.ref_article, s.ref_produit, `${s.code_couleur}-${s.code_taille}`, libelleRefArticle(s.ref_article, r), s.created_at.slice(0, 10), s.created_by, s.origine]);
  }

  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: unknown[][], cols: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = cols.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add("Nouveautés Hub", shNouv, [16, 18, 26, 12, 32, 12, 24, 36]);
  add("Produits", shProduits, [10, 12, 36, 14, 14, 10, 14, 26, 10]);
  add("Couleurs", shCouleurs, [10, 24, 12, 24, 10, 30]);
  add("Tailles_produit", shTailles, [10, 8, 12, 10]);
  add("SKU", shSku, [18, 10, 12, 12, 36, 10, 12, 36]);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="base_produit_hub_${date}.xlsx"`,
    },
  });
}
