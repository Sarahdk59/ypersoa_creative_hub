/**
 * PATCH /api/da/fils/[id]
 * Met à jour le canonique Gunold d'un fil : code_gunold + numero_aiguille_canonique.
 * Body JSON : { code_gunold?: string | null, numero_aiguille_canonique?: number | null }
 */
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { clearFilsCache, FILS_REF_PATH, type FilsRef } from "@/lib/atelier-da/referentiels-loader";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      code_gunold?: unknown;
      numero_aiguille_canonique?: unknown;
      hex?: unknown;
      nom?: unknown;
      favori?: unknown;
      canonique?: unknown;
      archive?: unknown;
      pantone_tpg?: unknown;
      famille?: unknown;
    };

    const raw = readFileSync(FILS_REF_PATH, "utf-8");
    const data = JSON.parse(raw) as FilsRef;
    const fil = data.couleurs.find((c) => c.id === id);
    if (!fil) {
      return NextResponse.json({ ok: false, error: `Fil ${id} introuvable` }, { status: 404 });
    }

    if ("code_gunold" in body) {
      const v = body.code_gunold;
      if (v === null || v === "") {
        fil.code_gunold = "TODO_validate";
      } else if (typeof v === "string") {
        fil.code_gunold = v.trim();
      } else {
        return NextResponse.json({ ok: false, error: "code_gunold doit être string" }, { status: 400 });
      }
    }

    if ("hex" in body) {
      const v = body.hex;
      if (typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v.trim())) {
        fil.hex = v.trim().toUpperCase();
      } else if (v !== null && v !== "") {
        return NextResponse.json({ ok: false, error: "hex doit être au format #RRGGBB" }, { status: 400 });
      }
    }

    if ("pantone_tpg" in body) {
      const v = body.pantone_tpg;
      if (v === null || v === "") {
        delete fil.pantone_tpg;
      } else if (typeof v === "string") {
        fil.pantone_tpg = v.trim();
      } else {
        return NextResponse.json({ ok: false, error: "pantone_tpg doit être une string (ex. \"19-4203 TPG\")" }, { status: 400 });
      }
    }

    if ("nom" in body) {
      const v = body.nom;
      if (typeof v === "string" && v.trim()) {
        fil.nom = v.trim();
      }
    }

    if ("famille" in body) {
      const v = body.famille;
      if (typeof v === "string" && v.trim()) {
        fil.famille = v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      }
    }

    if ("favori" in body) {
      const v = body.favori;
      if (typeof v === "boolean") {
        if (v) {
          const nbFavorisActuels = data.couleurs.filter((c) => c.favori && c.id !== id).length;
          if (nbFavorisActuels >= 8) {
            return NextResponse.json(
              { ok: false, error: `Limite atteinte : 8 favoris max (actuellement ${nbFavorisActuels}).` },
              { status: 400 }
            );
          }
          fil.favori = true;
        } else {
          delete fil.favori;
        }
      } else {
        return NextResponse.json({ ok: false, error: "favori doit être un boolean" }, { status: 400 });
      }
    }

    if ("canonique" in body) {
      const v = body.canonique;
      if (typeof v === "boolean") {
        if (v) {
          const nbCanoniquesActuels = data.couleurs.filter((c) => c.canonique && c.id !== id).length;
          if (nbCanoniquesActuels >= 10) {
            return NextResponse.json(
              { ok: false, error: `Limite atteinte : 10 canoniques TMEZ max (actuellement ${nbCanoniquesActuels}).` },
              { status: 400 }
            );
          }
          fil.canonique = true;
        } else {
          delete fil.canonique;
        }
      } else {
        return NextResponse.json({ ok: false, error: "canonique doit être un boolean" }, { status: 400 });
      }
    }

    if ("archive" in body) {
      const v = body.archive;
      if (typeof v === "boolean") {
        if (v) {
          // Archive => retire automatiquement favori et canonique (incompatible)
          fil.archive = true;
          delete fil.favori;
          delete fil.canonique;
        } else {
          delete fil.archive;
        }
      } else {
        return NextResponse.json({ ok: false, error: "archive doit être un boolean" }, { status: 400 });
      }
    }

    if ("numero_aiguille_canonique" in body) {
      const v = body.numero_aiguille_canonique;
      if (v === null || v === "") {
        fil.numero_aiguille_canonique = null;
      } else if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 200) {
        fil.numero_aiguille_canonique = Math.round(v);
      } else if (typeof v === "string" && /^\d+$/.test(v.trim())) {
        const n = parseInt(v.trim(), 10);
        if (n >= 1 && n <= 200) fil.numero_aiguille_canonique = n;
      } else {
        return NextResponse.json({ ok: false, error: "numero_aiguille_canonique doit être un entier 1-200" }, { status: 400 });
      }
    }

    data._meta = { ...data._meta, last_updated: new Date().toISOString().slice(0, 10) };
    writeFileSync(FILS_REF_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    clearFilsCache();

    return NextResponse.json({ ok: true, data: fil });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
