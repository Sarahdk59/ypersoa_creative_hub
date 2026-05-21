import { NextRequest, NextResponse } from "next/server";

import type { Tag, TagCategory } from "@/types/mediatheque";
import { TAG_CATEGORY_ORDER } from "@/types/mediatheque";
import { createTag, listTags } from "@/lib/mediatheque/store";

const VALID_CATEGORIES = new Set<TagCategory>(TAG_CATEGORY_ORDER);

export async function GET() {
  const tags = await listTags();
  const by_category: Record<string, Tag[]> = {};
  for (const cat of TAG_CATEGORY_ORDER) by_category[cat] = [];
  for (const t of tags) {
    if (!by_category[t.category]) by_category[t.category] = [];
    by_category[t.category].push(t);
  }
  for (const cat of Object.keys(by_category)) {
    by_category[cat].sort((a, b) => a.label.localeCompare(b.label));
  }
  return NextResponse.json({ tags, by_category });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  if (
    typeof input.category !== "string" ||
    !VALID_CATEGORIES.has(input.category as TagCategory)
  ) {
    return NextResponse.json({ error: "category invalid" }, { status: 400 });
  }
  if (typeof input.slug !== "string" || !input.slug.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  if (typeof input.label !== "string" || !input.label.trim()) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }

  const tag = await createTag({
    category: input.category as TagCategory,
    slug: input.slug.trim(),
    label: input.label.trim(),
    color_hex: typeof input.color_hex === "string" ? input.color_hex : undefined,
  });
  return NextResponse.json(tag, { status: 201 });
}
