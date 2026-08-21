import { NextRequest, NextResponse } from "next/server";
import { deleteBlogArticle, getBlogArticle } from "@/lib/blog/article-store";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const item = await getBlogArticle(id);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Article introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Lecture impossible." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteBlogArticle(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Suppression impossible." },
      { status: 500 }
    );
  }
}
