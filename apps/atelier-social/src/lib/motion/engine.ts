/**
 * Atelier Motion — engine factory.
 *
 * 3 moteurs supportés :
 *  - omni-flash : Gemini Omni Flash (preview, accès dev annoncé "in the coming
 *    weeks" post Google I/O 2026 du 19-20/05/2026). Implémentation
 *    best-guess basée sur le pattern Veo (predictLongRunning) en attendant
 *    la doc officielle.
 *  - veo-3.1    : Veo 3.1 (stable, fonctionnel aujourd'hui).
 *  - stub       : sans API, pour dev / démo UI.
 *
 * Le choix par défaut est piloté par ATELIER_MOTION_ENGINE (env).
 * Par sécurité on tombe sur "stub" si GEMINI_API_KEY n'est pas définie.
 */

import type { ClipPlan, MotionEngine } from "@/types/motion";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

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

// ─── Veo 3.1 engine (image→video) ──────────────────────────────────────────

class Veo31Engine implements MotionEngineClient {
  name: MotionEngine = "veo-3.1";
  private model = "veo-3.1-generate-preview";
  constructor(private cfg: EngineConfig) {
    if (!cfg.apiKey) throw new Error("Veo 3.1: GEMINI_API_KEY requise");
  }

  async generateClip(plan: ClipPlan): Promise<GenerateResult> {
    try {
      const opId = await this.launch(plan);
      const video = await this.poll(opId);
      return { clip_url: video.uri ?? toDataUrl(video.b64), operation_id: opId };
    } catch (e) {
      return { clip_url: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async launch(plan: ClipPlan): Promise<string> {
    const subject = await urlToBase64(plan.asset_sujet_url);
    const subjectMime = sniffMimeFromUrl(plan.asset_sujet_url);
    // Format REST Veo 3.1 via generativelanguage.googleapis.com:predictLongRunning :
    //   instances[].image.{ bytesBase64Encoded, mimeType }
    // (Le format `inlineData` qu'on lit dans la doc ai.google.dev s'applique au
    // SDK JS, pas à l'appel REST direct. La REST attend `bytesBase64Encoded`
    // au même niveau que `mimeType`, comme Imagen / Vertex AI.)
    const body = {
      instances: [
        {
          prompt: plan.prompt_mouvement,
          image: { bytesBase64Encoded: subject, mimeType: subjectMime },
        },
      ],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds: plan.duree_sec,
        sampleCount: 1,
        generateAudio: false,
      },
    };
    const res = await fetch(
      `${BASE}/models/${this.model}:predictLongRunning?key=${this.cfg.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) throw new Error(`Veo launch HTTP ${res.status}: ${await res.text()}`);
    const name = (await res.json())?.name;
    if (!name) throw new Error("Veo : nom d'opération absent");
    return name;
  }

  private async poll(opId: string): Promise<{ uri?: string; b64?: string }> {
    const pollMs = this.cfg.pollMs ?? 8000;
    const timeout = this.cfg.timeoutMs ?? 6 * 60_000;
    const t0 = Date.now();
    while (true) {
      if (Date.now() - t0 > timeout) throw new Error(`Veo poll timeout ${timeout}ms`);
      const res = await fetch(`${BASE}/${opId}?key=${this.cfg.apiKey}`);
      if (!res.ok) throw new Error(`Veo poll HTTP ${res.status}: ${await res.text()}`);
      const o = await res.json();
      if (o.done) {
        if (o.error) throw new Error(`Veo: ${JSON.stringify(o.error)}`);
        const v = o?.response?.generatedVideos?.[0]?.video ?? o?.response?.videos?.[0];
        return { uri: v?.uri, b64: v?.bytesBase64Encoded };
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
}

// ─── Gemini Omni Flash engine (preview) ────────────────────────────────────

/**
 * Best-guess client Omni Flash en attendant la doc officielle développeur.
 *
 * Annoncé à Google I/O 2026 (19-20/05/2026). L'API dev "landing in the
 * coming weeks" — donc actuellement non-fonctionnelle. Cette classe est là
 * pour qu'on n'ait QU'À changer le model ID et le format de payload quand
 * la doc sortira, sans toucher le reste du pipeline.
 *
 * Hypothèses :
 *  - même endpoint generativelanguage.googleapis.com
 *  - même pattern predictLongRunning + polling
 *  - inputs multimodaux : texte + images (sujet, style)
 *  - sortie : URI signée
 */
class OmniFlashEngine implements MotionEngineClient {
  name: MotionEngine = "omni-flash";
  // À ajuster dès que Google publie le model ID officiel.
  private model = "gemini-omni-flash-preview";
  constructor(private cfg: EngineConfig) {
    if (!cfg.apiKey) throw new Error("Omni Flash: GEMINI_API_KEY requise");
  }

  async generateClip(plan: ClipPlan): Promise<GenerateResult> {
    try {
      const opId = await this.launch(plan);
      const video = await this.poll(opId);
      return { clip_url: video.uri ?? toDataUrl(video.b64), operation_id: opId };
    } catch (e) {
      return { clip_url: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async launch(plan: ClipPlan): Promise<string> {
    const subject = await urlToBase64(plan.asset_sujet_url);
    const subjectMime = sniffMimeFromUrl(plan.asset_sujet_url);
    // Best-guess Omni Flash : on suit le pattern REST Veo 3.1 actuel
    // (image.bytesBase64Encoded + mimeType) tant que la doc dev officielle
    // n'est pas publiée. À ajuster dès parution.
    const body = {
      instances: [
        {
          prompt: plan.prompt_mouvement,
          image: { bytesBase64Encoded: subject, mimeType: subjectMime },
        },
      ],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds: plan.duree_sec,
        sampleCount: 1,
        generateAudio: false,
      },
    };
    const res = await fetch(
      `${BASE}/models/${this.model}:predictLongRunning?key=${this.cfg.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Omni launch HTTP ${res.status}: ${txt}`);
    }
    const name = (await res.json())?.name;
    if (!name) throw new Error("Omni : nom d'opération absent");
    return name;
  }

  private async poll(opId: string): Promise<{ uri?: string; b64?: string }> {
    const pollMs = this.cfg.pollMs ?? 8000;
    const timeout = this.cfg.timeoutMs ?? 6 * 60_000;
    const t0 = Date.now();
    while (true) {
      if (Date.now() - t0 > timeout) throw new Error(`Omni poll timeout ${timeout}ms`);
      const res = await fetch(`${BASE}/${opId}?key=${this.cfg.apiKey}`);
      if (!res.ok) throw new Error(`Omni poll HTTP ${res.status}: ${await res.text()}`);
      const o = await res.json();
      if (o.done) {
        if (o.error) throw new Error(`Omni: ${JSON.stringify(o.error)}`);
        const v = o?.response?.generatedVideos?.[0]?.video ?? o?.response?.videos?.[0];
        return { uri: v?.uri, b64: v?.bytesBase64Encoded };
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
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
  // Data URL : on extrait directement le base64
  if (url.startsWith("data:")) {
    const idx = url.indexOf(",");
    return idx >= 0 ? url.slice(idx + 1) : "";
  }
  // URL relative servie par Next.js (ex: /canoniques/MAN-P01.jpg) : la rendre absolue
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
