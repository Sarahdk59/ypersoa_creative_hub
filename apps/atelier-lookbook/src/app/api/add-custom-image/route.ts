/**
 * POST /api/add-custom-image
 *
 * Ajoute une image custom à un lookbook existant. 2 modes :
 *
 * 1) MODE BRUT (recolor=false) — défaut
 *    Télécharge l'image source telle quelle (URL → blob), upload dans
 *    lookbook-images, insère row. Pas de génération IA.
 *
 * 2) MODE RECOLOR (recolor=true)
 *    Passe l'image source en référence visuelle à Gemini avec un prompt qui
 *    impose la palette du lookbook + le fil canonique le plus proche. Sortie
 *    cohérente avec l'ambiance du lookbook (ex. broderie macro en marine sur
 *    un lookbook bleu nordique au lieu du bordeaux d'origine).
 *
 * Body : {
 *   lookbook_id: string,
 *   source_url: string,
 *   famille?: ImageFamille,
 *   label?: string,
 *   recolor?: boolean,           // défaut false
 *   palette_hex?: string[],      // requis si recolor=true (ambiance_extraite.palette)
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const BUCKET = "lookbook-images";
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

// Mini-table des 10 fils canoniques TMEZ (cf. palette_fils_broderie_v2.json).
// Utilisée pour trouver le fil canonique le plus proche de la palette demandée.
const FILS_CANONIQUES = [
  { id: "fil_blanc", nom: "Blanc", hex: "#FFFFFF" },
  { id: "fil_noir", nom: "Noir", hex: "#1A1A1A" },
  { id: "fil_marine", nom: "Marine", hex: "#1E2D4A" },
  { id: "fil_canard", nom: "Canard", hex: "#1F5050" },
  { id: "fil_bordeaux", nom: "Bordeaux", hex: "#5C0E1F" },
  { id: "fil_rouge", nom: "Rouge", hex: "#C92A1F" },
  { id: "fil_sable", nom: "Sable", hex: "#C4A88C" },
  { id: "fil_terracotta", nom: "Terracotta", hex: "#B4665F" },
  { id: "fil_sauge", nom: "Sauge", hex: "#8A8D7A" },
  { id: "fil_rose_poudre", nom: "Rose poudré", hex: "#E5C2BC" },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Pour une palette donnée, trouve le fil canonique le plus représentatif :
 * on calcule la distance moyenne de chaque fil à tous les hex de la palette,
 * et on prend celui qui minimise la distance moyenne (sauf blanc/noir qui ne
 * sont jamais "représentatifs" d'une palette colorée).
 */
function closestCanoniqueFil(paletteHex: string[]): { id: string; nom: string; hex: string } {
  const colored = FILS_CANONIQUES.filter((f) => f.id !== "fil_blanc" && f.id !== "fil_noir");
  let best = colored[0];
  let bestAvg = Infinity;
  for (const f of colored) {
    const avg = paletteHex.reduce((sum, h) => sum + colorDistance(f.hex, h), 0) / paletteHex.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      best = f;
    }
  }
  return best;
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      lookbook_id?: string;
      source_url?: string;
      famille?: string;
      label?: string;
      recolor?: boolean;
      palette_hex?: string[];
    };
    if (!body.lookbook_id) return jsonError(400, "lookbook_id manquant");
    if (!body.source_url) return jsonError(400, "source_url manquant");
    if (body.recolor && (!body.palette_hex || body.palette_hex.length === 0)) {
      return jsonError(400, "palette_hex requis en mode recolor");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) return jsonError(500, "Supabase non configuré.");
    const supabase = createClient(supabaseUrl, supabaseAnon);

    // 1. Download source image (toujours fait, sert ensuite soit à uploader brut,
    //    soit à passer en référence visuelle à Gemini pour recolor)
    let imageBuffer: Buffer;
    let mimeType: string;
    try {
      const resp = await fetch(body.source_url);
      if (!resp.ok) return jsonError(502, `Download source échoué : ${resp.status}`);
      mimeType = resp.headers.get("content-type") ?? "image/jpeg";
      const arrayBuf = await resp.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
    } catch (err) {
      return jsonError(502, `Download source échoué : ${err instanceof Error ? err.message : String(err)}`);
    }

    // 1bis. MODE RECOLOR : Gemini régénère l'image en imposant la palette
    //       du lookbook + le fil canonique le plus proche.
    let promptUsed: string | null = null;
    if (body.recolor && body.palette_hex) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return jsonError(500, "GEMINI_API_KEY manquant pour le recolor.");
      const gemini = new GoogleGenAI({ apiKey: geminiKey });

      const filCanon = closestCanoniqueFil(body.palette_hex);
      promptUsed = `Re-render this reference image keeping the SAME COMPOSITION, SAME SUBJECT, SAME FRAMING and SAME EMBROIDERED MOTIF SHAPE — but ADAPT the color palette to the following Ypersoa lookbook palette : ${body.palette_hex.join(", ")}.

The embroidery thread color must be re-rendered in "${filCanon.nom}" (${filCanon.hex}), the closest canonical Ypersoa thread to this palette — NOT the original color of the source image. The garment color and any background tones should also be shifted to fall within the lookbook palette. Keep the editorial photography style, the natural lighting, the lived-in mood. No retouching, no skin smoothing. The motif shape, lettering and placement are IDENTICAL to the source — only the color of the thread and the surrounding palette change.

NO PRINTED TEXT, NO BRAND NAMES, NO WATERMARKS in the final image. The only text allowed is the embroidered text on the garment itself (which must match the source exactly).`;

      try {
        const response = await gemini.models.generateContent({
          model: GEMINI_MODEL,
          contents: {
            parts: [
              { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
              { text: promptUsed },
            ],
          },
          config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
        });
        const candidate = response.candidates?.[0];
        const part = candidate?.content?.parts?.find((p) => "inlineData" in p && p.inlineData?.data);
        if (part && "inlineData" in part && part.inlineData?.data) {
          imageBuffer = Buffer.from(part.inlineData.data, "base64");
          mimeType = part.inlineData.mimeType || mimeType;
        } else {
          return jsonError(502, `Gemini n'a pas renvoyé d'image recolorée (raison : ${candidate?.finishReason ?? "inconnue"}). Réessaie sans le recolor ou avec une autre image.`);
        }
      } catch (err) {
        return jsonError(502, `Recolor Gemini échoué : ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Récup position max
    const { data: posData } = await supabase
      .from("lookbook_images")
      .select("position")
      .eq("lookbook_id", body.lookbook_id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = (posData?.position ?? 0) + 1;

    // 3. Upload
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const path = `${body.lookbook_id}/custom-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, imageBuffer, { contentType: mimeType, cacheControl: "31536000", upsert: false });
    if (upErr) return jsonError(500, `Upload échoué : ${upErr.message}`);
    const { data: pubUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // 4. Insert row
    const famille = body.famille && ["canonique_humain", "scene_large", "texture_detail", "objet_prop", "atmosphere"].includes(body.famille)
      ? body.famille
      : "atmosphere";

    const { data: inserted, error: insErr } = await supabase
      .from("lookbook_images")
      .insert({
        lookbook_id: body.lookbook_id,
        position: nextPosition,
        famille,
        image_url: pubUrl.publicUrl,
        image_storage_path: path,
        // En mode recolor on stocke le prompt → l'image devient régénérable
        // via /api/regenerate-image. En mode brut, prompt_en = null.
        prompt_en: promptUsed,
        canonique_injecte: null,
        valide: true,
      })
      .select()
      .single();
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      return jsonError(500, `Insert row échoué : ${insErr.message}`);
    }

    return NextResponse.json({ ok: true, data: inserted });
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : String(err));
  }
}
