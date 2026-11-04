/**
 * Fiche de réception — 1 attendu de livraison, imprimable A4 (Cmd+P).
 *
 * Pour prévenir la prod de ce qui arrive : n° de facture / n° de commande
 * fournisseur, date prévue, puis 1 ligne par article avec sa réf. Ypersoa
 * (ou « À CRÉER »), sa destination (commande client, stock, R&D) et une case
 * à cocher à la réception.
 *
 * Server component : lit l'attendu directement.
 */
import { notFound } from "next/navigation";
import { getAttendu, type LigneAttendu } from "@/lib/production/attendus";
import PrintBar from "./PrintBar";

const dateFr = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—");
const USAGE: Record<string, string> = { prod: "Commande client", stock: "Stock", rnd: "R&D" };

export const dynamic = "force-dynamic";

export default async function ReceptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAttendu(id);
  if (!a) notFound();

  // Regroupement pour la prod : d'abord les commandes client, puis R&D, puis stock.
  const ordre: Record<string, number> = { prod: 0, rnd: 1, stock: 2 };
  const lignes = [...a.lignes].sort((x, y) => (ordre[x.usage] ?? 3) - (ordre[y.usage] ?? 3) || (x.ref_article ?? x.ref_fournisseur).localeCompare(y.ref_article ?? y.ref_fournisseur));
  const pieces = a.lignes.reduce((s, l) => s + l.quantite, 0);
  const aCreer = a.lignes.filter((l) => l.etat !== "reference");
  const refAffichee = (l: LigneAttendu) =>
    l.etat === "reference" ? l.ref_article : `À CRÉER${l.ref_article ? ` · ${l.ref_article}` : l.ref_produit ? ` · ${l.ref_produit}` : ""}`;

  return (
    <div className="rc">
      <style>{`
        .rc { max-width: 960px; margin: 0 auto; padding: 28px 24px; background: white; color: #1A1614;
              font-family: "Hanken Grotesk", system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
        .rc h1 { font-family: "Newsreader", Georgia, serif; font-weight: 500; font-size: 26px; margin: 0; }
        .rc .lbl { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .55; margin-bottom: 3px; }
        .rc .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
        .rc .box { border: 1px solid #D8D2C8; border-radius: 6px; padding: 8px 10px; }
        .rc .big { font-size: 15px; font-weight: 700; }
        .rc table { width: 100%; border-collapse: collapse; }
        .rc th { text-align: left; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; padding: 4px 6px; border-bottom: 1.5px solid #1A1614; }
        .rc td { padding: 6px; vertical-align: top; border-bottom: 1px solid #ECE7DF; }
        .rc .ref { font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 12.5px; }
        .rc .todo { color: #9A4400; }
        .rc .chk { width: 15px; height: 15px; border: 1.5px solid #1A1614; border-radius: 3px; display: inline-block; }
        .rc .tag { font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 99px; background: #F4EEE2; white-space: nowrap; }
        .rc .tag.rnd { background: #EEE7F7; color: #5B3E8C; }
        .rc .tag.prod { background: #D9E8E6; color: #0E5550; }
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
          .rc { padding: 0; max-width: none; }
          tr { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <PrintBar attenduId={a.id} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #1A1614", paddingBottom: 10, marginBottom: 14 }}>
        <div>
          <div className="lbl">Ypersoa · Attendu de livraison</div>
          <h1>{a.fournisseur || "Fournisseur"} — {pieces} pièce{pieces > 1 ? "s" : ""}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="lbl">Livraison prévue</div>
          <div className="big">{dateFr(a.date_livraison_prevue)}</div>
        </div>
      </div>

      <div className="grid">
        <div className="box"><div className="lbl">N° de facture / BL</div><div className="big">{a.numero_facture || "—"}</div></div>
        <div className="box"><div className="lbl">N° commande fournisseur</div><div className="big">{a.numero_commande_fournisseur || "—"}</div></div>
        <div className="box"><div className="lbl">Commandé le</div><div>{dateFr(a.date_commande ?? a.date_facture)}</div></div>
        <div className="box"><div className="lbl">Montant</div><div>{a.total_ht != null ? `${a.total_ht.toFixed(2)} € HT` : "—"}{a.total_ttc != null ? ` · ${a.total_ttc.toFixed(2)} € dû` : ""}</div></div>
      </div>

      {aCreer.length > 0 && (
        <div className="box" style={{ borderColor: "#9A4400", marginBottom: 14 }}>
          <div className="lbl todo">À créer avant mise en stock · {aCreer.length} ligne{aCreer.length > 1 ? "s" : ""}</div>
          {aCreer.map((l) => (
            <div key={l.id}>
              <strong>{l.ref_fournisseur}</strong> {l.designation} — {l.coloris} {l.taille} ×{l.quantite} → <span className="todo">{l.ref_produit ? `${l.ref_produit}${l.produit_rnd ? " (R&D à compléter)" : ""} : ${(l.manque ?? []).join(", ")}` : "nouveau produit (R&D)"}</span>
            </div>
          ))}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={{ width: 22 }}>Reçu</th>
            <th>Réf. Ypersoa</th>
            <th>Article</th>
            <th>Réf. fournisseur</th>
            <th>Coloris · taille</th>
            <th style={{ textAlign: "right" }}>Qté</th>
            <th>Destination</th>
            <th style={{ width: 90 }}>Qté reçue</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td><span className="chk" style={(l.quantite_recue ?? 0) >= l.quantite ? { background: "#1A1614" } : undefined} /></td>
              <td className={`ref ${l.etat !== "reference" ? "todo" : ""}`}>{refAffichee(l)}</td>
              <td>{l.libelle_article || l.designation}</td>
              <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{l.ref_fournisseur}</td>
              <td>{l.coloris} · {l.taille}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>{l.quantite}</td>
              <td>
                <span className={`tag ${l.usage}`}>{USAGE[l.usage] ?? l.usage}</span>
                {l.commande_client ? <div style={{ fontWeight: 700, marginTop: 2 }}>#{l.commande_client.replace(/^#/, "")}</div> : null}
              </td>
              <td>{l.quantite_recue != null ? <strong>{l.quantite_recue}</strong> : "____"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 40, marginTop: 24 }}>
        <div><div className="lbl">Réceptionné par</div><div>{a.recu_par || "______________________"}</div></div>
        <div><div className="lbl">Le</div><div>{a.recu_le ? dateFr(a.recu_le) : "____ / ____ / ________"}</div></div>
        <div style={{ flex: 1 }}><div className="lbl">Remarques (manquant, abîmé, erreur)</div><div>{a.notes || ""}</div></div>
      </div>
    </div>
  );
}
