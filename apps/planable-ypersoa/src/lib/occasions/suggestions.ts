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
}

const SUGGESTIONS_HORIZON_DAYS = 60;

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
  mariage: [3, 5],             // L'Aube Intime, Lumière Sépia
  naissance: [3, 2],           // L'Aube Intime, Loft Organique
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
    const urgency = computeUrgency(deadline, occurrence, today);

    out.push({
      occasion: occ,
      occurrence,
      buy_by_deadline: deadline,
      urgency,
      has_special_campaign: occ.slug in SPECIAL_CAMPAIGNS,
      candidate_packs: pickCandidatePacks(occ, urgency),
      disabled_this_cycle: occ.auto_campaign_disabled_year === currentYear,
    });
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
  if (urgency.kind === "engagement_only") {
    return `Mode engagement uniquement (RDV commande manqué) — caption émotion sans CTA achat. Motif ${motif} sur ${casting}.`;
  }
  return `Pack candidat ${occ.name_fr} — motif ${motif} × ${casting}.`;
}
