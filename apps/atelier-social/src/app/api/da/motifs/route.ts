import { NextResponse } from "next/server";

import { listMotifs } from "@/lib/incarnations/store";

export async function GET() {
  const motifs = await listMotifs();
  return NextResponse.json(motifs);
}
