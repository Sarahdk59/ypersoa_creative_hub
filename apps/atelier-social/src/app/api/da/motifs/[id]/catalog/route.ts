/**
 * PATCH /api/da/motifs/[id]/catalog
 *
 * Met à jour les tags de catalogue site-web d'un motif :
 *   - destinataires[] / occasions[]            → tags du motif racine (défaut)
 *   - variante_tags: { [key]: { destinataires, occasions } } → tags fine-grained
 *
 * Le motif CHOUCHOU regroupe Papa Chéri (papa), Ma Maman (maman), Marié 2026
 * (mariage)… donc le tag racine n'est pas pertinent — c'est la variante qui
 * porte le destinataire/occasion. Cet endpoint accepte les deux pour permettre
 * un fallback (motif taggé en bloc) + override (variante taggée finement).
 *
 * Body JSON partiel :
 *   {
 *     destinataires?: string[] | null,
 *     occasions?: string[] | null,
 *     variante_tags?: { [varianteKey: string]: { destinataires?: string[] | null, occasions?: string[] | null } }
 *   }
 *
 * varianteKey = variante.label (utilisé comme id stable, ex. "CHOUCHOU-mamie").
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import {
  clearMotifsCache,
  MOTIFS_REF_PATH,
  type MotifsYpmRef,
} from "@/lib/atelier-da/referentiels-loader";

function normalizeList(input: unknown): string[] | null {
  if (input === null || input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.length > 0);
  return Array.from(new Set(cleaned));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const raw = readFileSync(MOTIFS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as MotifsYpmRef;
    const target = data.motifs.find((m) => m.id === id);
    if (!target) {
      return NextResponse.json({ ok: false, error: `Motif ${id} introuvable` }, { status: 404 });
    }

    if ("destinataires" in body) {
      const v = normalizeList(body.destinataires);
      if (v === null) {
        return NextResponse.json(
          { ok: false, error: "destinataires doit être un tableau de strings" },
          { status: 400 }
        );
      }
      target.destinataires = v;
    }

    if ("occasions" in body) {
      const v = normalizeList(body.occasions);
      if (v === null) {
        return NextResponse.json(
          { ok: false, error: "occasions doit être un tableau de strings" },
          { status: 400 }
        );
      }
      target.occasions = v;
    }

    if ("produits" in body) {
      const v = normalizeList(body.produits);
      if (v === null) {
        return NextResponse.json(
          { ok: false, error: "produits doit être un tableau de strings" },
          { status: 400 }
        );
      }
      // Pour produits on garde la casse YP001 etc. (pas de lowercase)
      target.produits = (body.produits as string[]).map((s) => s.trim()).filter(Boolean);
    }

    if ("tags" in body) {
      const v = normalizeList(body.tags);
      if (v === null) {
        return NextResponse.json(
          { ok: false, error: "tags doit être un tableau de strings" },
          { status: 400 }
        );
      }
      target.tags = v;
    }

    // Tags par variante (fine-grained) : varianteKey = variante.label
    if ("variante_tags" in body) {
      const vt = body.variante_tags;
      if (vt === null || typeof vt !== "object" || Array.isArray(vt)) {
        return NextResponse.json(
          { ok: false, error: "variante_tags doit être un objet { [key]: { destinataires?, occasions? } }" },
          { status: 400 }
        );
      }
      for (const [varianteKey, raw] of Object.entries(vt as Record<string, unknown>)) {
        const v = target.variantes?.find((x) => x.label === varianteKey);
        if (!v) continue; // ignore silencieusement les clés inconnues (évite désync front)
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
        const rawObj = raw as Record<string, unknown>;
        if ("destinataires" in rawObj) {
          const d = normalizeList(rawObj.destinataires);
          if (d !== null) v.destinataires = d;
        }
        if ("occasions" in rawObj) {
          const o = normalizeList(rawObj.occasions);
          if (o !== null) v.occasions = o;
        }
        if ("produits" in rawObj) {
          const p = normalizeList(rawObj.produits);
          if (p !== null) v.produits = p;
        }
        if ("tags" in rawObj) {
          const t = normalizeList(rawObj.tags);
          if (t !== null) v.tags = t;
        }
      }
    }

    data._meta.last_updated = new Date().toISOString().slice(0, 10);
    writeFileSync(MOTIFS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearMotifsCache();

    return NextResponse.json({
      ok: true,
      data: {
        id,
        destinataires: target.destinataires ?? [],
        occasions: target.occasions ?? [],
        variantes: (target.variantes ?? []).map((v) => ({
          key: v.label,
          destinataires: v.destinataires ?? [],
          occasions: v.occasions ?? [],
          produits: v.produits ?? [],
          tags: v.tags ?? [],
        })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
