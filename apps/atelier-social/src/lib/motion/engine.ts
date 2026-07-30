/**
 * Atelier Motion — engine factory.
 *
 * 3 moteurs supportés :
 *  - omni-flash : Gemini Omni Flash (preview, non disponible en prod).
 *  - veo-3.1    : Veo 3.1 via @google/genai SDK (stable, fonctionnel).
 *  - stub       : sans API, pour dev / démo UI.
 *
 * Le choix par défaut est piloté par ATELIER_MOTION_ENGINE (env).
 * Par sécurité on tombe sur "stub" si GEMINI_API_KEY n'est pas définie.
 */

import { GoogleGenAI } from "@google/genai";
import type { ClipPlan, MotionEngine } from "@/types/motion";

export interface EngineConfig {
  engine: MotionEngine;
  apiKey?: string;
  /** Délai entre 2 polls (défaut 8000ms). */
  pollMs?: number;
  /** Timeout global par clip (défaut 6 min). */
  timeoutMs?: number;
}

export interface GenerateResult {
  clip_url: string | null;
  /** Pour debug : id de l'opération API ou tag stub. */
  operation_id?: string;
  error?: string;
}

export interface MotionEngineClient {
  name: MotionEngine;
  generateClip(plan: ClipPlan): Promise<GenerateResult>;
}

// ─── Stub engine ───────────────────────────────────────────────────────────

class StubEngine implements MotionEngineClient {
  name: MotionEngine = "stub";
  async generateClip(plan: ClipPlan): Promise<GenerateResult> {
    // Simule un délai de génération pour rendre la barre de progression visible
    await new Promise((r) => setTimeout(r, 800));
    return {
      clip_url: `data:video/mp4;base64,STUB_CLIP_${plan.ordre}`,
      operation_id: `stub-${plan.ordre}-${Date.now()}`,
    };
  }
}

// ─── Veo 3.1 engine (image→video via @google/genai SDK) ───────────────────

class Veo31Engine implements MotionEngineClient {
  name: MotionEngine = "veo-3.1";
  private ai: GoogleGenAI;

  constructor(private cfg: EngineConfig) {
    if (!cfg.apiKey) throw new Error("Veo 3.1: GEMINI_API_KEY requise");
    this.ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  }

  async generateClip(plan: ClipPlan): Promise<GenerateResult> {
    try {
      const subject = await urlToBase64(plan.asset_sujet_url);
      const mimeType = sniffMimeFromUrl(plan.asset_sujet_url);

      let operation = await this.ai.models.generateVideos({
        model: "veo-3.1-generate-preview",
        prompt: plan.prompt_mouvement,
        image: { imageBytes: subject, mimeType },
        config: {
          aspectRatio: "9:16",
          durationSeconds: plan.duree_sec,
          numberOfVideos: 1,
          personGeneration: "allow_all",
        },
      });

      const pollMs = this.cfg.pollMs ?? 10_000;
      const timeout = this.cfg.timeoutMs ?? 6 * 60_000;
      const t0 = Date.now();

      while (!operation.done) {
        if (Date.now() - t0 > timeout) throw new Error(`Veo poll timeout ${timeout}ms`);
        await new Promise((r) => setTimeout(r, pollMs));
        operation = await this.ai.operations.getVideosOperation({ operation });
      }

      if (operation.error) throw new Error(`Veo: ${JSON.stringify(operation.error)}`);

      const video = operation.response?.generatedVideos?.[0]?.video;
      if (!video) throw new Error("Veo: réponse sans clip généré");

      const clip_url = video.uri ?? toDataUrl(video.videoBytes as string | undefined);
      return { clip_url, operation_id: operation.name };
    } catch (e) {
      return { clip_url: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

// ─── Gemini Omni Flash engine (preview — non disponible) ───────────────────

/**
 * Omni Flash annoncé à Google I/O 2026. Pas encore disponible en prod.
 * Utilise le même SDK que Veo 3.1 — à activer dès que le model ID est connu.
 */
class OmniFlashEngine implements MotionEngineClient {
  name: MotionEngine = "omni-flash";
  private ai: GoogleGenAI;

  constructor(private cfg: EngineConfig) {
    if (!cfg.apiKey) throw new Error("Omni Flash: GEMINI_API_KEY requise");
    this.ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  }

  async generateClip(plan: ClipPlan): Promise<GenerateResult> {
    // Model ID officiel non encore publié — renvoie une erreur explicite.
    void plan;
    void this.ai;
    return {
      clip_url: null,
      error: "Omni Flash non disponible (preview API pas encore ouverte aux développeurs).",
    };
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createMotionEngine(cfg?: Partial<EngineConfig>): MotionEngineClient {
  const apiKey = cfg?.apiKey ?? process.env.GEMINI_API_KEY;
  const engineEnv = (process.env.ATELIER_MOTION_ENGINE ?? "").toLowerCase();
  const requested: MotionEngine =
    cfg?.engine ??
    (engineEnv === "omni-flash" || engineEnv === "veo-3.1" || engineEnv === "stub"
      ? (engineEnv as MotionEngine)
      : "stub");

  // Sans clé API on tombe systématiquement sur stub (sécurité dev).
  if (!apiKey && requested !== "stub") {
    return new StubEngine();
  }

  const fullCfg: EngineConfig = {
    engine: requested,
    apiKey,
    pollMs: cfg?.pollMs,
    timeoutMs: cfg?.timeoutMs,
  };

  if (requested === "omni-flash") return new OmniFlashEngine(fullCfg);
  if (requested === "veo-3.1") return new Veo31Engine(fullCfg);
  return new StubEngine();
}

// ─── Utils ─────────────────────────────────────────────────────────────────

async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    const idx = url.indexOf(",");
    return idx >= 0 ? url.slice(idx + 1) : "";
  }
  const absolute = url.startsWith("/")
    ? `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}${url}`
    : url;
  const res = await fetch(absolute);
  if (!res.ok) throw new Error(`Téléchargement image ${absolute} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

function sniffMimeFromUrl(url: string): string {
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);/);
    return m?.[1] ?? "image/png";
  }
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function toDataUrl(b64: string | undefined): string | null {
  if (!b64) return null;
  return `data:video/mp4;base64,${b64}`;
}
