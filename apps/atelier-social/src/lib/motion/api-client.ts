/**
 * Atelier Motion — fetchers côté client.
 */

import type {
  CreateMotionJobInput,
  MotionEngine,
  MotionJob,
  MotionJobListResponse,
  MotionMode,
  MotionSource,
} from "@/types/motion";

export async function fetchMotionJobs(): Promise<MotionJobListResponse> {
  const res = await fetch("/api/da/motion/jobs", { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMotionJobs ${res.status}`);
  return (await res.json()) as MotionJobListResponse;
}

export async function fetchMotionJob(id: string): Promise<MotionJob> {
  const res = await fetch(`/api/da/motion/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMotionJob ${res.status}`);
  return (await res.json()) as MotionJob;
}

export async function createMotionJob(
  input: CreateMotionJobInput,
): Promise<MotionJob> {
  const res = await fetch("/api/da/motion/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`createMotionJob ${res.status} : ${txt}`);
  }
  return (await res.json()) as MotionJob;
}

export async function deleteMotionJob(id: string): Promise<void> {
  const res = await fetch(`/api/da/motion/jobs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteMotionJob ${res.status}`);
}

export async function fetchMotionSources(
  mode: MotionMode,
): Promise<MotionSource[]> {
  const res = await fetch(`/api/da/motion/sources?mode=${mode}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetchMotionSources ${res.status}`);
  const data = (await res.json()) as { sources: MotionSource[] };
  return data.sources;
}

export interface MotionEngineStatus {
  active: MotionEngine;
  available: Array<{ id: MotionEngine; available: boolean; reason?: string }>;
}

export async function fetchMotionEngineStatus(): Promise<MotionEngineStatus> {
  const res = await fetch("/api/da/motion/engine-status", { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchMotionEngineStatus ${res.status}`);
  return (await res.json()) as MotionEngineStatus;
}
