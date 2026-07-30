import { NextResponse } from "next/server";
import { listBlogArticles } from "@/lib/blog/article-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await listBlogArticles();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 }
    );
  }
}
