/**
 * POST /api/calendar/[id]/generate-pack
 *
 * V1.0 — MOCK : génère un pack "factice" cohérent et l'attache à l'entrée.
 * V1.1 — appellera réellement atelier-social `/api/generate` (cf. TODO_INTEGRATION.md).
 *
 * Le mock crée une row dans planable_packs avec slides factices, caption,
 * hashtags + brand_safety_status='ok'. Permet à Sarah de tester le flow E2E
 * (Generate → Preview → Publish mock) sans dépendre d'atelier-social.
 */
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { checkBrandSafety } from "@/lib/brand/safety-check";

const FALLBACK_AMBIANCE = 1; // Studio Brut

interface OccasionMockTemplate {
  caption: (motif: string) => string;
  hashtags: string[];
  overlay: string;
}

// Ton CHALEUREUX / FAMILLE. Vocabulaire consumer : « brodé à la commande / dans notre
// atelier », JAMAIS de référence machine (« métier Tajima ») ni « fait main ».
const MOCK_NOTE = "\n\n[Aperçu V1 — texte affiné via atelier-social]";

const OCCASION_MOCK: Record<string, OccasionMockTemplate> = {
  saint_valentin: {
    caption: (m) => `Pour celui ou celle qui te connaît par cœur — un cadeau brodé à la commande, rien que pour vous deux.\n\nLes mots qu'on n'ose pas dire, on les brode. ${m}, brodé avec soin dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#SaintValentin", "#CadeauCouple", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Les mots qu'on n'ose pas dire, on les brode.",
  },
  fete_des_meres: {
    caption: (m) => `Pour ta maman, un cadeau brodé à la commande qui dit « je pense à toi » — à porter et à garder.\n\nLes petites attentions deviennent les plus grands souvenirs. ${m}, brodé avec tendresse dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#FêteDesMères", "#CadeauMaman", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Les petites attentions créent les plus grands souvenirs.",
  },
  fete_des_peres: {
    caption: (m) => `Pour ton papa, un cadeau brodé à la commande qui raconte ce qu'on ne dit pas toujours.\n\nÀ son image, à porter tous les jours. ${m}, brodé avec soin dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#FêteDesPères", "#BrodéSurMesure", "#CadeauPapa", "#AtelierFrançais"],
    overlay: "Pour les papas qui ont tout, sauf ce détail.",
  },
  rentree: {
    caption: (m) => `Pour la rentrée en famille, une pièce brodée à la commande qui les accompagne dès le premier jour.\n\nPersonnalisée et durable, faite pour grandir avec eux. ${m}, brodé dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#Rentrée", "#CadeauEnfant", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Brodé pour les premiers jours.",
  },
  mariage: {
    caption: (m) => `Pour les mariés, un cadeau brodé à la commande qu'ils garderont aussi longtemps que les vœux.\n\nUn souvenir doux, à leurs prénoms. ${m}, brodé dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#Mariage", "#CadeauMariés", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Pour ceux qui se disent oui.",
  },
  naissance: {
    caption: (m) => `Pour les tout premiers jours en famille, une pièce brodée à la commande qui marque l'arrivée.\n\nDouce, durable et pleine de tendresse. ${m}, brodé dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#Naissance", "#CadeauNaissance", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Brodé pour les tout débuts.",
  },
  noel: {
    caption: (m) => `Pour le pied du sapin, un cadeau brodé à la commande qui dure plus longtemps que les guirlandes.\n\nLe rituel doux des Noël en famille. ${m}, brodé avec soin dans notre atelier.${MOCK_NOTE}`,
    hashtags: ["#YPERSOA", "#Noël", "#CadeauNoël", "#BrodéSurMesure", "#AtelierFrançais"],
    overlay: "Brodé pour glisser sous le sapin.",
  },
};

const DEFAULT_MOCK: OccasionMockTemplate = {
  caption: (m) => `Un cadeau brodé à la commande, à ton image, qui raconte ton histoire.\n\nPersonnalisé et brodé avec soin dans notre atelier, pour celles et ceux qu'on aime. ${m}.${MOCK_NOTE}`,
  hashtags: ["#YPERSOA", "#BrodéSurMesure", "#AtelierFrançais", "#PersonnalisationFrançaise"],
  overlay: "Brodé pour toi, dans notre atelier.",
};

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();

    const { data: entry, error: entryErr } = await supabase
      .from("planable_calendar_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (entryErr) throw entryErr;
    if (!entry) return NextResponse.json({ ok: false, error: "Entrée introuvable" }, { status: 404 });

    // MOCK pack — TODO V1.1 : appeler atelier-social
    const tpl = (entry.occasion_slug && OCCASION_MOCK[entry.occasion_slug]) || DEFAULT_MOCK;
    const slidesCount = entry.platform === "instagram_post" ? 5 : 3;
    // Si une variante est choisie, on l'affiche dans le label MOCK
    const motifLabel = entry.variante_file
      ? `${entry.motif_code} (variante)`
      : entry.motif_code;
    const caption = tpl.caption(motifLabel);
    // Brand-safety réelle : scanne caption + overlay + hashtags (bloque « métier Tajima »,
    // « fait main », marketplaces… ; warning sur le vouvoiement).
    const safety = checkBrandSafety(caption, tpl.overlay, tpl.hashtags.join(" "));

    const mockPack = {
      motif_code: entry.motif_code,
      ambiance_id: FALLBACK_AMBIANCE,
      casting_ids: ["MAN-P06"], // mock — V1.1 calculera depuis occasion
      format: entry.format,
      slides: Array.from({ length: slidesCount }, (_, i) => ({
        index: i + 1,
        angle: ["Portrait Frontal", "Demi-Figure 3/4", "Détail Intimiste", "Scène Narrative", "Lifestyle Wide"][i],
        image_url: `https://placehold.co/${entry.format === "9:16" ? "1080x1920" : entry.format === "2:3" ? "1024x1536" : "1080x1350"}/FAF7F2/1A1614?text=${encodeURIComponent("MOCK " + motifLabel)}`,
        overlay_text: i === 0 ? tpl.overlay : null,
      })),
      caption,
      hashtags: tpl.hashtags,
      brand_safety_status: safety.status,
      brand_safety_issues: safety.issues.length > 0 ? safety.issues : null,
    };

    const { data: pack, error: packErr } = await supabase
      .from("planable_packs")
      .insert(mockPack)
      .select()
      .single();
    if (packErr) throw packErr;

    const { data: updated, error: updErr } = await supabase
      .from("planable_calendar_entries")
      .update({ pack_id: pack.id, status: "pack_generated" })
      .eq("id", id)
      .select()
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, data: { entry: updated, pack, mock: true } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
