/**
 * POST /api/da/motifs/[id]/upload
 * Upload d'un PNG dans assets/motifs/ + patch de referentiels/motifs/motifs_ypm.json.
 *
 * FormData :
 *  - file   : PNG (<=5MB)
 *  - label  : string (libellé éditorial, sera slugifié pour le nom de fichier)
 *  - type   : "variante" | "shooting"
 *  - tags   : string optionnel, csv (ex. "couple,annee")
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  getMotifs,
  clearMotifsCache,
  MOTIFS_REF_PATH,
  ASSETS_MOTIFS_DIR,
  type MotifsYpmRef,
} from "@/lib/atelier-da/referentiels-loader";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueFilename(base: string, ext: string): string {
  if (!existsSync(ASSETS_MOTIFS_DIR)) {
    mkdirSync(ASSETS_MOTIFS_DIR, { recursive: true });
  }
  let candidate = `${base}.${ext}`;
  if (!existsSync(join(ASSETS_MOTIFS_DIR, candidate))) return candidate;
  let n = 2;
  while (existsSync(join(ASSETS_MOTIFS_DIR, `${base}-${n}.${ext}`))) n++;
  return `${base}-${n}.${ext}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    const label = String(form.get("label") || "").trim();
    const type = String(form.get("type") || "");
    const tagsRaw = String(form.get("tags") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ ok: false, error: "Libellé manquant" }, { status: 400 });
    }
    if (type !== "variante" && type !== "shooting") {
      return NextResponse.json({ ok: false, error: "Type invalide" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Fichier > 5 MB" }, { status: 400 });
    }
    if (file.type !== "image/png") {
      return NextResponse.json({ ok: false, error: "PNG uniquement" }, { status: 400 });
    }

    const ref = getMotifs();
    const motif = ref.motifs.find((m) => m.id === id);
    if (!motif) {
      return NextResponse.json({ ok: false, error: `Motif ${id} introuvable` }, { status: 404 });
    }

    const slugLabel = slugify(label);
    if (!slugLabel) {
      return NextResponse.json({ ok: false, error: "Libellé non slugifiable" }, { status: 400 });
    }
    const base = `${id}-${slugLabel}`;
    const filename = uniqueFilename(base, "png");

    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(join(ASSETS_MOTIFS_DIR, filename), buffer);

    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    // Re-read the JSON from disk so concurrent updates don't clobber each other.
    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    const target = data.motifs.find((m) => m.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: `Motif ${id} disparu` }, { status: 500 });
    }

    if (type === "variante") {
      target.variantes = target.variantes || [];
      target.variantes.push({ file: filename, label, ...(tags ? { tags } : {}) });
      target.nb_variantes = target.variantes.length;
      data._meta.nb_variantes_total = data.motifs.reduce((s, m) => s + (m.nb_variantes || 0), 0);
    } else {
      target.shooting_pngs = target.shooting_pngs || [];
      target.shooting_pngs.push({ file: filename, label, ...(tags ? { tags } : {}) });
    }
    data._meta.last_updated = new Date().toISOString().slice(0, 10);

    writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearMotifsCache();

    return NextResponse.json({
      ok: true,
      data: { id, type, file: filename, label, tags },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
