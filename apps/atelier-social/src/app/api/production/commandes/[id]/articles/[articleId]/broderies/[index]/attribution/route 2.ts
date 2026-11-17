/**
 * Attribution couleur → lettre d'une zone de broderie (texte multicolore).
 *
 * GET    …/broderies/[index]/attribution
 *   → attributions sauvegardées dans la bibliothèque du Hub (/atelier-production/attribution),
 *     celles du motif de l'article en tête.
 * POST   …/broderies/[index]/attribution
 *   { source: "moteur", texte_lignes?: string[] }
 *       Calcule depuis la commande : texte (défaut = champs de la zone), palette de la zone,
 *       règle figée du motif si elle existe (ex. YPM-004 : dates bicolores, texte bas monochrome).
 *   { source: "bibliotheque", library_id: string }
 *       Importe une attribution sauvegardée telle quelle (fils compris).
 *   Dans les 2 cas, les fils de la zone deviennent les fils réellement utilisés, dans l'ordre de broderie.
 * DELETE …/broderies/[index]/attribution → retire l'attribution.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { requireRole } from "@/lib/auth-guard";
import {
  getCommande,
  getDureesRef,
  getFichesTechniques,
  recalculerDureesCommande,
  writeCommande,
  type AttributionCouleurs,
  type Broderie,
} from "@/lib/production/commandes-loader";
import {
  ATTRIBUTIONS_LIB_PATH,
  getFils,
  getMotifs,
  getPalettes,
  type AttributionsLibraryRef,
} from "@/lib/atelier-da/referentiels-loader";
import { attribuer, attribuerPattern, type Position } from "@/lib/atelier-da/moteur-attribution";

type Params = { params: Promise<{ id: string; articleId: string; index: string }> };

function readLib(): AttributionsLibraryRef {
  return JSON.parse(readFileSync(ATTRIBUTIONS_LIB_PATH, "utf-8")) as AttributionsLibraryRef;
}

const norm = (lignes: string[]) =>
  lignes.map((l) => l.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")).filter(Boolean).join("|");

async function charger(params: Params["params"]) {
  const { id, articleId, index } = await params;
  const commande = await getCommande(id);
  if (!commande) return { err: NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 }) };
  const article = commande.articles.find((a) => a.id === articleId);
  if (!article) return { err: NextResponse.json({ ok: false, error: "Article introuvable" }, { status: 404 }) };
  const broderie = article.broderies[Number(index)];
  if (!broderie) return { err: NextResponse.json({ ok: false, error: `Broderie ${index} introuvable` }, { status: 404 }) };
  return { commande, article, broderie };
}

/** Lettres + fils utilisés → zone (fils dans l'ordre de broderie, fil principal = 1er). */
function appliquer(
  b: Broderie,
  positions: Position[],
  attribution: Record<number, string>,
  base: Omit<AttributionCouleurs, "lettres" | "genere_le">,
): string | null {
  const fils = getFils().couleurs;
  const lettres = positions.map((p, i) => ({ ligne: p.ligne, indice: p.indice, caractere: p.caractere, fil_id: attribution[i] }));
  if (lettres.some((l) => !l.fil_id)) return "Attribution incomplète (lettre sans fil).";
  const ordre: string[] = [];
  for (const l of lettres) if (!ordre.includes(l.fil_id)) ordre.push(l.fil_id);
  const resolus = ordre.map((id) => fils.find((f) => f.id === id));
  const inconnu = ordre.find((_, i) => !resolus[i]);
  if (inconnu) return `Fil ${inconnu} absent du nuancier.`;
  const ok = resolus as Array<(typeof fils)[number]>;

  b.attribution_couleurs = { ...base, lettres, genere_le: new Date().toISOString() };
  b.fil_id = ok[0].id;
  b.fil_nom = ok[0].nom;
  b.fil_hex = ok[0].hex;
  b.fil_code_gunold = ok[0].code_gunold ?? "";
  for (const c of b.champs) c.fil_id = ok[0].id;
  b.fil_id_secondaire = undefined;
  b.fil_nom_secondaire = undefined;
  b.fil_hex_secondaire = undefined;
  b.fil_code_gunold_secondaire = undefined;
  if (ok.length > 1) {
    b.fils_palette = ok.map((f) => ({ fil_id: f.id, fil_nom: f.nom, fil_hex: f.hex, fil_code_gunold: f.code_gunold ?? "" }));
  } else {
    b.fils_palette = undefined;
    b.duree_changement_fil_min = 0;
  }
  return null;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const r = await charger(params);
    if ("err" in r) return r.err;
    const palettes = getPalettes().palettes;
    const fils = getFils().couleurs;
    const ypm = r.article.ypm_id;
    const entries = readLib().attributions
      .map((a) => ({
        id: a.id,
        name: a.name,
        motif_id: a.motif_id ?? null,
        texte_lignes: a.texte_lignes,
        couleurs: a.mode === "palette"
          ? palettes.find((p) => p.id === a.palette_id)?.nom ?? a.palette_id ?? ""
          : fils.find((f) => f.id === a.couleur_id)?.nom ?? "mono",
        created_at: a.created_at,
        meme_motif: Boolean(ypm && a.motif_id === ypm),
      }))
      .sort((a, b) => Number(b.meme_motif) - Number(a.meme_motif) || b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ ok: true, data: entries });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  const bad = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });
  try {
    const r = await charger(params);
    if ("err" in r) return r.err;
    const { commande, article, broderie: b } = r;
    if (commande.statut === "archivee") return NextResponse.json({ ok: false, error: "Commande archivée : désarchive-la avant de la modifier." }, { status: 409 });

    const body = (await req.json()) as { source?: string; texte_lignes?: unknown; library_id?: string };
    let avertissement: string | undefined;

    if (body.source === "bibliotheque") {
      const entry = readLib().attributions.find((a) => a.id === body.library_id);
      if (!entry) return bad(`Attribution ${body.library_id} introuvable dans la bibliothèque.`);
      if (!entry.result?.positions?.length) return bad("Cette attribution ne contient aucune lettre.");
      const err = appliquer(b, entry.result.positions, entry.result.attribution, {
        source: "bibliotheque",
        library_id: entry.id,
        library_name: entry.name,
        mode: entry.mode === "mono" ? "mono" : "moteur",
        texte_lignes: entry.texte_lignes,
        score: entry.result.score,
      });
      if (err) return bad(err);
      const pal = entry.mode === "palette" ? getPalettes().palettes.find((p) => p.id === entry.palette_id) : undefined;
      b.palette_id = pal?.id;
      b.palette_nom = pal?.nom;
      b.palette_type = pal?.type;
      const texteZone = b.champs.map((c) => c.valeur);
      if (norm(entry.texte_lignes) !== norm(texteZone)) {
        avertissement = `Texte différent de la commande : bibliothèque « ${entry.texte_lignes.join(" / ")} » vs commande « ${texteZone.filter((t) => t.trim()).join(" / ")} ».`;
      }
      if (entry.motif_id && article.ypm_id && entry.motif_id !== article.ypm_id) {
        avertissement = [avertissement, `Attribution faite pour ${entry.motif_id}, l'article est en ${article.ypm_id}.`].filter(Boolean).join(" ");
      }
    } else if (body.source === "moteur") {
      const lignes = (Array.isArray(body.texte_lignes) ? body.texte_lignes : b.champs.map((c) => c.valeur))
        .filter((l): l is string => typeof l === "string")
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lignes.length) return bad("Aucun texte à attribuer.");
      if (lignes.length > 4) return bad("4 lignes maximum.");

      const pal = b.palette_id ? getPalettes().palettes.find((p) => p.id === b.palette_id) : undefined;
      const palette = pal?.fils ?? (b.fils_palette ?? []).map((f) => f.fil_id);
      if (palette.length < 2) return bad("Choisis d'abord une palette (camaïeu / multicolore) pour cette zone.");
      const paletteId = pal?.id ?? "zone";

      const motif = article.ypm_id ? (await getMotifs()).motifs.find((m) => m.id === article.ypm_id) : undefined;
      const pattern = motif?.bible?.distribution_pattern;
      let result;
      if (pattern) {
        if (palette.length < pattern.fils_order.length) {
          return bad(`${motif!.id} demande ${pattern.fils_order.length} fils, la palette ${pal?.nom ?? ""} n'en a que ${palette.length}.`);
        }
        result = attribuerPattern(lignes, pattern, `pattern_${motif!.id}`, palette);
      } else {
        result = attribuer({ texte_lignes: lignes, palette, palette_id: paletteId });
      }
      if (result.violations_dures.length && !Object.keys(result.attribution).length) {
        return bad(result.violations_dures.join(" · "));
      }
      const err = appliquer(b, result.positions, result.attribution, {
        source: "moteur",
        mode: pattern ? "pattern" : "moteur",
        texte_lignes: lignes,
        score: Number.isFinite(result.score) ? result.score : undefined,
      });
      if (err) return bad(err);
      if (result.violations_dures.length) avertissement = `Règles non respectées : ${result.violations_dures.join(" · ")}`;
    } else {
      return bad('source attendue : "moteur" ou "bibliotheque".');
    }

    recalculerDureesCommande(commande, getDureesRef(), getFichesTechniques());
    await writeCommande(commande);
    return NextResponse.json({ ok: true, data: commande, avertissement });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireRole(["admin", "prod"]);
  if (!auth) return NextResponse.json({ ok: false, error: "Accès réservé à l'atelier." }, { status: 403 });
  try {
    const r = await charger(params);
    if ("err" in r) return r.err;
    r.broderie.attribution_couleurs = undefined;
    await writeCommande(r.commande);
    return NextResponse.json({ ok: true, data: r.commande });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
