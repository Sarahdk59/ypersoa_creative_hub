/**
 * Atelier Motion — pont vers les autres modules du Hub.
 *
 * Règle absolue (cf. apps/atelier-motion/ARCHITECTURE.md) : on LIT, on ne
 * recalcule jamais. Brand-safety déléguée à atelier-social.
 *
 * Sprint 1 : sources de données fournies par
 *  - médiathèque (packshots) → src/lib/mediatheque/store.ts
 *  - lookbook actifs        → src/lib/active-ambiances.ts (stub si KO)
 *  - shooting collections   → stub déterministe (en attendant le branchement
 *    direct sur apps/atelier-shooting)
 */

import { listMedia, getMedia } from "@/lib/mediatheque/store";
import type {
  MotionSource,
  MotionSourceCollection,
  MotionSourceLookbook,
  MotionSourcePackshot,
} from "@/types/motion";

// ─── Packshots (depuis la Médiathèque) ─────────────────────────────────────

export async function listPackshotSources(): Promise<MotionSourcePackshot[]> {
  const r = await listMedia({ source: "packshot", per_page: 100 });
  return r.data.map((m) => ({
    type: "packshot",
    id: m.id,
    label: m.filename,
    public_url: m.public_url,
  }));
}

export async function getPackshotSource(
  mediaId: string,
): Promise<MotionSourcePackshot | null> {
  const m = await getMedia(mediaId);
  if (!m) return null;
  return {
    type: "packshot",
    id: m.id,
    label: m.filename,
    public_url: m.public_url,
  };
}

// ─── Lookbooks (active-ambiances + stub fallback) ──────────────────────────

interface ActiveLookbookLike {
  id: string;
  titre: string;
  cover_image_url?: string | null;
}

async function loadActiveLookbooks(): Promise<ActiveLookbookLike[]> {
  try {
    // Import dynamique pour ne pas planter si Supabase n'est pas configuré
    const mod = await import("@/lib/active-ambiances");
    if (typeof mod.listActiveLookbookAmbiances !== "function") return [];
    const list = await mod.listActiveLookbookAmbiances();
    return list.map((l) => ({
      id: l.id,
      titre: l.titre,
      cover_image_url: l.cover_image_url ?? null,
    }));
  } catch {
    return [];
  }
}

const STUB_LOOKBOOKS: MotionSourceLookbook[] = [
  {
    type: "lookbook",
    id: "stub-studio-brut",
    label: "Studio Brut",
    public_url: "https://picsum.photos/seed/ypersoa-lookbook-studio-brut/1080/1920",
  },
  {
    type: "lookbook",
    id: "stub-loft-organique",
    label: "Loft Organique",
    public_url: "https://picsum.photos/seed/ypersoa-lookbook-loft/1080/1920",
  },
  {
    type: "lookbook",
    id: "stub-aube-intime",
    label: "L'Aube Intime",
    public_url: "https://picsum.photos/seed/ypersoa-lookbook-aube/1080/1920",
  },
  {
    type: "lookbook",
    id: "stub-echappee-sauvage",
    label: "Échappée Sauvage",
    public_url: "https://picsum.photos/seed/ypersoa-lookbook-echappee/1080/1920",
  },
  {
    type: "lookbook",
    id: "stub-lumiere-sepia",
    label: "Lumière Sépia",
    public_url: "https://picsum.photos/seed/ypersoa-lookbook-sepia/1080/1920",
  },
];

export async function listLookbookSources(): Promise<MotionSourceLookbook[]> {
  const active = await loadActiveLookbooks();
  const realOnes: MotionSourceLookbook[] = active
    .filter((l) => Boolean(l.cover_image_url))
    .map((l) => ({
      type: "lookbook",
      id: l.id,
      label: l.titre,
      public_url: l.cover_image_url!,
    }));
  // On combine les lookbooks réels actifs + les stubs (5 ambiances officielles)
  return [...realOnes, ...STUB_LOOKBOOKS];
}

export async function getLookbookSource(
  id: string,
): Promise<MotionSourceLookbook | null> {
  const all = await listLookbookSources();
  return all.find((l) => l.id === id) ?? null;
}

// ─── Collections Shooting (stub Sprint 1) ──────────────────────────────────

/**
 * Stub : en attendant le branchement réel sur apps/atelier-shooting (qui
 * stocke ses collections en localStorage / IndexedDB côté client), on
 * propose 2 collections types pour démo l'UI Motion.
 *
 * Sprint 2 : ajouter un endpoint /api/da/shooting/collections qui lit l'archive.
 */
const STUB_COLLECTIONS: MotionSourceCollection[] = [
  {
    type: "collection",
    id: "stub-yp001-nicolas",
    label: "YP001 — Nicolas — 22:59:25",
    shots: [
      {
        id: "stub-shot-1",
        shot_type: "MACRO BRODERIE",
        public_url: "https://picsum.photos/seed/ypersoa-shoot-macro-1/1080/1350",
        ordre: 1,
      },
      {
        id: "stub-shot-2",
        shot_type: "LIFESTYLE MODE",
        public_url: "https://picsum.photos/seed/ypersoa-shoot-life-2/1080/1350",
        ordre: 2,
      },
      {
        id: "stub-shot-3",
        shot_type: "PORTRAIT ÉDITORIAL",
        public_url: "https://picsum.photos/seed/ypersoa-shoot-portrait-3/1080/1350",
        ordre: 3,
      },
      {
        id: "stub-shot-4",
        shot_type: "LIFESTYLE EXTÉRIEUR",
        public_url: "https://picsum.photos/seed/ypersoa-shoot-ext-4/1080/1350",
        ordre: 4,
      },
      {
        id: "stub-shot-5",
        shot_type: "SCÈNE LARGE",
        public_url: "https://picsum.photos/seed/ypersoa-shoot-scene-5/1080/1350",
        ordre: 5,
      },
    ],
  },
  {
    type: "collection",
    id: "stub-yp019-mama-club",
    label: "YP019 — MAMA CLUB — 14:30:18",
    shots: [
      {
        id: "stub-mama-1",
        shot_type: "MACRO BRODERIE",
        public_url: "https://picsum.photos/seed/ypersoa-mama-macro/1080/1350",
        ordre: 1,
      },
      {
        id: "stub-mama-2",
        shot_type: "PORTRAIT ÉDITORIAL",
        public_url: "https://picsum.photos/seed/ypersoa-mama-portrait/1080/1350",
        ordre: 2,
      },
      {
        id: "stub-mama-3",
        shot_type: "LIFESTYLE MODE",
        public_url: "https://picsum.photos/seed/ypersoa-mama-life/1080/1350",
        ordre: 3,
      },
      {
        id: "stub-mama-4",
        shot_type: "OBJET / PROP",
        public_url: "https://picsum.photos/seed/ypersoa-mama-prop/1080/1350",
        ordre: 4,
      },
    ],
  },
];

export async function listCollectionSources(): Promise<MotionSourceCollection[]> {
  return STUB_COLLECTIONS;
}

export async function getCollectionSource(
  id: string,
): Promise<MotionSourceCollection | null> {
  return STUB_COLLECTIONS.find((c) => c.id === id) ?? null;
}

// ─── Résolveur unifié ──────────────────────────────────────────────────────

export async function listSources(
  mode: "reel" | "ambiance" | "packshot",
): Promise<MotionSource[]> {
  if (mode === "reel") return listCollectionSources();
  if (mode === "ambiance") return listLookbookSources();
  if (mode === "packshot") return listPackshotSources();
  return [];
}

export async function getSource(
  mode: "reel" | "ambiance" | "packshot",
  id: string,
): Promise<MotionSource | null> {
  if (mode === "reel") return getCollectionSource(id);
  if (mode === "ambiance") return getLookbookSource(id);
  if (mode === "packshot") return getPackshotSource(id);
  return null;
}
