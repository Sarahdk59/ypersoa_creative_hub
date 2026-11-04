/**
 * Packing list atelier — 1 commande, imprimable A4 (Cmd+P).
 *
 * Tout ce qu'il faut pour préparer et broder sans poser de question :
 * expédition (transporteur, locker / relais), facturation, contact, dates,
 * puis par article : réf. produit Akanea, motif, couleur produit, taille, et
 * par zone : emplacement, texte, police, fil (code Gunold).
 *
 * Server component : lit la commande et le catalogue directement.
 */
import { notFound } from "next/navigation";
import { getCommande, type AdressePostale, type Article, type Broderie } from "@/lib/production/commandes-loader";
import { couleursPourProduit, getCouleursAjouts, zoneTete } from "@/lib/production/catalogue";
import { manquesArticle, manquesCommande, MODE_LIVRAISON_LABEL } from "@/lib/production/completude";
import PrintBar from "./PrintBar";

export const dynamic = "force-dynamic";

function dateFr(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function emplacement(b: Broderie, a: Article): string {
  switch (b.placement) {
    case "tete": return `Tête — ${zoneTete(a.produit_id)}`;
    case "buste": return "Buste — cœur gauche";
    case "dos": return "Dos — entre omoplates";
    case "poignet": return "Poignet";
    case "nuque": return "Nuque";
    default: return b.placement;
  }
}

function Adresse({ a }: { a: AdressePostale }) {
  return (
    <>
      <strong>{a.nom}</strong><br />
      {a.adresse_ligne1}<br />
      {a.adresse_ligne2 ? <>{a.adresse_ligne2}<br /></> : null}
      {a.code_postal} {a.ville}<br />
      {a.pays}
    </>
  );
}

const Manque = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: "#9A1818", fontWeight: 600 }}>{children}</span>
);

export default async function PackingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commande = await getCommande(id);
  if (!commande) notFound();

  const ajouts = await getCouleursAjouts();
  const manquesCmd = manquesCommande(commande);
  const manquesArt = commande.articles.map((a) => ({ a, m: manquesArticle(a) })).filter((x) => x.m.length);
  const incomplete = manquesCmd.length > 0 || manquesArt.length > 0;
  const liv = commande.livraison;
  const nbPieces = commande.articles.reduce((s, a) => s + (a.quantite || 1), 0);
  const memeAdresse = JSON.stringify(commande.facturation) === JSON.stringify(commande.expedition);

  return (
    <div className="pl">
      <style>{`
        .pl { max-width: 900px; margin: 0 auto; padding: 28px 24px; background: white; color: #1A1614;
              font-family: "Hanken Grotesk", system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
        .pl h1 { font-family: "Newsreader", Georgia, serif; font-weight: 500; font-size: 26px; margin: 0; }
        .pl .lbl { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .55; margin-bottom: 4px; }
        .pl .box { border: 1px solid #D8D2C8; border-radius: 6px; padding: 10px 12px; }
        .pl table { width: 100%; border-collapse: collapse; }
        .pl th { text-align: left; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; padding: 4px 6px; border-bottom: 1px solid #1A1614; }
        .pl td { padding: 6px; vertical-align: top; border-bottom: 1px solid #ECE7DF; }
        .pl .art { border: 1.5px solid #1A1614; border-radius: 6px; margin-bottom: 14px; break-inside: avoid; }
        .pl .art-head { display: grid; grid-template-columns: 28px 1.6fr 1.1fr .6fr 1.4fr; gap: 8px; padding: 10px 12px; background: #F4EEE2; border-radius: 5px 5px 0 0; }
        .pl .ref { font-family: ui-monospace, Menlo, monospace; font-size: 14px; font-weight: 700; }
        .pl .chk { width: 16px; height: 16px; border: 1.5px solid #1A1614; border-radius: 3px; display: inline-block; }
        .pl .sw { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); vertical-align: -1px; margin-right: 5px; }
        .pl .txt { font-size: 15px; font-weight: 700; }
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
          .pl { padding: 0; max-width: none; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <PrintBar commandeId={commande.id} incomplete={incomplete} />

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #1A1614", paddingBottom: 10, marginBottom: 14 }}>
        <div>
          <div className="lbl">Ypersoa · Packing list atelier</div>
          <h1>Commande {commande.numero_shopify}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Source : <strong>{commande.source === "etsy" ? "Etsy" : commande.source === "manuel" ? "Manuel" : "Shopify"}</strong>{commande.priorite === "urgente" ? <strong style={{ color: "#C23A2D" }}> · URGENTE</strong> : null}</div>
          <div>Commandée le <strong>{dateFr(commande.date_commande)}</strong></div>
          <div>Intégrée au Hub le <strong>{dateFr(commande.created_at)}</strong></div>
          <div>{commande.articles.length} article(s) · {nbPieces} pièce(s)</div>
        </div>
      </div>

      {incomplete && (
        <div style={{ border: "1.5px solid #9A1818", background: "#FBE9E7", color: "#9A1818", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
          <strong>Packing list incomplète — à compléter dans la fiche commande avant de lancer la prod.</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {manquesCmd.length > 0 && <li>Commande : {manquesCmd.join(", ")}</li>}
            {manquesArt.map(({ a, m }) => (
              <li key={a.id}>Article {commande.articles.indexOf(a) + 1}{a.ref_article ? ` (${a.ref_article})` : ""} : {m.join(", ")}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expédition / facturation / contact */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div className="box">
          <div className="lbl">Expédition</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {liv?.transporteur ? <strong>{liv.transporteur}</strong> : <Manque>Transporteur ?</Manque>}
            {" · "}
            {liv?.mode ? <strong>{MODE_LIVRAISON_LABEL[liv.mode]}</strong> : <Manque>Mode ?</Manque>}
          </div>
          {(liv?.mode === "locker" || liv?.mode === "point_relais") && (
            <div style={{ marginBottom: 6 }}>
              {liv.mode === "locker" ? "Locker" : "Point relais"} : {liv.point_relais ? <strong>{liv.point_relais}</strong> : <Manque>à compléter</Manque>}
            </div>
          )}
          {liv?.numero_suivi && <div style={{ marginBottom: 6 }}>Suivi : <strong style={{ fontFamily: "ui-monospace, monospace" }}>{liv.numero_suivi}</strong></div>}
          <Adresse a={commande.expedition} />
        </div>
        <div className="box">
          <div className="lbl">Facturation</div>
          {memeAdresse ? <span style={{ opacity: 0.7 }}>Identique à l&apos;expédition</span> : <Adresse a={commande.facturation} />}
        </div>
        <div className="box">
          <div className="lbl">Contact client</div>
          <div>Mail : {commande.contact?.email ? <strong>{commande.contact.email}</strong> : <span style={{ opacity: 0.5 }}>—</span>}</div>
          <div>Tél. : {commande.contact?.telephone ? <strong>{commande.contact.telephone}</strong> : <span style={{ opacity: 0.5 }}>—</span>}</div>
          {!commande.contact?.email && !commande.contact?.telephone && <div style={{ marginTop: 4 }}><Manque>Aucun contact</Manque></div>}
        </div>
      </div>

      {/* Articles à broder */}
      <div className="lbl" style={{ fontSize: 10, marginBottom: 8 }}>Articles à broder</div>
      {commande.articles.map((a, i) => {
        const couleur = a.produit_id ? couleursPourProduit(a.produit_id, ajouts).find((c) => c.code === a.code_couleur) : undefined;
        return (
          <div className="art" key={a.id}>
            <div className="art-head">
              <span className="chk" />
              <div>
                <div className="lbl">Article {i + 1} · Réf. produit</div>
                <div className="ref">{a.ref_article ?? <Manque>à compléter</Manque>}</div>
                <div>{a.produit_nom} {a.produit_id && <span style={{ opacity: 0.6 }}>({a.produit_id})</span>}</div>
              </div>
              <div>
                <div className="lbl">Couleur produit</div>
                {a.code_couleur ? (
                  <div>
                    {couleur?.hex && <span className="sw" style={{ background: couleur.hex }} />}
                    <strong>{a.code_couleur}</strong> · {couleur?.libelle ?? a.couleur_support}
                  </div>
                ) : (
                  <Manque>? ({a.couleur_support || "vide"})</Manque>
                )}
              </div>
              <div>
                <div className="lbl">Taille</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{a.code_taille ? a.taille : <Manque>? {a.taille}</Manque>}</div>
                <div style={{ opacity: 0.6 }}>× {a.quantite}</div>
              </div>
              <div>
                <div className="lbl">Motif</div>
                {a.ypm_id ? <div><strong>{a.ypm_id.replace("-", "")}</strong> · {a.ypm_nom}</div> : <Manque>à compléter</Manque>}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Emplacement</th>
                  <th>Texte / élément à broder</th>
                  <th style={{ width: "17%" }}>Police</th>
                  <th style={{ width: "24%" }}>Fil (réf. Gunold)</th>
                </tr>
              </thead>
              <tbody>
                {a.broderies.map((b, j) => (
                  <tr key={j}>
                    <td><strong>{emplacement(b, a)}</strong></td>
                    <td>
                      {b.champs.filter((c) => c.valeur.trim()).map((c, k) => (
                        <div key={k}>
                          <span style={{ opacity: 0.55 }}>{c.label} : </span>
                          <span className="txt">{c.valeur}</span>
                        </div>
                      ))}
                      {!b.champs.some((c) => c.valeur.trim()) && <Manque>texte ?</Manque>}
                      {b.note_atelier && <div style={{ fontStyle: "italic", opacity: 0.7, marginTop: 2 }}>{b.note_atelier}</div>}
                    </td>
                    <td>{b.police ? <strong>{b.police}</strong> : <Manque>?</Manque>}</td>
                    <td>
                      {b.fil_code_gunold ? (
                        <div><span className="sw" style={{ background: b.fil_hex }} /><strong>{b.fil_code_gunold}</strong> · {b.fil_nom}</div>
                      ) : (
                        <Manque>? {b.fil_nom}</Manque>
                      )}
                      {b.fil_code_gunold_secondaire && (
                        <div><span className="sw" style={{ background: b.fil_hex_secondaire }} /><strong>{b.fil_code_gunold_secondaire}</strong> · {b.fil_nom_secondaire}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {a.notes && <div style={{ padding: "6px 12px", fontStyle: "italic", opacity: 0.7 }}>Note : {a.notes}</div>}
          </div>
        );
      })}

      {commande.notes && (
        <div className="box" style={{ marginBottom: 14 }}>
          <div className="lbl">Notes commande</div>
          {commande.notes}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 18 }}>
        {["Préparé par", "Brodé par", "Contrôlé (CQ) par"].map((l) => (
          <div key={l} className="box" style={{ height: 52 }}>
            <div className="lbl">{l}</div>
            <div style={{ marginTop: 14, opacity: 0.4 }}>__________ le ___/___/______</div>
          </div>
        ))}
      </div>
    </div>
  );
}
