/**
 * GET /api/da/motion/engine-status
 *
 * Indique quel moteur Motion est actif (env ATELIER_MOTION_ENGINE) et lequel
 * est réellement disponible (clé API présente, modèle accessible).
 */
import { NextResponse } from "next/server";

import type { MotionEngine } from "@/types/motion";

export async function GET() {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  const envEngine = (process.env.ATELIER_MOTION_ENGINE ?? "").toLowerCase();
  const active: MotionEngine =
    (envEngine === "omni-flash" || envEngine === "veo-3.1" || envEngine === "stub"
      ? (envEngine as MotionEngine)
      : "stub");

  return NextResponse.json({
    active: hasApiKey ? active : "stub",
    available: [
      {
        id: "stub" as MotionEngine,
        available: true,
        reason: "Toujours disponible (pas d'appel API, retourne un clip data URL factice)",
      },
      {
        id: "veo-3.1" as MotionEngine,
        available: hasApiKey,
        reason: hasApiKey
          ? "Stable, fonctionnel via GEMINI_API_KEY (modèle veo-3.1-generate-preview)"
          : "GEMINI_API_KEY absente — définis-la dans apps/atelier-social/.env.local",
      },
      {
        id: "omni-flash" as MotionEngine,
        available: hasApiKey,
        reason: hasApiKey
          ? "Preview — annoncée à Google I/O 2026 (19-20/05). API dev landing in the coming weeks, payload best-guess basé sur le pattern Veo."
          : "GEMINI_API_KEY absente",
      },
    ],
  });
}
