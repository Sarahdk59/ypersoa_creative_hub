/**
 * Dossier technique de production — 1 commande, imprimable A4.
 *
 * Objectif : zéro question pour les opérateurs. Couverture (note atelier,
 * expédition + étiquette, planning machine, récap, BAT, journal à signer),
 * puis 1 page par article : réf. produit Akanea, visuel + bible du motif,
 * et par zone : cadre, texte rendu dans la police, fil (code Gunold + aiguille),
 * fichiers machine (DST / PXF), cases de contrôle.
 *
 * Bloqué tant que la commande est incomplète (manquesCommande / manquesArticle),
 * sauf aperçu explicite (?apercu=1), marqué « INCOMPLET ».
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findFicheTechnique,
  getCommande,
  getFichesTechniques,
  getSkuMapping,
  type AdressePostale,
  type Article,
  type Broderie,
} from "@/lib/production/commandes-loader";
import { couleursPourProduit, getCouleursAjouts, zoneTete } from "@/lib/production/catalogue";
import {
  manquesArticle,
  manquesCommande,
  MODE_LIVRAISON_LABEL,
  TYPE_DOCUMENT_LABEL,
  SOURCE_LABEL,
  sansTransporteur,
} from "@/lib/production/completude";
import {
  getFils,
  getMotifProdFilePublicUrl,
  getMotifs,
  type MotifProdFile,
  type MotifYpm,
} from "@/lib/atelier-da/referentiels-loader";
import { motifImageSrc } from "@/lib/atelier-da/motif-image";
import PrintBar from "../packing-list/PrintBar";
import { filDeZone, filsBroderie, lettresParLigne, ordreFilsAttribution, policeChamp, policesBroderie } from "@/lib/production/broderie-utils";

export const dynamic = "force-dynamic";

// ── Rendu des polices (aperçu indicatif, cf. match Tajima → Google Fonts) ──
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=Nunito:wght@900&family=Fredoka:wght@600;700&family=Cinzel:wght@700&family=Josefin+Sans:wght@700&family=Allura&display=swap";

function fontFor(police?: string): string {
  const p = (police ?? "").toLowerCase();
  if (/russ|playfair/.test(p)) return '"Playfair Display", serif';
  if (/arial rounded|nunito/.test(p)) return '"Arial Rounded MT Bold", "Nunito", sans-serif';
  if (/looney|fredoka/.test(p)) return '"Fredoka", system-ui, sans-serif';
  if (/diana|cinzel/.test(p)) return '"Cinzel", serif';
  if (/museo|josefin/.test(p)) return '"Josefin Sans", sans-serif';
  if (/script|allura/.test(p)) return '"Allura", cursive';
  return "Georgia, serif";
}

function dateFr(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function slug(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]+/g, "");
}

/** Fichiers machine du motif qui correspondent au texte brodé (clé = lettre, année, prénom…). */
function fichiersPourBroderie(b: Broderie, motif?: MotifYpm): MotifProdFile[] {
  if (!motif?.prod_files?.length) return [];
  const cles = new Set<string>();
  for (const c of b.champs) {
    if (c.valeur.trim()) cles.add(slug(c.valeur));
    if (c.variante_filename) cles.add(slug(c.variante_filename.replace(/\.[a-z0-9]+$/i, "").replace(motif.id, "")));
  }
  return motif.prod_files.filter((f) => cles.has(slug(f.key)));
}

function Adresse({ a }: { a: AdressePostale }) {
  return (
    <>
      <strong>{a.nom}</strong><br />
      {a.adresse_ligne1}<br />
      {a.adresse_ligne2 ? <>{a.adresse_ligne2}<br /></> : null}
      {a.code_postal} {a.ville} — {a.pays}
    </>
  );
}

export default async function DossierTechniquePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apercu?: string }>;
}) {
  const { id } = await params;
  const { apercu } = await searchParams;
  const commande = await getCommande(id);
  if (!commande) notFound();

  const manquesCmd = manquesCommande(commande);
  const manquesArt = commande.articles.map((a, i) => ({ i, a, m: manquesArticle(a) })).filter((x) => x.m.length);
  const incomplete = manquesCmd.length > 0 || manquesArt.length > 0;

  // ── Garde-fou : pas de dossier technique tant qu'une info manque ──
  if (incomplete && apercu !== "1") {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#1A1614" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500 }}>Dossier technique bloqué</h1>
        <p>La commande {commande.numero_shopify} n&apos;est pas complète : l&apos;atelier aurait des questions. Complète d&apos;abord :</p>
        <ul style={{ color: "#9A1818", lineHeight: 1.7 }}>
          {manquesCmd.length > 0 && <li><strong>Commande :</strong> {manquesCmd.join(", ")}</li>}
          {manquesArt.map(({ i, a, m }) => (
            <li key={a.id}><strong>Article {i + 1}</strong>{a.ref_article ? ` (${a.ref_article})` : ""} : {m.join(", ")}</li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 16, marginTop: 24, alignItems: "center" }}>
          <Link href={`/atelier-production/commandes/${commande.id}`} style={{ padding: "8px 16px", borderRadius: 6, background: "#1E6E77", color: "white", textDecoration: "none" }}>
            Compléter la commande
          </Link>
          <Link href={`/atelier-production/commandes/${commande.id}/dossier-technique?apercu=1`} style={{ fontSize: 12, color: "#1A1614", opacity: 0.6 }}>
            Voir un aperçu marqué « INCOMPLET »
          </Link>
        </div>
      </div>
    );
  }

  const [ajouts, motifsRef] = await Promise.all([
    getCouleursAjouts(),
    getMotifs().catch(() => null),
  ]);
  const motifsById = new Map((motifsRef?.motifs ?? []).map((m) => [m.id, m]));
  const filsById = new Map(getFils().couleurs.map((f) => [f.id, f]));
  const placements = getSkuMapping().placements;
  const fts = getFichesTechniques();

  const liv = commande.livraison;
  const docs = commande.documents ?? [];
  const bats = docs.filter((d) => d.type === "bat");
  const fichesTech = docs.filter((d) => d.type === "fiche_technique");
  const fichiersEmb = docs.filter((d) => d.type === "fichier_emb");
  const etiquettes = docs.filter((d) => d.type === "etiquette");
  const nbPieces = commande.articles.reduce((s, a) => s + (a.quantite || 1), 0);
  const articleIndex = new Map(commande.articles.map((a, i) => [a.id, i + 1]));
  const slots = [...(commande.planning?.slots ?? [])].sort((x, y) => (x.jour + x.heure_debut).localeCompare(y.jour + y.heure_debut));
  const genereLe = new Date().toISOString();

  function cadre(b: Broderie, a: Article): { titre: string; detail: string } {
    if (b.placement === "tete") {
      const z = zoneTete(a.produit_id);
      return { titre: `Tête — ${z}`, detail: z === "revers" ? "Cadre bonnet, broderie centrée sur le revers replié." : "Cadre casquette (~5-7 cm), panneau frontal de la calotte." };
    }
    const p = placements[b.placement];
    return { titre: p?.label ?? b.placement, detail: [p?.cerceau?.replace(/_/g, " "), p?.note].filter(Boolean).join(" — ") };
  }

  return (
    <div className="dt">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTS_HREF} />
      <style>{`
        .dt { max-width: 900px; margin: 0 auto; padding: 28px 24px; background: white; color: #1A1614;
              font-family: "Hanken Grotesk", system-ui, sans-serif; font-size: 12px; line-height: 1.45; }
        .dt h1 { font-family: "Newsreader", Georgia, serif; font-weight: 500; font-size: 26px; margin: 0; }
        .dt h2 { font-family: "Newsreader", Georgia, serif; font-weight: 500; font-size: 18px; margin: 18px 0 8px; }
        .dt .lbl { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; opacity: .55; margin-bottom: 4px; }
        .dt .box { border: 1px solid #D8D2C8; border-radius: 6px; padding: 10px 12px; }
        .dt table { width: 100%; border-collapse: collapse; }
        .dt th { text-align: left; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; padding: 4px 6px; border-bottom: 1px solid #1A1614; }
        .dt td { padding: 5px 6px; vertical-align: top; border-bottom: 1px solid #ECE7DF; }
        .dt .ref { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
        .dt .sw { display: inline-block; width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,.25); vertical-align: -2px; margin-right: 5px; }
        .dt .chk { display: inline-flex; align-items: center; gap: 6px; margin-right: 16px; }
        .dt .chk::before { content: ""; width: 13px; height: 13px; border: 1.5px solid #1A1614; border-radius: 3px; display: inline-block; }
        .dt .page { break-before: page; padding-top: 6px; }
        .dt .zone { border: 1.5px solid #1A1614; border-radius: 6px; margin-bottom: 12px; break-inside: avoid; }
        .dt .zone-head { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; background: #F4EEE2; border-radius: 5px 5px 0 0; }
        .dt .incomplet { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 90px; font-weight: 800;
                         color: rgba(194,58,45,.12); transform: rotate(-24deg); pointer-events: none; z-index: 0; }
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
          .dt { padding: 0; max-width: none; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {incomplete && <div className="incomplet">INCOMPLET</div>}
      <PrintBar commandeId={commande.id} incomplete={incomplete} />

      {/* ═════════════ COUVERTURE ═════════════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #1A1614", paddingBottom: 10, marginBottom: 14 }}>
        <div>
          <div className="lbl">Ypersoa · Dossier technique de production</div>
          <h1>Commande {commande.numero_shopify}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Source : <strong>{SOURCE_LABEL[commande.source] ?? "Shopify"}</strong>{commande.priorite === "urgente" ? <strong style={{ color: "#C23A2D" }}> · URGENTE</strong> : null}</div>
          <div>Commandée le <strong>{dateFr(commande.date_commande)}</strong> · intégrée au Hub le <strong>{dateFr(commande.created_at)}</strong></div>
          <div>{commande.articles.length} article(s) · {nbPieces} pièce(s) · {Math.round(commande.duree_total_min)} min de prod estimées</div>
          <div style={{ opacity: 0.55, fontSize: 10 }}>Dossier généré le {dateFr(genereLe)} à {genereLe.slice(11, 16)} UTC</div>
        </div>
      </div>

      {commande.notes?.trim() && (
        <div style={{ border: "2px solid #1A1614", background: "#FEF6E0", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
          <div className="lbl" style={{ opacity: 0.8 }}>⚠ Note pour l&apos;atelier — à lire avant de broder</div>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "pre-wrap" }}>{commande.notes}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, marginBottom: 14 }}>
        <div className="box">
          <div className="lbl">Expédition</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            {!sansTransporteur(liv) && <><strong>{liv?.transporteur ?? "—"}</strong> · </>}<strong>{liv?.mode ? MODE_LIVRAISON_LABEL[liv.mode] : "—"}</strong>
          </div>
          {liv?.point_relais && <div>{liv.mode === "locker" ? "Locker" : "Point relais"} : <strong>{liv.point_relais}</strong></div>}
          {liv?.numero_suivi && <div>Suivi : <span className="ref">{liv.numero_suivi}</span></div>}
          <div style={{ marginTop: 6 }}><Adresse a={commande.expedition} /></div>
          <div style={{ marginTop: 6 }}>
            Étiquette :{" "}
            {etiquettes.length
              ? etiquettes.map((e) => <span key={e.id}><strong>{e.filename}</strong> (jointe au dossier{e.mime === "application/pdf" ? " — à imprimer" : ""}) </span>)
              : <strong style={{ color: "#9A4400" }}>pas encore jointe</strong>}
          </div>
        </div>
        <div className="box">
          <div className="lbl">Facturation & contact</div>
          {JSON.stringify(commande.facturation) === JSON.stringify(commande.expedition)
            ? <div style={{ opacity: 0.7 }}>Facturation identique à l&apos;expédition</div>
            : <Adresse a={commande.facturation} />}
          <div style={{ marginTop: 6 }}>Mail : <strong>{commande.contact?.email ?? "—"}</strong></div>
          <div>Tél. : <strong>{commande.contact?.telephone ?? "—"}</strong></div>
        </div>
      </div>

      <h2>Récapitulatif</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Réf. produit</th><th>Produit</th><th>Couleur</th><th>Taille</th><th>Qté</th><th>Motif</th><th>Zones</th></tr>
        </thead>
        <tbody>
          {commande.articles.map((a, i) => (
            <tr key={a.id}>
              <td>{i + 1}</td>
              <td className="ref">{a.ref_article ?? "—"}</td>
              <td>{a.produit_nom}</td>
              <td>{a.code_couleur} · {a.couleur_support}</td>
              <td><strong>{a.taille}</strong></td>
              <td><strong>{a.quantite}</strong></td>
              <td>{a.ypm_id.replace("-", "")} · {a.ypm_nom}</td>
              <td>{a.broderies.map((b) => cadre(b, a).titre).join(" + ")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Planning machine</h2>
      {slots.length ? (
        <table>
          <thead><tr><th>Jour</th><th>Heure</th><th>Machine</th><th>Article</th><th>Durée</th></tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td>{dateFr(s.jour)}</td>
                <td>{s.heure_debut} → {s.heure_fin}</td>
                <td><strong>{s.machine}</strong></td>
                <td>Article {articleIndex.get(s.article_id) ?? "?"}</td>
                <td>{s.duree_min} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ opacity: 0.6 }}>Pas encore planifiée — générer le planning depuis la fiche commande.</div>
      )}

      {(fichesTech.length > 0 || fichiersEmb.length > 0) && (
        <>
          <h2>Fichiers broderie</h2>
          <div className="box">
            {fichesTech.map((d) => (
              <div key={d.id}>Fiche technique : <strong>{d.filename}</strong> — à imprimer et joindre</div>
            ))}
            {fichiersEmb.map((d) => (
              <div key={d.id}>Fichier Hatch : <strong>{d.filename}</strong> — à ouvrir dans Hatch (dossier de la commande dans le Hub)</div>
            ))}
          </div>
        </>
      )}

      {bats.length > 0 && (
        <>
          <h2>BAT validé(s)</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {bats.map((d) =>
              d.mime.startsWith("image/") ? (
                <figure key={d.id} style={{ margin: 0, textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.public_url} alt={`BAT ${d.filename}`} style={{ maxHeight: 220, maxWidth: 400, border: "1px solid #D8D2C8", borderRadius: 4 }} />
                  <figcaption style={{ fontSize: 9, opacity: 0.6 }}>{d.filename}</figcaption>
                </figure>
              ) : (
                <div key={d.id} className="box">BAT PDF : <strong>{d.filename}</strong> — à imprimer et joindre</div>
              ),
            )}
          </div>
        </>
      )}

      {docs.length > 0 && (
        <div style={{ marginTop: 10, opacity: 0.7 }}>
          Pièces du dossier : {docs.map((d) => `${TYPE_DOCUMENT_LABEL[d.type] ?? d.type} (${d.filename})`).join(" · ")}
        </div>
      )}

      <h2>Suivi de production</h2>
      <table>
        <thead><tr><th style={{ width: "26%" }}>Étape</th><th>Par</th><th>Le</th><th>Visa</th></tr></thead>
        <tbody>
          {([
            ["Fichier DST préparé", commande.journal?.dst],
            ["Broderie", commande.journal?.broderie],
            ["Contrôle qualité", commande.journal?.cq],
            ["Expédition", commande.journal?.expedition],
          ] as const).map(([label, e]) => (
            <tr key={label}>
              <td><span className="chk">{label}</span></td>
              <td style={{ height: 22 }}>{e?.par ?? ""}</td>
              <td>{e?.le ? dateFr(e.le) : ""}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═════════════ 1 PAGE PAR ARTICLE ═════════════ */}
      {commande.articles.map((a, i) => {
        const motif = motifsById.get(a.ypm_id);
        const bible = motif?.bible;
        const couleur = a.produit_id ? couleursPourProduit(a.produit_id, ajouts).find((c) => c.code === a.code_couleur) : undefined;
        const regles = (bible?.regles_validation ?? "").split("\n").map((r) => r.trim()).filter(Boolean);
        return (
          <section className="page" key={a.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 14, borderBottom: "2px solid #1A1614", paddingBottom: 10, marginBottom: 12 }}>
              <div>
                <div className="lbl">Commande {commande.numero_shopify} · Article {i + 1}/{commande.articles.length}</div>
                <div className="ref" style={{ fontSize: 24 }}>{a.ref_article ?? "réf. à compléter"}</div>
                <div style={{ fontSize: 14 }}>{a.produit_nom} <span style={{ opacity: 0.6 }}>({a.produit_id})</span></div>
                <div style={{ display: "flex", gap: 22, marginTop: 8, fontSize: 14 }}>
                  <div><div className="lbl">Couleur produit</div>{couleur?.hex && <span className="sw" style={{ background: couleur.hex }} />}<strong>{a.code_couleur}</strong> · {couleur?.libelle ?? a.couleur_support}</div>
                  <div><div className="lbl">Taille</div><strong style={{ fontSize: 18 }}>{a.taille}</strong></div>
                  <div><div className="lbl">Quantité</div><strong style={{ fontSize: 18 }}>{a.quantite}</strong></div>
                  <div><div className="lbl">Motif</div><strong>{a.ypm_id.replace("-", "")}</strong> · {a.ypm_nom}</div>
                </div>
              </div>
              {motif && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={motifImageSrc(motif.asset_principal, motif.asset_principal_url)} alt={motif.nom_commercial}
                     style={{ width: 150, height: 150, objectFit: "contain", border: "1px solid #D8D2C8", borderRadius: 6, background: "#FAF7F2" }} />
              )}
            </div>

            {bible && (
              <div className="box" style={{ marginBottom: 12 }}>
                <div className="lbl">Fiche motif {a.ypm_id}</div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {bible.dimensions_cm && <div>Dimensions : <strong>{bible.dimensions_cm.largeur} × {bible.dimensions_cm.hauteur} cm</strong></div>}
                  {bible.nb_couleurs_max != null && <div>Couleurs max : <strong>{bible.nb_couleurs_max}</strong></div>}
                  {bible.composition && <div>Composition : {bible.composition}</div>}
                  {bible.typographie && <div>Typo motif : {bible.typographie}</div>}
                </div>
                {regles.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{regles.map((r, k) => <li key={k}>{r}</li>)}</ul>
                )}
                {bible.notes_prod && <div style={{ marginTop: 6, fontStyle: "italic" }}>{bible.notes_prod}</div>}
              </div>
            )}

            {a.broderies.map((b, j) => {
              const c = cadre(b, a);
              const fil = filsById.get(b.fil_id);
              const filSec = b.fil_id_secondaire ? filsById.get(b.fil_id_secondaire) : undefined;
              const fichiers = fichiersPourBroderie(b, motif);
              const ftPoints = b.champs.map((ch) => findFicheTechnique(fts, ch.variante_filename)).find(Boolean);
              const visuels = (b.fichiers ?? []).filter((f) => f.kind === "visuel");
              const autresFichiers = (b.fichiers ?? []).filter((f) => f.kind !== "visuel");
              return (
                <div className="zone" key={j}>
                  <div className="zone-head">
                    <div>
                      <div className="lbl">Zone {j + 1}/{a.broderies.length} · Emplacement</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{c.titre}</div>
                      {c.detail && <div style={{ opacity: 0.7 }}>{c.detail}</div>}
                      {b.placement === "poignet" && bible?.template_poignet && <div>Template poignet : <strong>{bible.template_poignet}</strong></div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="lbl">Temps</div>
                      <div>broderie {b.duree_broderie_min} min · cadrage {b.duree_cadrage_min} min</div>
                      {ftPoints && <div>{ftPoints.nb_points} points ({ftPoints.dimensions_mm.largeur}×{ftPoints.dimensions_mm.hauteur} mm)</div>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, padding: "10px 12px" }}>
                    <div>
                      <div className="lbl">À broder {policesBroderie(b).length ? `· police${policesBroderie(b).length > 1 ? "s" : ""} ${policesBroderie(b).join(" + ")}` : ""}</div>
                      {b.champs.filter((ch) => ch.valeur.trim()).map((ch, k) => (
                        <div key={k} style={{ marginBottom: 6 }}>
                          <div style={{ opacity: 0.55, fontSize: 10 }}>
                            {ch.label} — exactement : « <span className="ref">{ch.valeur}</span> » ({ch.valeur.length} caractère{ch.valeur.length > 1 ? "s" : ""})
                            {policesBroderie(b).length > 1 && policeChamp(b, ch) && <> · police <strong>{policeChamp(b, ch)}</strong></>}
                          </div>
                          <div style={{
                            fontFamily: fontFor(policeChamp(b, ch)), fontSize: 30, lineHeight: 1.2, textShadow: "0 0 1px rgba(0,0,0,.35)",
                            ...(filsBroderie(b).length > 1 && b.fils_palette?.length
                              ? { backgroundImage: `linear-gradient(90deg, ${filsBroderie(b).map((f) => f.fil_hex).join(", ")})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", display: "inline-block" }
                              : { color: b.fil_hex || "#1A1614" }),
                          }}>
                            {ch.valeur}
                          </div>
                        </div>
                      ))}
                      {b.attribution_couleurs && (() => {
                        const att = b.attribution_couleurs;
                        const ordre = ordreFilsAttribution(att);
                        return (
                          <div style={{ margin: "8px 0", padding: "8px 10px", border: "1px solid #1A1614", borderRadius: 6 }}>
                            <div className="lbl">Couleur par lettre · n° = ordre de broderie {att.source === "bibliotheque" ? `· ${att.library_name ?? ""}` : ""}</div>
                            {lettresParLigne(att).map((ls, k) => (
                              <div key={k} style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 4 }}>
                                {ls.map((l) => {
                                  const f = filDeZone(b, l.fil_id);
                                  return (
                                    <div key={l.indice} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 22 }}>
                                      <span style={{ fontFamily: fontFor(policesBroderie(b)[0]), fontSize: 30, lineHeight: 1, color: f?.fil_hex ?? "#1A1614", textShadow: "0 0 1px rgba(0,0,0,.35)" }}>{l.caractere}</span>
                                      <strong className="ref" style={{ fontSize: 11 }}>{ordre.indexOf(l.fil_id) + 1}</strong>
                                      <span style={{ fontSize: 8, opacity: 0.6 }}>{f?.fil_code_gunold}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
                              {ordre.map((id, k) => {
                                const f = filDeZone(b, id);
                                const ls = att.lettres.filter((l) => l.fil_id === id);
                                return (
                                  <div key={id} style={{ fontSize: 11 }}>
                                    <strong className="ref">{k + 1}.</strong> <span className="sw" style={{ background: f?.fil_hex }} /><strong className="ref">{f?.fil_code_gunold}</strong> · {f?.fil_nom}
                                    {" "}<span style={{ opacity: 0.65 }}>→ {ls.map((l) => `${l.caractere}(L${l.ligne + 1})`).join(" ")}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ fontSize: 9, opacity: 0.5 }}>Rendu de police indicatif — le fichier machine fait foi.</div>
                      {b.note_atelier && <div style={{ marginTop: 6, fontWeight: 600 }}>Note : {b.note_atelier}</div>}
                    </div>
                    <div>
                      <div className="lbl">{b.fils_palette?.length ? `Palette ${b.palette_nom ?? ""} · ${b.fils_palette.length} fils (${b.palette_type ?? ""})` : "Fil"}</div>
                      {b.fils_palette?.length ? (
                        b.fils_palette.map((f, k) => {
                          const ref = filsById.get(f.fil_id);
                          return (
                            <div key={k} style={{ fontSize: 13 }}>
                              <span style={{ opacity: 0.5 }}>{k + 1}. </span>
                              <span className="sw" style={{ background: f.fil_hex }} /><strong className="ref">{f.fil_code_gunold}</strong> · {f.fil_nom}
                              {ref?.numero_aiguille_canonique != null && <> · aiguille n° <strong>{ref.numero_aiguille_canonique}</strong></>}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div style={{ fontSize: 14 }}>
                            <span className="sw" style={{ background: b.fil_hex }} /><strong className="ref" style={{ fontSize: 16 }}>{b.fil_code_gunold}</strong> · {b.fil_nom}
                          </div>
                          {fil?.numero_aiguille_canonique != null && <div>Aiguille n° <strong>{fil.numero_aiguille_canonique}</strong></div>}
                          {b.fil_code_gunold_secondaire && (
                            <div style={{ marginTop: 4 }}>
                              + <span className="sw" style={{ background: b.fil_hex_secondaire }} /><strong className="ref">{b.fil_code_gunold_secondaire}</strong> · {b.fil_nom_secondaire}
                              {filSec?.numero_aiguille_canonique != null && <> · aiguille n° <strong>{filSec.numero_aiguille_canonique}</strong></>}
                            </div>
                          )}
                        </>
                      )}
                      <div className="lbl" style={{ marginTop: 10 }}>Fichier machine</div>
                      {fichiers.length ? fichiers.map((f) => (
                        <div key={f.key}>
                          {f.dst && <div>DST : <a className="ref" href={getMotifProdFilePublicUrl("dst", f.dst)}>{f.dst}</a></div>}
                          {f.pxf && <div>PXF : <a className="ref" href={getMotifProdFilePublicUrl("pxf", f.pxf)}>{f.pxf}</a></div>}
                        </div>
                      )) : bible?.fichier_dst || bible?.fichier_pxf ? (
                        <div>
                          {bible.fichier_dst && <div>DST : <span className="ref">{bible.fichier_dst}</span></div>}
                          {bible.fichier_pxf && <div>PXF : <span className="ref">{bible.fichier_pxf}</span></div>}
                        </div>
                      ) : null}
                      {autresFichiers.map((f) => (
                        <div key={f.id}>{f.kind.toUpperCase()} commande : <a className="ref" href={f.public_url}>{f.filename}</a></div>
                      ))}
                      {!fichiers.length && !bible?.fichier_dst && !bible?.fichier_pxf && !autresFichiers.length && (
                        <div style={{ color: "#9A4400", fontWeight: 600 }}>Fichier à programmer (texte personnalisé)</div>
                      )}
                    </div>
                  </div>
                  {visuels.length > 0 && (
                    <div style={{ display: "flex", gap: 8, padding: "0 12px 10px", flexWrap: "wrap" }}>
                      {visuels.map((v) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={v.id} src={v.public_url} alt={v.filename} style={{ maxHeight: 140, maxWidth: 220, border: "1px solid #D8D2C8", borderRadius: 4 }} />
                      ))}
                    </div>
                  )}
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #ECE7DF" }}>
                    <span className="chk">Fichier chargé</span>
                    <span className="chk">Fil {b.fil_code_gunold} monté</span>
                    <span className="chk">Emplacement vérifié</span>
                    <span className="chk">Brodé</span>
                    <span className="chk">CQ OK</span>
                  </div>
                </div>
              );
            })}

            {a.notes && <div className="box" style={{ fontStyle: "italic" }}>Note article : {a.notes}</div>}
          </section>
        );
      })}
    </div>
  );
}
