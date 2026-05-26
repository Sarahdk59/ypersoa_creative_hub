/**
 * Upload d'un fichier sur un test : POST FormData { file, kind }.
 *  kind ∈ "dst" | "pxf" | "jpg" (jpg = aperçu PNG/JPG).
 *  Stocké sur disque dans assets/zone-test/{file_id}.{ext}.
 */
import { NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  readZoneTest,
  writeZoneTest,
  makeFileId,
  ASSETS_ZONE_TEST_DIR,
  ZONE_TEST_KIND_EXT,
  type ZoneTestFile,
  type ZoneTestFileKind,
} from "@/lib/production/zone-test-loader";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = readZoneTest();
    const test = data.tests.find((t) => t.id === id);
    if (!test) return NextResponse.json({ ok: false, error: `Test ${id} introuvable` }, { status: 404 });

    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = form.get("kind");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop()! : "";

    // Détermine le kind : explicite si fourni, sinon déduit de l'extension.
    let kind = (typeof kindRaw === "string" ? kindRaw : "") as ZoneTestFileKind;
    if (!ZONE_TEST_KIND_EXT[kind]) {
      kind = (Object.keys(ZONE_TEST_KIND_EXT) as ZoneTestFileKind[]).find((k) =>
        ZONE_TEST_KIND_EXT[k].includes(ext)
      ) as ZoneTestFileKind;
    }
    if (!kind || !ZONE_TEST_KIND_EXT[kind]) {
      return NextResponse.json(
        { ok: false, error: "Type de fichier non reconnu (attendu : .dst, .pxf, .jpg, .jpeg ou .png)" },
        { status: 400 }
      );
    }
    if (!ZONE_TEST_KIND_EXT[kind].includes(ext)) {
      return NextResponse.json(
        { ok: false, error: `Extension .${ext} invalide pour un fichier ${kind.toUpperCase()} (attendu : ${ZONE_TEST_KIND_EXT[kind].map((e) => "." + e).join(", ")})` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    if (!existsSync(ASSETS_ZONE_TEST_DIR)) mkdirSync(ASSETS_ZONE_TEST_DIR, { recursive: true });

    const fileId = makeFileId();
    const filename = `${fileId}.${ext}`;
    writeFileSync(join(ASSETS_ZONE_TEST_DIR, filename), Buffer.from(await file.arrayBuffer()));

    const entry: ZoneTestFile = {
      id: fileId,
      kind,
      filename,
      original_name: file.name,
      size: file.size,
      uploaded_at: new Date().toISOString().slice(0, 10),
    };
    test.files.push(entry);
    test.updated_at = new Date().toISOString().slice(0, 10);
    writeZoneTest(data);

    return NextResponse.json({ ok: true, data: entry });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
