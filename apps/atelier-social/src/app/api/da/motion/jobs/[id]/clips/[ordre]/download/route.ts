import { NextRequest, NextResponse } from "next/server";

import { getMotionJob } from "@/lib/motion/store";

/** Télécharge un clip via le serveur pour ne jamais exposer la clé Gemini au navigateur. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ordre: string }> },
) {
  const { id, ordre } = await params;
  const job = await getMotionJob(id);
  const clip = job?.clips.find((item) => item.ordre === Number(ordre));

  if (!job || !clip?.clip_url || clip.statut !== "genere") {
    return NextResponse.json({ error: "clip_not_found" }, { status: 404 });
  }
  if (clip.clip_url.startsWith("data:")) {
    return NextResponse.json({ error: "stub_clip_not_downloadable" }, { status: 422 });
  }

  const response = await fetch(clip.clip_url, {
    headers: process.env.GEMINI_API_KEY
      ? { "x-goog-api-key": process.env.GEMINI_API_KEY }
      : undefined,
  });
  if (!response.ok) {
    return NextResponse.json({ error: "video_download_failed" }, { status: response.status });
  }

  const safeLabel = job.source_label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "video";

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "video/mp4",
      "Content-Disposition": `attachment; filename="ypersoa-${safeLabel}-clip-${String(clip.ordre).padStart(2, "0")}.mp4"`,
      "Cache-Control": "private, no-store",
    },
  });
}
