/**
 * POST /api/da/incarnations/import-xlsx
 *
 * Reçoit un fichier XLSX (multipart/form-data, field "file"), parse la feuille
 * INCARNATIONS, et retourne un aperçu (rows + actions create/update/skip).
 * Pour appliquer les changements : POST /api/da/incarnations/import-xlsx/apply.
 */
import { NextRequest, NextResponse } from "next/server";

import { parseIncarnationsXlsx } from "@/lib/incarnations/xlsx-parser";
import { listIncarnations } from "@/lib/incarnations/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Form data invalide" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ 'file' requis" }, { status: 400 });
  }
  if (
    !file.name.toLowerCase().endsWith(".xlsx") &&
    !file.name.toLowerCase().endsWith(".xls")
  ) {
    return NextResponse.json(
      { error: "Format de fichier non supporté (attendu : .xlsx ou .xls)" },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const existing = await listIncarnations({});
  const existingCodes = new Set(existing.data.map((i) => i.code));

  const result = parseIncarnationsXlsx(buffer, existingCodes);
  return NextResponse.json(result);
}
