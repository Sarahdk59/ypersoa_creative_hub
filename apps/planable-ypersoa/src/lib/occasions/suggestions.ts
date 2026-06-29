/**
 * Génération des suggestions affichées dans SuggestionsPanel.
 *
 * Pour chaque occasion (active dans l'année courante) :
 *  - Calcule next_occurrence + buy_by_deadline + urgence
 *  - Filtre celles dans la fenêtre de visibilité (60 prochains jours par défaut)
 *  - Génère 3 packs candidats (motif × ambiance × casting)
 *  - Indique si une campagne complète est disponible (special-campaigns)
 */
import { buyByDeadline, computeUrgency, nextOccurrence, type OccasionUrgency } from "./calculator";
import { SPECIAL_CAMPAIGNS } from "./special-campaigns";
import type { PlanableOccasionRow } from "@/lib/supabase/types";

export interface CandidatePack {
  motif_code: string;
  ambiance_id: number;
  casting_ids: string[];
  rationale: string;
}

export interface OccasionSuggestion {
  occasion: PlanableOccasionRow;
  occurrence: Date;
  buy_by_deadline: Date;
  urgency: OccasionUrgency;
  has_special_campaign: boolean;
  candidate_packs: CandidatePack[];
  /** Vrai si l'occasion est masquée pour le cycle courant (auto_campaign_disabled_year). */
  disabled_this_cycle: boolean;
  /** Moment éditorial evergreen (season:1-12) → vit dans la banque d'angles, pas dans le flux daté. */
  is_evergreen: boolean;
  /** Evergreen mis "à la une" cette semaine par la rotation hebdo. */
  featured_this_week: boolean;
}

const SUGGESTIONS_HORIZON_DAYS = 60;
/** Nombre d'evergreen mis à la une chaque semaine (rotation déterministe). */
const EVERGREEN_FEATURED_PER_WEEK = 3;

/**
 * Pondération ambiance par occasion — heuristique simple.
 * Ambiance IDs cf. atelier-social/lib/ambiances-officielles.ts (1-6).
 */
const AMBIANCE_BY_OCCASION: Record<string, number[]> = {
  fete_des_peres: [1, 4],      // Studio Brut, Échappée Sauvage
  fete_des_meres: [3, 2],      // L'Aube Intime, Loft Organique
  saint_valentin: [3, 5],      // L'Aube Intime, Lumière Sépia
  noel: [2, 5],                // Loft Organique, Lumière Sépia
  rentree: [1, 2],             // Studio Brut, Loft Organique
  rentree_universitaire: [1, 2],
  mariage: [3, 5],             // L'Aube Intime, Lumière Sépia
  naissance: [3, 2],           // L'Aube Intime, Loft Organique
  fete_des_grands_meres: [3, 5], // L'Aube Intime, Lumière Sépia
  fete_des_grands_peres: [2, 1], // Loft Organique, Studio Brut
  merci_maitresse: [3, 2],
  anniversaire: [2, 1],
  voila_lete: [4, 5],          // Échappée Sauvage, Lumière Sépia
  automne: [2, 5],             // Loft Organique, Lumière Sépia
  hiver: [2, 5],
  printemps: [3, 2],           // L'Aube Intime, Loft Organique
  halloween: [1, 5],
  black_friday: [1, 2],        // Studio Brut, Loft Organique (offre, sobre)
  // Moments éditoriaux (engagement, sans deadline commande)
  tennis_club: [2, 1],         // Loft Organique, Studio Brut (preppy net)
  vacances_mer: [4, 5],        // Échappée Sauvage, Lumière Sépia
  rentree_non: [1, 2],
  galentine: [5, 3],           // Lumière Sépia, L'Aube Intime
  sista_club_apero: [2, 4],
  slow_sunday: [3, 2],         // L'Aube Intime, Loft Organique
  canicule: [5, 4],
  retour_pull: [5, 2],
  nouvel_an: [1, 2],
  brunch_club: [2, 3],
  // Lot 2 — angles cadeau / RH / régional (idées Sarah)
  cadeau_derniere_minute: [1, 2],
  secret_santa: [2, 5],
  anti_cadeau_nul: [1, 2],
  il_a_deja_tout: [1, 2],
  pot_de_depart: [2, 1],
  cremaillere: [2, 3],
  doudou_de_grand: [3, 5],
  je_me_fais_cadeau: [1, 3],
  braderie_lille: [4, 1],
  journee_du_calin: [3, 5],
  cadeau_reconciliation: [3, 5],
  parents_epuises: [3, 2],
  // Territoire couple / mariage — #brodéàdeux
  noces_coton: [3, 5],
  date_brodee: [1, 3],
  cadeau_mariage: [3, 5],
  notre_date: [5, 3],
  on_emenage: [2, 3],
  on_se_dit_oui: [3, 5],
  vie_de_couple: [2, 5],
  brode_a_distance: [1, 5],
  // Noël / fin d'année + coulisses (tournage Collection 27)
  pull_noel: [2, 5],
  au_pied_du_sapin: [5, 3],
  reveillon: [5, 2],
  bilan_annee: [1, 3],
  dans_atelier: [1, 2],
  nouvelle_collection: [1, 2],
};

export function buildSuggestions(
  occasions: PlanableOccasionRow[],
  today: Date = new Date()
): OccasionSuggestion[] {
  const currentYear = today.getFullYear();
  const horizonMs = SUGGESTIONS_HORIZON_DAYS * 86_400_000;

  const out: OccasionSuggestion[] = [];

  for (const occ of occasions) {
    const occurrence = nextOccurrence(occ.date_strategy, today);

    // Filtre horizon : on ne montre que les occasions dont l'occurrence
    // est dans les SUGGESTIONS_HORIZON_DAYS prochains jours.
    if (occurrence.getTime() - today.getTime() > horizonMs) continue;

    // Si l'occasion est désactivée pour le cycle courant → skip totalement.
    const occYear = occurrence.getFullYear();
    if (occ.auto_campaign_disabled_year === occYear) continue;

    const deadline = buyByDeadline(occurrence, occ.lead_days);
    const isSeasonal = occ.date_strategy.startsWith("season:");
    // Urgence :
    //  - editorial    → moment de vie, aucune deadline commande (point ✨).
    //  - marche daté  → countdown classique (computeUrgency).
    //  - marche saisonnier EN COURS (occurrence = aujourd'hui, deadline déjà passée)
    //    → ce n'est PAS un "RDV manqué" mais une commande au fil de l'eau : statut `rolling`.
    //    Corrige anniversaire / naissance / mariage / noces de coton, etc.
    let urgency: OccasionUrgency;
    if (occ.kind === "editorial") {
      urgency = { kind: "editorial", daysToOccurrence: Math.ceil((occurrence.getTime() - today.getTime()) / 86_400_000) };
    } else {
      const u = computeUrgency(deadline, occurrence, today);
      urgency = u.kind === "engagement_only" && isSeasonal
        ? { kind: "rolling", leadDays: occ.lead_days }
        : u;
    }

    // Evergreen = moment éditorial 100% always-on (season:1-12) : pas de point
    // temporel, il vit dans la banque d'angles « une idée ? » et tourne 3/semaine.
    const isEvergreen = occ.kind === "editorial" && occ.date_strategy === "season:1-12";

    out.push({
      occasion: occ,
      occurrence,
      buy_by_deadline: deadline,
      urgency,
      has_special_campaign: occ.slug in SPECIAL_CAMPAIGNS,
      candidate_packs: pickCandidatePacks(occ, urgency),
      disabled_this_cycle: occ.auto_campaign_disabled_year === currentYear,
      is_evergreen: isEvergreen,
      featured_this_week: false,
    });
  }

  // --- Rotation hebdo des evergreen : 3 mis à la une, qui changent chaque semaine ---
  const evergreen = out
    .filter((s) => s.is_evergreen)
    .sort((a, b) => a.occasion.slug.localeCompare(b.occasion.slug)); // ordre stable
  if (evergreen.length > 0) {
    const week = Math.floor(today.getTime() / (7 * 86_400_000)); // n° de semaine ISO-ish
    const take = Math.min(EVERGREEN_FEATURED_PER_WEEK, evergreen.length);
    const start = ((week * take) % evergreen.length + evergreen.length) % evergreen.length;
    for (let i = 0; i < take; i++) {
      evergreen[(start + i) % evergreen.length].featured_this_week = true;
    }
  }

  // Tri : plus urgent (deadline la plus proche) en premier.
  out.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  return out;
}

function urgencyRank(u: OccasionUrgency): number {
  switch (u.kind) {
    case "engagement_only": return -1; // tout en haut, signal RDV manqué
    case "critical": return 0;
    case "high": return 1;
    case "medium": return 2;
    case "editorial": return 2.5; // après le commerce urgent, mais visible
    case "rolling": return 2.7;   // commerce au fil de l'eau, pas urgent
    case "low": return 3;
  }
}

/**
 * Tire 3 combinaisons (motif × ambiance × casting) cohérentes pour une occasion.
 * Pas de tirage aléatoire en V1 : on prend les 3 premiers motifs × premiers casting/duos
 * pour rester déterministe (debug + tests). Random ou pondéré → V2.
 */
function pickCandidatePacks(occ: PlanableOccasionRow, urgency: OccasionUrgency): CandidatePack[] {
  if (occ.recommended_motifs.length === 0) return [];

  const ambiances = AMBIANCE_BY_OCCASION[occ.slug] ?? [1, 2];
  const castingPool: string[] = [...occ.recommended_duos, ...occ.recommended_casting];
  if (castingPool.length === 0) castingPool.push("MAN-P01"); // fallback Clémence

  const packs: CandidatePack[] = [];
  for (let i = 0; i < 3; i++) {
    const motif = occ.recommended_motifs[i % occ.recommended_motifs.length];
    const ambiance = ambiances[i % ambiances.length];
    const casting = castingPool[i % castingPool.length];
    packs.push({
      motif_code: motif,
      ambiance_id: ambiance,
      casting_ids: [casting],
      rationale: rationaleFor(occ, urgency, motif, casting),
    });
  }
  return packs;
}

function rationaleFor(
  occ: PlanableOccasionRow,
  urgency: OccasionUrgency,
  motif: string,
  casting: string
): string {
  if (urgency.kind === "editorial") {
    return `Moment éditorial ${occ.name_fr} — contenu engagement / reach, caption ton de marque sans CTA deadline. Motif ${motif} sur ${casting}.`;
  }
  if (urgency.kind === "engagement_only") {
    return `Mode engagement uniquement (RDV commande manqué) — caption émotion sans CTA achat. Motif ${motif} sur ${casting}.`;
  }
  return `Pack candidat ${occ.name_fr} — motif ${motif} × ${casting}.`;
}
