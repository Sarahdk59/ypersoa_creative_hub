import { NextResponse } from "next/server";

import { listMotionJobs } from "@/lib/motion/store";

export async function GET() {
  const r = await listMotionJobs();
  return NextResponse.json(r);
}
