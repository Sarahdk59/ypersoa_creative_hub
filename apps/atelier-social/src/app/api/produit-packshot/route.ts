/**
 * API Route: /api/produit-packshot
 *
 * Sert les packshots produit depuis assets_produits/{YPxxx}/ (à la racine du repo).
 * Utilisé par la page "Base produit" (/atelier-production/base-produit).
 *
 * Le nom de fichier est validé contre le référentiel palette_supports_par_produit
 * (couleurs_detaillees[].packshot_reference) → pas de path traversal possible.
 */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getProduits } from "@/lib/hub-products";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const file = searchParams.get("file");

  if (!product || !file) {
    return new NextResponse("Missing product/file parameter", { status: 400 });
  }

  // Validation stricte contre le référentiel : le fichier doit être déclaré
  // comme packshot_reference d'une couleur du produit demandé.
  const produit = getProduits().find((p) => p.id === product);
  if (!produit) {
    return new NextResponse("Produit not found", { status: 404 });
  }
  const known = produit.couleurs_detaillees.some((c) => c.packshot_reference === file);
  if (!known) {
    return new NextResponse("Packshot not declared for this product", { status: 404 });
  }

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse("Unsupported file type", { status: 400 });
  }

  // Le module est dans apps/atelier-social/, les assets sont à la racine du repo.
  const repoRoot = join(process.cwd(), "..", "..");
  const filePath = join(repoRoot, "assets_produits", product, file);

  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error(`Failed to read packshot ${product}/${file}:`, error);
    return new NextResponse(`Image not found: ${file}`, { status: 404 });
  }
}
