import { NextRequest, NextResponse } from "next/server";
import { getEpisode, patchEpisode } from "@/lib/studio-mood/episodes-loader";
import { generateCopy } from "@/lib/studio-mood/copy-generator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let ep = await getEpisode(id);
  if (!ep) return NextResponse.json({ message: "Épisode introuvable" }, { status: 404 });

  try {
    const copy = await generateCopy(ep);

    // Sauvegarde automatique dans l'épisode
    ep = await patchEpisode(id, {
      hook: copy.hook,
      legende_question: copy.legende_question,
      hashtags: copy.hashtags,
    });

    return NextResponse.json({ data: { copy, episode: ep } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
