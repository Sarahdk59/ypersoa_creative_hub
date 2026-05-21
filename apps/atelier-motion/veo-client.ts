// apps/atelier-motion/src/engine/veo-client.ts
// Jonction Veo 3.1 (API Gemini, clé GEMINI_API_KEY — la même que ton app
// AI Studio existante). Mode reference-to-video :
//   - image SUJET = la photo Atelier Shooting (mannequin DÉJÀ cohérent)
//   - image STYLE = le lookbook actif du hub (DA imposée)
//   - prompt      = mouvement / caméra uniquement
//
// Partir de la photo Shooting comme image sujet : elle est déjà validée,
// cohérente au canonique (~95% fidélité visage). On neutralise la faiblesse
// de continuité de Veo SANS recalculer quoi que ce soit.
//
// Contraintes Veo 3.1 : mode image-sujet ⇒ 8s ; portrait 9:16 ; async ⇒
// polling. Le risque de dérive du contrat d'API est isolé dans CE fichier.

import { readFileSync, writeFileSync } from "node:fs";
import type { ClipPlan } from "../types";

export interface VeoConfig {
  apiKey: string;
  model?: string;
  outDir: string;
  pollMs?: number;
  timeoutMs?: number;
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const b64 = (p: string) => readFileSync(p).toString("base64");

async function lancer(plan: ClipPlan, cfg: VeoConfig): Promise<string> {
  const model = cfg.model ?? "veo-3.1-generate-preview";
  const prompt =
    `${plan.promptMouvement}\n` +
    `Caméra premium lente, profondeur de champ courte sur la broderie ` +
    `(motif poitrine gauche, jamais centré). Plan continu 8s, aucune coupe. ` +
    `Respecter strictement le sujet et le style des images de référence.`;
  const body = {
    instances: [{
      prompt,
      subjectImage: { bytesBase64Encoded: b64(plan.assetSujet), mimeType: "image/png" },
      styleImage: { bytesBase64Encoded: b64(plan.assetStyle), mimeType: "image/png" },
    }],
    parameters: { aspectRatio: "9:16", durationSeconds: 8, sampleCount: 1 },
  };
  const res = await fetch(
    `${BASE}/models/${model}:predictLongRunning?key=${cfg.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`Veo lancer HTTP ${res.status}: ${await res.text()}`);
  const name = (await res.json())?.name;
  if (!name) throw new Error("Veo : nom d'opération absent.");
  return name;
}

async function attendre(op: string, cfg: VeoConfig): Promise<{ uri?: string; b64?: string }> {
  const poll = cfg.pollMs ?? 10_000;
  const timeout = cfg.timeoutMs ?? 8 * 60_000;
  const t0 = Date.now();
  while (true) {
    if (Date.now() - t0 > timeout) throw new Error(`Veo : timeout (${timeout}ms) sur ${op}`);
    const res = await fetch(`${BASE}/${op}?key=${cfg.apiKey}`);
    if (!res.ok) throw new Error(`Veo poll HTTP ${res.status}: ${await res.text()}`);
    const o = await res.json();
    if (o.done) {
      if (o.error) throw new Error(`Veo a échoué : ${JSON.stringify(o.error)}`);
      const v = o?.response?.generatedVideos?.[0]?.video ?? o?.response?.videos?.[0];
      return { uri: v?.uri, b64: v?.bytesBase64Encoded };
    }
    await new Promise((r) => setTimeout(r, poll));
  }
}

async function recuperer(v: { uri?: string; b64?: string }, cfg: VeoConfig, dest: string): Promise<void> {
  if (v.b64) { writeFileSync(dest, Buffer.from(v.b64, "base64")); return; }
  if (v.uri) {
    const sep = v.uri.includes("?") ? "&" : "?";
    const r = await fetch(`${v.uri}${sep}key=${cfg.apiKey}`);
    if (!r.ok) throw new Error(`Téléchargement clip HTTP ${r.status}`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    return;
  }
  throw new Error("Veo : ni URI ni bytes en réponse finale.");
}

/** Génère le clip d'un plan. N'interrompt jamais le batch sur échec isolé. */
export async function genererClip(plan: ClipPlan, cfg: VeoConfig): Promise<ClipPlan> {
  const dest = `${cfg.outDir}/clip-${String(plan.ordre).padStart(2, "0")}.mp4`;
  try {
    const op = await lancer(plan, cfg);
    const v = await attendre(op, cfg);
    await recuperer(v, cfg, dest);
    return { ...plan, clipPath: dest, statut: "genere" };
  } catch (e: any) {
    return { ...plan, clipPath: null, statut: "echec", erreur: e?.message ?? String(e) };
  }
}

/** Stub : exécute le pipeline sans appeler l'API (dev/test). */
export class VeoStub {
  async genererClip(plan: ClipPlan): Promise<ClipPlan> {
    return { ...plan, clipPath: `[[STUB]] clip-${plan.ordre}.mp4`, statut: "genere" };
  }
}
