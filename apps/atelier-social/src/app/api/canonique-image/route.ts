/**
 * API Route: /api/canonique-image
 *
 * Sert les images des canoniques depuis assets/canoniques/ (à la racine du repo).
 * Utilisé par le CanoniqueSelector pour afficher les avatars.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { CANONIQUES } from "@/lib/canoniques";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing id parameter", { status: 400 });
  }

  const canonique = CANONIQUES.find((c) => c.id === id);
  if (!canonique) {
    return new NextResponse("Canonique not found", { status: 404 });
  }

  // Le module est dans apps/atelier-social/, les canoniques sont dans assets/canoniques/ à la racine
  // Donc on remonte de 2 niveaux : ../../../assets/canoniques/
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets", "canoniques", canonique.filename);

  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache 1 jour côté navigateur
      },
    });
  } catch (error) {
    console.error(`Failed to read canonique ${id}:`, error);
    return new NextResponse(`Image not found: ${canonique.filename}`, { status: 404 });
  }
}
