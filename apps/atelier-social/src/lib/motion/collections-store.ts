/**
 * Collections Motion — couche d'accès aux données.
 *
 * Implémentation Supabase (tables `motion_collections` + `motion_collection_shots`).
 * Fallback in-memory si Supabase n'est pas configuré (dev / preview).
 */

import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MotionCollectionShot {
  id: string;
  collection_id: string;
  shot_type: string;
  public_url: string;
  media_id: string | null;
  source_type: "media" | "liked-shot" | "url";
  source_id: string | null;
  ordre: number;
  created_at: string;
}

export interface MotionCollection {
  id: string;
  label: string;
  description: string | null;
  shots: MotionCollectionShot[];
  created_at: string;
  updated_at: string;
}

export interface MotionCollectionListItem {
  id: string;
  label: string;
  description: string | null;
  shot_count: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionInput {
  label: string;
  description?: string | null;
  shots: Array<{
    shot_type: string;
    public_url: string;
    media_id?: string | null;
    source_type?: "media" | "liked-shot" | "url";
    source_id?: string | null;
    ordre: number;
  }>;
}

export type UpdateCollectionInput = Partial<CreateCollectionInput>;

// ─── Fallback in-memory (Supabase non configuré) ─────────────────────────────

interface MemStore {
  collections: Map<string, Omit<MotionCollection, "shots">>;
  shots: Map<string, MotionCollectionShot>;
}

declare global {
  // eslint-disable-next-line no-var
  var __ypersoa_motion_collections__: MemStore | undefined;
}

function mem(): MemStore {
  if (!globalThis.__ypersoa_motion_collections__) {
    globalThis.__ypersoa_motion_collections__ = {
      collections: new Map(),
      shots: new Map(),
    };
  }
  return globalThis.__ypersoa_motion_collections__;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function memGetFull(id: string): MotionCollection | null {
  const store = mem();
  const col = store.collections.get(id);
  if (!col) return null;
  const shots = Array.from(store.shots.values())
    .filter((s) => s.collection_id === id)
    .sort((a, b) => a.ordre - b.ordre);
  return { ...col, shots };
}

// ─── CRUD Supabase ────────────────────────────────────────────────────────────

const TBL_COL = "motion_collections";
const TBL_SHOTS = "motion_collection_shots";

export async function listCollections(): Promise<MotionCollectionListItem[]> {
  if (!supabase) {
    const store = mem();
    return Array.from(store.collections.values())
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => {
        const shots = Array.from(store.shots.values()).filter(
          (s) => s.collection_id === c.id,
        );
        return {
          ...c,
          shot_count: shots.length,
          cover_url: shots.sort((a, b) => a.ordre - b.ordre)[0]?.public_url ?? null,
        };
      });
  }

  const { data, error } = await supabase
    .from(TBL_COL)
    .select(
      `id, label, description, created_at, updated_at,
       ${TBL_SHOTS}(id, public_url, ordre)`,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listCollections: ${error.message}`);

  return (data ?? []).map((row) => {
    const shots: Array<{ public_url: string; ordre: number }> =
      (row as unknown as { motion_collection_shots: Array<{ public_url: string; ordre: number }> })
        .motion_collection_shots ?? [];
    const sorted = [...shots].sort((a, b) => a.ordre - b.ordre);
    return {
      id: row.id,
      label: row.label,
      description: row.description,
      shot_count: shots.length,
      cover_url: sorted[0]?.public_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

export async function getCollection(id: string): Promise<MotionCollection | null> {
  if (!supabase) return memGetFull(id);

  const { data: col, error: colErr } = await supabase
    .from(TBL_COL)
    .select("*")
    .eq("id", id)
    .single();

  if (colErr || !col) return null;

  const { data: shots, error: shotsErr } = await supabase
    .from(TBL_SHOTS)
    .select("*")
    .eq("collection_id", id)
    .order("ordre");

  if (shotsErr) throw new Error(`getCollection shots: ${shotsErr.message}`);

  return {
    id: col.id,
    label: col.label,
    description: col.description,
    created_at: col.created_at,
    updated_at: col.updated_at,
    shots: (shots ?? []) as MotionCollectionShot[],
  };
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<MotionCollection> {
  if (!supabase) {
    const store = mem();
    const id = makeId();
    const ts = now();
    const col: Omit<MotionCollection, "shots"> = {
      id,
      label: input.label,
      description: input.description ?? null,
      created_at: ts,
      updated_at: ts,
    };
    store.collections.set(id, col);
    const shots: MotionCollectionShot[] = input.shots.map((s) => {
      const sid = makeId();
      const shot: MotionCollectionShot = {
        id: sid,
        collection_id: id,
        shot_type: s.shot_type,
        public_url: s.public_url,
        media_id: s.media_id ?? null,
        source_type: s.source_type ?? "media",
        source_id: s.source_id ?? null,
        ordre: s.ordre,
        created_at: ts,
      };
      store.shots.set(sid, shot);
      return shot;
    });
    return { ...col, shots };
  }

  const { data: colRow, error: colErr } = await supabase
    .from(TBL_COL)
    .insert({ label: input.label, description: input.description ?? null })
    .select()
    .single();

  if (colErr || !colRow) throw new Error(`createCollection: ${colErr?.message}`);

  if (input.shots.length > 0) {
    const { error: shotsErr } = await supabase.from(TBL_SHOTS).insert(
      input.shots.map((s) => ({
        collection_id: colRow.id,
        shot_type: s.shot_type,
        public_url: s.public_url,
        media_id: s.media_id ?? null,
        source_type: s.source_type ?? "media",
        source_id: s.source_id ?? null,
        ordre: s.ordre,
      })),
    );
    if (shotsErr) throw new Error(`createCollection shots: ${shotsErr.message}`);
  }

  const result = await getCollection(colRow.id);
  if (!result) throw new Error("createCollection: collection introuvable après création");
  return result;
}

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<MotionCollection> {
  if (!supabase) {
    const store = mem();
    const existing = store.collections.get(id);
    if (!existing) throw new Error(`Collection ${id} introuvable`);
    const updated = {
      ...existing,
      ...(input.label !== undefined && { label: input.label }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      updated_at: now(),
    };
    store.collections.set(id, updated);
    if (input.shots !== undefined) {
      // Supprimer les anciens shots et recréer
      for (const [sid, s] of store.shots.entries()) {
        if (s.collection_id === id) store.shots.delete(sid);
      }
      const ts = now();
      for (const s of input.shots) {
        const sid = makeId();
        store.shots.set(sid, {
          id: sid,
          collection_id: id,
          shot_type: s.shot_type,
          public_url: s.public_url,
          media_id: s.media_id ?? null,
          source_type: s.source_type ?? "media",
          source_id: s.source_id ?? null,
          ordre: s.ordre,
          created_at: ts,
        });
      }
    }
    return memGetFull(id)!;
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.label !== undefined) updatePayload.label = input.label;
  if (input.description !== undefined) updatePayload.description = input.description ?? null;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from(TBL_COL)
      .update(updatePayload)
      .eq("id", id);
    if (error) throw new Error(`updateCollection: ${error.message}`);
  }

  if (input.shots !== undefined) {
    // Remplacer tous les shots : delete puis re-insert
    const { error: delErr } = await supabase
      .from(TBL_SHOTS)
      .delete()
      .eq("collection_id", id);
    if (delErr) throw new Error(`updateCollection delete shots: ${delErr.message}`);

    if (input.shots.length > 0) {
      const { error: insErr } = await supabase.from(TBL_SHOTS).insert(
        input.shots.map((s) => ({
          collection_id: id,
          shot_type: s.shot_type,
          public_url: s.public_url,
          media_id: s.media_id ?? null,
          source_type: s.source_type ?? "media",
          source_id: s.source_id ?? null,
          ordre: s.ordre,
        })),
      );
      if (insErr) throw new Error(`updateCollection insert shots: ${insErr.message}`);
    }
  }

  const result = await getCollection(id);
  if (!result) throw new Error(`updateCollection: ${id} introuvable après update`);
  return result;
}

export async function deleteCollection(id: string): Promise<void> {
  if (!supabase) {
    const store = mem();
    store.collections.delete(id);
    for (const [sid, s] of store.shots.entries()) {
      if (s.collection_id === id) store.shots.delete(sid);
    }
    return;
  }

  const { error } = await supabase.from(TBL_COL).delete().eq("id", id);
  if (error) throw new Error(`deleteCollection: ${error.message}`);
}
