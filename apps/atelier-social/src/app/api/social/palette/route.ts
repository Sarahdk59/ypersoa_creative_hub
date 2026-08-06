/**
 * Palette du module Fonds — Atelier Social :
 *  GET                          → socle + saisonnier officiel + amplificateurs
 *  POST   { nom, hex, occasion? } → ajoute un amplificateur saisonnier (atelier-social uniquement)
 *  DELETE ?id=                  → supprime un amplificateur
 */
import { NextResponse } from "next/server";
import {
  readSocialPalette,
  writeSocialPalette,
  makeAmplificateurId,
} from "@/lib/social-palette.server";
import { isValidHex, normalizeHex, type Amplificateur } from "@/lib/social-palette";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: readSocialPalette() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const hex = typeof body.hex === "string" ? body.hex.trim() : "";
    const occasion =
      typeof body.occasion === "string" ? body.occasion.trim() || undefined : undefined;

    if (!nom) return NextResponse.json({ ok: false, error: "nom requis" }, { status: 400 });
    if (!isValidHex(hex)) {
      return NextResponse.json(
        { ok: false, error: "hex invalide (format #RRGGBB)" },
        { status: 400 }
      );
    }

    const data = readSocialPalette();
    const amp: Amplificateur = {
      id: makeAmplificateurId(nom),
      nom,
      hex: normalizeHex(hex),
      occasion,
      created_at: new Date().toISOString().slice(0, 10),
    };
    data.amplificateurs.unshift(amp);
    writeSocialPalette(data);
    return NextResponse.json({ ok: true, data: amp });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id manquant (query ?id=)" }, { status: 400 });
    }
    const data = readSocialPalette();
    const before = data.amplificateurs.length;
    data.amplificateurs = data.amplificateurs.filter((a) => a.id !== id);
    if (data.amplificateurs.length === before) {
      return NextResponse.json(
        { ok: false, error: `Amplificateur ${id} introuvable` },
        { status: 404 }
      );
    }
    writeSocialPalette(data);
    return NextResponse.json({ ok: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
