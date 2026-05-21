/**
 * Atelier Motion — store in-memory des jobs de génération vidéo.
 *
 * Sprint 1 : persistance via globalThis. Sprint 2 : Supabase.
 */

import { randomUUID } from "node:crypto";

import type {
  CreateMotionJobInput,
  MotionJob,
  MotionJobListResponse,
  MotionJobStatut,
} from "@/types/motion";

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_motion_store__:
    | { jobs: Map<string, MotionJob>; nextCode: number }
    | undefined;
}

function getStore() {
  if (!globalThis.__ypersoa_motion_store__) {
    globalThis.__ypersoa_motion_store__ = {
      jobs: new Map(),
      nextCode: 1,
    };
  }
  return globalThis.__ypersoa_motion_store__;
}

function nextJobCode(): string {
  const store = getStore();
  const n = store.nextCode;
  store.nextCode += 1;
  return `MOT-${String(n).padStart(3, "0")}`;
}

export async function listMotionJobs(): Promise<MotionJobListResponse> {
  const jobs = Array.from(getStore().jobs.values());
  jobs.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return {
    data: jobs.map((j) => ({
      id: j.id,
      code: j.code,
      mode: j.mode,
      engine: j.engine,
      statut: j.statut,
      source_label: j.source_label,
      duree_totale_sec: j.duree_totale_sec,
      clips: j.clips,
      created_at: j.created_at,
    })),
    meta: { total: jobs.length },
  };
}

export async function getMotionJob(id: string): Promise<MotionJob | null> {
  return getStore().jobs.get(id) ?? null;
}

export async function createMotionJob(
  input: CreateMotionJobInput & { source_label: string },
): Promise<MotionJob> {
  const now = new Date().toISOString();
  const job: MotionJob = {
    id: randomUUID(),
    code: nextJobCode(),
    mode: input.mode,
    engine: input.engine ?? "stub",
    format: input.format,
    source_id: input.source_id,
    source_label: input.source_label,
    lookbook_id: input.lookbook_id ?? null,
    brief: input.brief ?? null,
    statut: "en_attente",
    clips: [],
    duree_totale_sec: 0,
    brand_safety_ok: true,
    brand_safety_message: null,
    a_faire_manuel: [],
    created_at: now,
    updated_at: now,
  };
  getStore().jobs.set(job.id, job);
  return job;
}

export async function updateMotionJob(
  id: string,
  patch: Partial<Pick<MotionJob, "clips" | "statut" | "duree_totale_sec" | "a_faire_manuel" | "brand_safety_ok" | "brand_safety_message">>,
): Promise<MotionJob | null> {
  const store = getStore();
  const job = store.jobs.get(id);
  if (!job) return null;
  Object.assign(job, patch);
  job.updated_at = new Date().toISOString();
  return job;
}

export async function deleteMotionJob(id: string): Promise<boolean> {
  return getStore().jobs.delete(id);
}

export function computeStatut(clips: MotionJob["clips"]): MotionJobStatut {
  if (clips.length === 0) return "en_attente";
  const ok = clips.filter((c) => c.statut === "genere").length;
  const ko = clips.filter((c) => c.statut === "echec").length;
  if (clips.some((c) => c.statut === "en_cours" || c.statut === "en_attente")) {
    return "en_cours";
  }
  if (ok === clips.length) return "termine";
  if (ko === clips.length) return "echec";
  return "partiel";
}
