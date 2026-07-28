import { NextRequest, NextResponse } from "next/server";
import {
  createCollection,
  listCollections,
  type CreateCollectionInput,
} from "@/lib/motion/collections-store";

export async function GET() {
  try {
    const data = await listCollections();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur listage" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  if (typeof input.label !== "string" || !input.label.trim()) {
    return NextResponse.json({ error: "label requis" }, { status: 400 });
  }
  if (!Array.isArray(input.shots)) {
    return NextResponse.json({ error: "shots[] requis" }, { status: 400 });
  }

  const payload: CreateCollectionInput = {
    label: input.label.trim(),
    description:
      typeof input.description === "string" ? input.description : null,
    shots: (input.shots as Array<Record<string, unknown>>).map((s, i) => ({
      shot_type: typeof s.shot_type === "string" ? s.shot_type : "LIFESTYLE MODE",
      public_url: String(s.public_url ?? ""),
      media_id: typeof s.media_id === "string" ? s.media_id : null,
      source_type: (["media", "liked-shot", "url"].includes(s.source_type as string)
        ? s.source_type
        : "media") as "media" | "liked-shot" | "url",
      source_id: typeof s.source_id === "string" ? s.source_id : null,
      ordre: typeof s.ordre === "number" ? s.ordre : i,
    })),
  };

  try {
    const collection = await createCollection(payload);
    return NextResponse.json(collection, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur création" },
      { status: 500 },
    );
  }
}
