/**
 * POST /api/calendar/[id]/attach-image
 *
 * Pont « Envoyer vers Planable » depuis le Shooting Book (atelier-social).
 * Le Shooting Book ne persiste rien (rendu Gemini en base64 côté navigateur) :
 * cet endpoint reçoit l'image data-URL choisie par Sarah, l'upload dans le bucket
 * Storage `planable-packs`, et l'attache comme slide au pack de l'entrée Planable.
 *
 * - Si l'entrée n'a pas encore de pack → crée un pack avec cette 1re slide,
 *   lie l'entrée (pack_id) et passe le statut à `pack_generated`.
 * - Si un pack existe déjà → ajoute la slide (carrousel construit en plusieurs envois).
 *
 * CORS ouvert (`*`) : appel cross-origin depuis atelier-social. Pas de credentials
 * (RLS V1 permissive côté serveur), donc `*` est sûr ici.
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

const BUCKET = "planable-packs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

interface Slide {
  index: number;
  angle: string | null;
  image_url: string;
  overlay_text: string | null;
}

/** Parse une data-URL `data:image/jpeg;base64,xxxx` → { buffer, contentType, ext }. */
function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string; ext: string } {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("image_data_url invalide (attendu data:image/...;base64,...)");
  const contentType = m[1];
  const ext = contentType.split("/")[1].replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
  return { buffer: Buffer.from(m[2], "base64"), contentType, ext };
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { image_data_url, angle, overlay_text, caption } = body as {
      image_data_url?: string;
      angle?: string | null;
      overlay_text?: string | null;
      caption?: string | null;
    };
    if (!image_data_url || typeof image_data_url !== "string") {
      return json({ ok: false, error: "image_data_url manquant" }, 400);
    }

    const supabase = getSupabaseServer();

    const { data: entry, error: entryErr } = await supabase
      .from("planable_calendar_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (entryErr) throw entryErr;
    if (!entry) return json({ ok: false, error: "Entrée introuvable" }, 404);

    // 1) Upload de l'image dans le bucket Storage
    const { buffer, contentType, ext } = parseDataUrl(image_data_url);
    const path = `${id}/${shortId()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (upErr) throw new Error(`Upload Storage échoué : ${upErr.message}`);
    const image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // 2) Attache la slide au pack (création ou append)
    let packId = entry.pack_id as string | null;

    if (packId) {
      const { data: pack, error: packErr } = await supabase
        .from("planable_packs")
        .select("slides, caption")
        .eq("id", packId)
        .maybeSingle();
      if (packErr) throw packErr;
      const existing: Slide[] = Array.isArray(pack?.slides) ? (pack!.slides as Slide[]) : [];
      const slide: Slide = {
        index: existing.length + 1,
        angle: angle ?? `Slide ${existing.length + 1}`,
        image_url,
        overlay_text: overlay_text ?? null,
      };
      const nextCaption = pack?.caption && pack.caption.trim().length > 0
        ? pack.caption
        : (caption ?? "Visuel envoyé depuis le Shooting Book.");
      const { error: updPackErr } = await supabase
        .from("planable_packs")
        .update({ slides: [...existing, slide], caption: nextCaption })
        .eq("id", packId);
      if (updPackErr) throw updPackErr;
    } else {
      const slide: Slide = { index: 1, angle: angle ?? "Slide 1", image_url, overlay_text: overlay_text ?? null };
      const { data: pack, error: insErr } = await supabase
        .from("planable_packs")
        .insert({
          motif_code: entry.motif_code,
          ambiance_id: 1,
          casting_ids: [],
          format: entry.format,
          slides: [slide],
          caption: caption ?? "Visuel envoyé depuis le Shooting Book.",
          hashtags: [],
          brand_safety_status: "ok",
          brand_safety_issues: null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      packId = pack.id;

      const { error: updEntryErr } = await supabase
        .from("planable_calendar_entries")
        .update({ pack_id: packId, status: "pack_generated" })
        .eq("id", id);
      if (updEntryErr) throw updEntryErr;
    }

    return json({ ok: true, data: { image_url, pack_id: packId } });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
}
