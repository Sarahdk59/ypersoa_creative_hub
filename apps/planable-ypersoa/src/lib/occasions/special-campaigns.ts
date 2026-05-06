/**
 * Briefs spécifiques de campagnes annuelles — hardcodés pour V1.0.
 * Utilisés par SuggestionsPanel quand Sarah clique "Planifier la campagne complète" :
 * le `publication_plan` est expandé en N entrées draft d'un coup.
 *
 * À terme (V2) ces briefs vivent en DB et Sarah peut les éditer via UI.
 *
 * Rappel formule : buy_by_deadline = occurrence - lead_days (10 par défaut, 15 Noël).
 */
import type { PlanablePlatform, PlanableMediaFormat } from "@/lib/supabase/types";

export interface PublicationSlot {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  platform: PlanablePlatform;
  motif_code: string;
  format: PlanableMediaFormat;
  focus: string;      // Note éditoriale interne
}

export interface SpecialCampaignBrief {
  occasion_slug: string;
  occurrence: string;             // YYYY-MM-DD
  buy_by_deadline: string;        // YYYY-MM-DD
  engagement_only_window: [string, string];
  campaign_start: string;
  shoot_brief: {
    individual_portraits: { canonique: string; prenom: string }[];
    trio_shot?: {
      canoniques: string[];
      ambiance_suggested: number;
      notes: string;
    };
    duo_classique?: {
      canoniques: string[];
      ambiance_suggested: number;
      notes: string;
    };
    notes_for_adriana_mai: string;
  };
  publication_plan: PublicationSlot[];
}

/**
 * Fête des Pères 2026 — brief opérationnel complet.
 * 6 semaines de conversion (1/05 → 11/06) puis 10 jours engagement (12-21/06).
 * Total 19 entrées planifiées (Insta posts + reels + stories + Pinterest).
 */
export const FETE_DES_PERES_2026_BRIEF: SpecialCampaignBrief = {
  occasion_slug: "fete_des_peres",
  occurrence: "2026-06-21",
  buy_by_deadline: "2026-06-11",
  engagement_only_window: ["2026-06-12", "2026-06-21"],
  campaign_start: "2026-05-01",

  shoot_brief: {
    individual_portraits: [
      { canonique: "MAN-P06", prenom: "Mathieu" },
      { canonique: "MAN-S18", prenom: "Hassan" },
      { canonique: "MAN-S19", prenom: "Henri" },
    ],
    trio_shot: {
      canoniques: ["MAN-S19", "MAN-P07", "MAN-S14"],
      ambiance_suggested: 2,
      notes:
        "TRIO patrilinéaire 3 générations Henri + Nicolas + Gaspard. Pas de pose figée — moment de rire ou échange. Loft Organique, fond béton ciré + lumière diffusée.",
    },
    duo_classique: {
      canoniques: ["MAN-P06", "MAN-P09"],
      ambiance_suggested: 3,
      notes:
        "DUO papa-fils signature Mathieu + Gabin. Cadrage demi-figure, complicité naturelle. L'Aube Intime.",
    },
    notes_for_adriana_mai:
      "Briefer planning shoot avant 7 mai pour livrer rushes le 12 mai max (démarrage publication semaine 3).",
  },

  publication_plan: [
    // SEMAINE 1 — Awareness (1-3 mai) — pas de CTA
    { date: "2026-05-01", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Teasing — gros plan main paternelle sur t-shirt brodé. Caption : \"Le mois des papas commence.\" Pas de CTA encore." },

    // SEMAINE 2 — Reveal casting (4-10 mai)
    { date: "2026-05-04", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Portrait Mathieu seul. Hook ÉMOTION. Premier CTA discret \"personnalise le tien\"." },
    { date: "2026-05-07", time: "19:00", platform: "instagram_reel", motif_code: "YPM-006", format: "9:16",
      focus: "Reel making-of broderie initiales papa sur métier Tajima." },

    // SEMAINE 3 — Storytelling hero (11-17 mai)
    { date: "2026-05-11", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "DUO Mathieu + Gabin (pack 5 slides). Caption narrative tendresse + transmission." },
    { date: "2026-05-13", time: "09:00", platform: "pinterest_pin", motif_code: "YPM-006", format: "2:3",
      focus: "Pack Pinterest 3 angles Mathieu (A/B test)." },
    { date: "2026-05-15", time: "19:00", platform: "instagram_reel", motif_code: "YPM-011", format: "9:16",
      focus: "Reel détail textile — broderie close-up." },

    // SEMAINE 4 — Diversité casting + soft CTA (18-24 mai)
    { date: "2026-05-18", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Portrait Hassan seul. CTA achat affirmé. \"Pour les papas en mode terrain.\"" },
    { date: "2026-05-22", time: "19:00", platform: "instagram_post", motif_code: "YPM-011", format: "4:5",
      focus: "Variant motif YPM-011 sur Mathieu." },

    // SEMAINE 5 — Pic émotionnel (25-31 mai)
    { date: "2026-05-25", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "TRIO Henri + Nicolas + Gaspard (pack 5 slides hero campagne). Caption multi-générations." },
    { date: "2026-05-28", time: "12:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story coulisses du shoot trio." },

    // SEMAINE 6 — Conversion + montée en urgence (1-7 juin)
    { date: "2026-06-01", time: "19:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Portrait Henri seul. CTA \"il reste 10 jours pour personnaliser\"." },
    { date: "2026-06-04", time: "19:00", platform: "instagram_reel", motif_code: "YPM-006", format: "9:16",
      focus: "Reel UGC ou témoignage client (si dispo) sinon making-of broderie." },
    { date: "2026-06-05", time: "12:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story countdown J-6 deadline." },
    { date: "2026-06-07", time: "11:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Récap campagne — pack carrousel meilleurs visuels. Caption \"deadline jeudi 11/06\"." },

    // SEMAINE 7 — DERNIÈRE CHANCE (8-11 juin)
    { date: "2026-06-08", time: "19:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story J-3 sticker compte à rebours." },
    { date: "2026-06-09", time: "12:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story J-2." },
    { date: "2026-06-10", time: "09:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "POST DERNIÈRE CHANCE. Hook AFFIRMATION. CTA très clair, lien shop, \"demain c'est trop tard\"." },
    { date: "2026-06-10", time: "19:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story soir J-1 sticker compte à rebours horaire." },
    { date: "2026-06-11", time: "09:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story matin DERNIER JOUR." },
    { date: "2026-06-11", time: "20:00", platform: "instagram_story", motif_code: "YPM-006", format: "9:16",
      focus: "Story soir CLOSING — lien shop dernière fois avant fermeture commande." },

    // SEMAINES 8-9 — Engagement only (12-21 juin)
    { date: "2026-06-21", time: "11:00", platform: "instagram_post", motif_code: "YPM-006", format: "4:5",
      focus: "Post Fête des Pères. Caption uniquement émotion + remerciement papas. AUCUN CTA achat (RDV manqué côté commande)." },
  ],
};

/**
 * Map slug → brief. Étendre quand on hardcode d'autres campagnes (Noël 2026, etc.).
 * Pas de FETE_DES_MERES_2026 : campagne déjà gérée hors Planable, occasion masquée
 * via auto_campaign_disabled_year=2026 côté DB.
 */
export const SPECIAL_CAMPAIGNS: Record<string, SpecialCampaignBrief> = {
  fete_des_peres: FETE_DES_PERES_2026_BRIEF,
};
