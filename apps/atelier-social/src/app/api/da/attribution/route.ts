/**
 * POST /api/da/attribution
 * Lance le moteur d'attribution couleur → lettre.
 *
 * Body :
 *   {
 *     texte_lignes: string[],
 *     mode: "mono" | "palette",
 *     couleur_id?: string,        (mode mono — un seul fil pour tout le texte)
 *     palette_id?: string,        (mode palette — gamme imposée)
 *     coeur_couleur_id?: string,  (optionnel — pour cohérence cœur)
 *     n_candidats?: number,       (défaut 100)
 *     fils_incompatibles_support?: string[],
 *   }
 *
 * Retour :
 *   { ok, data: { attribution, positions, score, violations_dures, distribution, ... } }
 */
import { NextResponse } from "next/server";
import { getPalettes, getFils, getMotifs } from "@/lib/atelier-da/referentiels-loader";
import { attribuer, attribuerPattern } from "@/lib/atelier-da/moteur-attribution";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const texteLignes = Array.isArray(body.texte_lignes)
      ? (body.texte_lignes as unknown[]).filter((l): l is string => typeof l === "string").map((l) => l.trim()).filter(Boolean)
      : [];
    if (texteLignes.length === 0) {
      return NextResponse.json({ ok: false, error: "texte_lignes vide ou invalide" }, { status: 400 });
    }
    if (texteLignes.length > 4) {
      return NextResponse.json({ ok: false, error: "Max 4 lignes de texte" }, { status: 400 });
    }

    // === Mode PATTERN figé (ex. YPM-004) — détection automatique via bible motif ===
    const motifIdReq = typeof body.motif_id === "string" ? body.motif_id.trim() : "";
    const modeReq = body.mode === "mono" ? "mono" : "palette";
    if (motifIdReq) {
      const motifsRef = getMotifs();
      const motif = motifsRef.motifs.find((m) => m.id === motifIdReq);
      if (motif?.bible?.distribution_pattern && modeReq === "palette") {
        // Source des fils A/B/C/D pour le pattern :
        //   1. body.fils si fourni (override à la volée par l'UI)
        //   2. palette sélectionnée
        //   3. fils_order figé dans la bible (fallback)
        let filsOverride: string[] | undefined;
        const filsBody = Array.isArray(body.fils)
          ? (body.fils as unknown[]).filter((f): f is string => typeof f === "string")
          : null;
        if (filsBody && filsBody.length >= motif.bible.distribution_pattern.fils_order.length) {
          filsOverride = filsBody;
        } else {
          const paletteIdReq = typeof body.palette_id === "string" ? body.palette_id.trim() : "";
          if (paletteIdReq) {
            const palettesRef = getPalettes();
            const palette = palettesRef.palettes.find((p) => p.id === paletteIdReq);
            if (palette && palette.fils.length >= motif.bible.distribution_pattern.fils_order.length) {
              filsOverride = palette.fils;
            }
          }
        }
        const result = attribuerPattern(
          texteLignes,
          motif.bible.distribution_pattern,
          `pattern_${motif.id}`,
          filsOverride,
        );
        return NextResponse.json({ ok: true, data: { ...result, mode_used: "pattern" } });
      }
      // Si mode mono + motif avec pattern → on bypass le pattern (mono = 1 fil pour tout)
    }

    const mode = body.mode === "mono" ? "mono" : "palette";
    let palette: string[] = [];
    let paletteId = "custom";

    if (mode === "mono") {
      const couleurId = typeof body.couleur_id === "string" ? body.couleur_id.trim() : "";
      if (!couleurId) {
        return NextResponse.json({ ok: false, error: "mode mono : couleur_id requis" }, { status: 400 });
      }
      const filsRef = getFils();
      const fil = filsRef.couleurs.find((c) => c.id === couleurId);
      if (!fil) {
        return NextResponse.json({ ok: false, error: `Fil ${couleurId} introuvable` }, { status: 404 });
      }
      palette = [couleurId];
      paletteId = `mono_${couleurId}`;
    } else {
      const paletteIdReq = typeof body.palette_id === "string" ? body.palette_id.trim() : "";
      if (!paletteIdReq) {
        return NextResponse.json({ ok: false, error: "mode palette : palette_id requis" }, { status: 400 });
      }
      const palettesRef = getPalettes();
      const found = palettesRef.palettes.find((p) => p.id === paletteIdReq);
      if (!found) {
        return NextResponse.json({ ok: false, error: `Palette ${paletteIdReq} introuvable` }, { status: 404 });
      }
      // Override fils si fourni (= gamme modifiée à la volée, palette JSON inchangée)
      const filsOverride = Array.isArray(body.fils)
        ? (body.fils as unknown[]).filter((f): f is string => typeof f === "string" && Boolean(f.trim())).map((f) => f.trim())
        : null;
      if (filsOverride && filsOverride.length >= 2) {
        const filsRef = getFils();
        const knownIds = new Set(filsRef.couleurs.map((c) => c.id));
        const unknown = filsOverride.filter((f) => !knownIds.has(f));
        if (unknown.length) {
          return NextResponse.json({ ok: false, error: `Fils override inconnus : ${unknown.join(", ")}` }, { status: 400 });
        }
        palette = filsOverride;
        paletteId = `${paletteIdReq}__override`;
      } else {
        palette = found.fils;
        paletteId = paletteIdReq;
      }
    }

    const coeurCouleurId = typeof body.coeur_couleur_id === "string" ? body.coeur_couleur_id.trim() || null : null;
    const nCandidats = typeof body.n_candidats === "number" && body.n_candidats > 0 ? Math.min(body.n_candidats, 500) : 100;
    const filsIncompat = Array.isArray(body.fils_incompatibles_support)
      ? (body.fils_incompatibles_support as unknown[]).filter((s): s is string => typeof s === "string")
      : [];

    const result = attribuer({
      texte_lignes: texteLignes,
      palette,
      palette_id: paletteId,
      n_candidats: nCandidats,
      coeur_couleur_id: coeurCouleurId,
      fils_incompatibles_support: filsIncompat,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
