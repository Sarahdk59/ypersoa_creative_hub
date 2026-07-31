import { NextRequest, NextResponse } from "next/server";
import { getEpisode, patchEpisode } from "@/lib/studio-mood/episodes-loader";
import { buildStoryboard, storyboardToMarkdown } from "@/lib/studio-mood/storyboard-builder";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";

  const ep = await getEpisode(id);
  if (!ep) return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });

  const storyboard = buildStoryboard(ep);
  const markdown = storyboardToMarkdown(storyboard);

  // Persiste le markdown dans l'épisode
  await patchEpisode(id, {
    storyboard_md: markdown,
    storyboard_exported_at: new Date().toISOString(),
  });

  if (format === "md" || format === "markdown") {
    return new Response(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="storyboard-${ep.titre.replace(/\s+/g, "-").toLowerCase()}.md"`,
      },
    });
  }

  return NextResponse.json({ data: storyboard, markdown });
}
