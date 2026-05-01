/**
 * Builder déterministe d'un plan de shooting Ypersoa à partir d'un brief.
 *
 * V0 : pas de LLM, juste matching sur les référentiels (themes_index,
 * qualifiers_index, fenetres_commerciales). Couvre les 80% des briefs
 * explicites ("fête des mères + 3 générations afro-caribéennes" → match
 * direct sur thèmes + lignées).
 *
 * V1 (plus tard) : layer GPT/Claude pour parsing brief ambigu en amont,
 * fallback sur ce builder. Cf. SPEC_casting_intelligence.md.
 */
import {
  getAffinites,
  getCalendrier,
  getMannequins,
  type AffinitesNarratives,
  type RawCanonique,
} from "./referentiels-loader";

export interface ShootingBriefInput {
  texte_libre: string;
  motif_ypm_id?: string;
  motif_ypm_nom?: string;
  occasion?: string;
  ambiances_preferees?: string[];
  /** Lookbooks favoris ❤️ pinés comme ambiance custom — id Supabase. */
  ambiances_lookbook_ids?: string[];
  exclusions?: string[];
  date_cible?: string;
  format_attendu?: "instagram" | "pinterest" | "lookbook" | "shooting" | "hero-banner";
}

export interface ShootingPlanCanoniqueSuggestion {
  id: string;
  type: "duo" | "trio" | "solo";
  membres?: string[];
  prenoms: string[];
  score: number;
  raison: string;
  lieu?: string;
  ambiances_recommandees: string[];
}

export interface ShotlistEntry {
  ordre: number;
  angle: string;
  description: string;
  cadrage_type: string;
}

export interface ShootingPlanWarning {
  type: "info" | "warning" | "blocker";
  message: string;
}

export interface ShootingPlanOutput {
  brief_resume: string;
  occasion_detectee: string | null;
  motif_ypm: { id?: string; nom?: string } | null;
  casting_propose: ShootingPlanCanoniqueSuggestion[];
  ambiances_recommandees: string[];
  shotlist: ShotlistEntry[];
  hooks_temporels: Array<{ date_iso: string; evenement: string; canonique?: string }>;
  planning_estime: string;
  warnings: ShootingPlanWarning[];
  meta: { duration_ms: number; nb_dispositifs_examines: number; nb_canoniques_examines: number };
}

const SHOTLIST_TEMPLATE_5: Array<{ angle: string; description: string; cadrage_type: string }> = [
  {
    angle: "PORTRAIT_FRONTAL",
    description: "Portrait chest-up frontal direct, regard caméra avec sourire authentique. Stop-scroll.",
    cadrage_type: "Plan poitrine, fond uni, lumière douce diffuse",
  },
  {
    angle: "DEMI_FIGURE_3_4",
    description: "Plan taille avec léger 3/4. Broderie au cœur de la composition (lower third). Expression mi-sourire mi-pensée.",
    cadrage_type: "Plan taille, règle des tiers, broderie focal",
  },
  {
    angle: "DETAIL_INTIMISTE",
    description: "Close-up de la broderie ET un fragment humain (main, partie de visage, mèche de cheveux). JAMAIS flat lay pure.",
    cadrage_type: "Macro 90mm, profondeur de champ courte, grain film",
  },
  {
    angle: "SCENE_NARRATIVE",
    description: "Moment candide non-posé : tenir une tasse, ajuster un col, regarder par la fenêtre, lire. Cinematic still.",
    cadrage_type: "Plan moyen, scène vécue, broderie intégrée",
  },
  {
    angle: "LIFESTYLE_WIDE",
    description: "Plan large environnement, personne intégrée naturellement. Architecture/lumière/matières respirent autour.",
    cadrage_type: "Plan large, golden ratio, environnement éloquent",
  },
];

const SHOTLIST_TEMPLATE_3_PINTEREST: Array<{ angle: string; description: string; cadrage_type: string }> = [
  {
    angle: "DEMI_FIGURE_VERTICAL",
    description: "Format 2:3 vertical Pinterest. Plan taille, broderie clairement lisible.",
    cadrage_type: "2:3 vertical, plan taille",
  },
  {
    angle: "SCENE_NARRATIVE_VERTICAL",
    description: "Format 2:3 vertical. Moment vécu intégré.",
    cadrage_type: "2:3 vertical, plan moyen",
  },
  {
    angle: "LIFESTYLE_VERTICAL",
    description: "Format 2:3 vertical. Plan complet environnement.",
    cadrage_type: "2:3 vertical, plan large",
  },
];

function detectOccasion(brief: string): string | null {
  const lower = brief.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/\b(f[êe]te.*m[èe]re|mother|mama|maman)\b/i, "fete-meres"],
    [/\b(f[êe]te.*p[èe]re|father|papa)\b/i, "fete-peres"],
    [/\b(f[êe]te.*grand[\s-]m[èe]re|mamie|grand[\s-]mère)\b/i, "fete-grand-meres"],
    [/\b(f[êe]te.*grand[\s-]p[èe]re|papi|grand[\s-]père)\b/i, "fete-grand-peres"],
    [/\b(saint[\s-]valentin|valentin|amour|couple)\b/i, "saint-valentin"],
    [/\b(naissance|n[oô]el|newborn|baby|b[ée]b[ée])\b/i, "naissance"],
    [/\b(no[ëe]l|christmas)\b/i, "noel"],
    [/\b(rentr[ée]e|back[\s-]to[\s-]school)\b/i, "rentree-scolaire"],
    [/\b(anniversaire.*mariage|wedding[\s-]anniversary)\b/i, "anniversaire-mariage"],
    [/\b(evjf|enterrement.*vie.*jeune.*fille)\b/i, "evjf"],
    [/\b(weekend.*amies|girls)\b/i, "weekend-amies"],
    [/\b(ramadan)\b/i, "ramadan"],
    [/\b(martinique|antilles|caraibes)\b/i, "voyage-martinique"],
    [/\b(bretagne|br[ée]ton)\b/i, "vacances-mer-bretonne"],
    [/\b(avignon|festival)\b/i, "festivals-Avignon"],
  ];
  for (const [re, occ] of map) {
    if (re.test(lower)) return occ;
  }
  return null;
}

function getCanoniquePrenoms(membres: string[], mannequins: RawCanonique[]): string[] {
  return membres
    .map((id) => {
      // Gérer les sous-IDs comme MAN-P11-LEA
      const baseId = id.includes("-") && id.split("-").length > 2 ? id.split("-").slice(0, 2).join("-") : id;
      const c = mannequins.find((m) => m.id === id || m.id === baseId);
      if (!c) return id;
      // Pour MAN-P11 (couple), on extrait le sous-prénom selon le suffixe
      if (id.endsWith("-LEA")) return "Léa";
      if (id.endsWith("-SARAH")) return "Sarah";
      if (id.endsWith("-HENRI")) return "Henri";
      if (id.endsWith("-JOSEPHINE")) return "Joséphine";
      return c.prenom;
    });
}

function scoreDispositif(
  d: AffinitesNarratives["dispositifs_etablis"][number],
  occasion: string | null,
  ambiancesPreferees: string[],
  briefLower: string
): number {
  let score = 0;
  if (occasion && d.themes_compatibles.includes(occasion)) score += 5;
  if (occasion && d.occasions_clientes.some((o) => o.includes(occasion.replace("fete-", "")))) score += 2;
  for (const amb of ambiancesPreferees) {
    if (d.ambiances_recommandees.includes(amb)) score += 2;
  }
  // Bonus si la nature ou le lieu apparaît dans le brief
  if (d.lieu && briefLower.includes(d.lieu.toLowerCase().split(" ")[0])) score += 1;
  for (const q of d.qualifiers) {
    if (briefLower.includes(q.replace(/-/g, " "))) score += 1;
  }
  return score;
}

export async function buildShootingPlan(input: ShootingBriefInput): Promise<ShootingPlanOutput> {
  const start = Date.now();
  const brief = input.texte_libre.trim();
  const briefLower = brief.toLowerCase();

  const { mannequins } = getMannequins();
  const affinites = getAffinites();
  const calendrier = getCalendrier();

  const occasion = input.occasion || detectOccasion(brief);
  const ambiancesPreferees = input.ambiances_preferees || [];
  const exclusions = input.exclusions || [];

  // Score chaque dispositif établi
  const scored = affinites.dispositifs_etablis
    .filter((d) => !d.membres.some((m) => exclusions.includes(m)))
    .map((d) => ({
      d,
      score: scoreDispositif(d, occasion, ambiancesPreferees, briefLower),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5);

  const casting_propose: ShootingPlanCanoniqueSuggestion[] = top.map(({ d, score }) => ({
    id: d.id,
    type: d.type,
    membres: d.membres,
    prenoms: getCanoniquePrenoms(d.membres, mannequins),
    score,
    raison: `Match ${occasion ? `occasion "${occasion}"` : "brief"} (${d.qualifiers.slice(0, 3).join(", ")})`,
    lieu: d.lieu,
    ambiances_recommandees: d.ambiances_recommandees,
  }));

  // Si aucun dispositif ne matche, suggérer 3 canoniques solos selon brief
  if (casting_propose.length === 0) {
    const fallback = mannequins.slice(0, 3).map((m) => ({
      id: m.id,
      type: "solo" as const,
      prenoms: [m.prenom],
      score: 1,
      raison: "Aucune occasion détectée — suggestion par défaut casting principal",
      lieu: m.lieu_de_vie,
      ambiances_recommandees: [],
    }));
    casting_propose.push(...fallback);
  }

  // Ambiances recommandées : agrégation depuis les dispositifs sélectionnés
  const ambiancesAgg = new Map<string, number>();
  for (const c of casting_propose) {
    for (const a of c.ambiances_recommandees) {
      ambiancesAgg.set(a, (ambiancesAgg.get(a) || 0) + 1);
    }
  }
  const ambiances_recommandees = Array.from(ambiancesAgg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([a]) => a);

  // Hooks temporels : anniversaires + fenêtres commerciales matchées
  const hooks_temporels: ShootingPlanOutput["hooks_temporels"] = [];
  if (occasion) {
    const fenetres = calendrier.fenetres_commerciales_ypersoa.fenetres.filter((f) =>
      f.nom.toLowerCase().includes(occasion.replace("fete-", "")) ||
      f.canoniques_pertinents.some((id) => casting_propose.some((c) => c.membres?.includes(id) || c.id === id))
    );
    for (const f of fenetres.slice(0, 3)) {
      hooks_temporels.push({
        date_iso: f.date,
        evenement: `${f.nom} — angle "${f.angle}"`,
      });
    }
  }
  // Anniversaires des canoniques sélectionnés
  for (const c of casting_propose) {
    const ids = c.membres || [c.id];
    for (const id of ids) {
      const anniv = calendrier.anniversaires.find((a) => a.id === id);
      if (anniv) {
        hooks_temporels.push({
          date_iso: anniv.date,
          evenement: `Anniversaire ${anniv.prenom} (${anniv.age} ans)`,
          canonique: id,
        });
      }
    }
  }

  // Shotlist selon format
  const isPinterest = input.format_attendu === "pinterest";
  const shotlistTemplate = isPinterest ? SHOTLIST_TEMPLATE_3_PINTEREST : SHOTLIST_TEMPLATE_5;
  const shotlist: ShotlistEntry[] = shotlistTemplate.map((s, idx) => ({
    ordre: idx + 1,
    angle: s.angle,
    description: s.description,
    cadrage_type: s.cadrage_type,
  }));

  // Planning estimé
  const nbShots = shotlist.length;
  const planning_estime = isPinterest
    ? `~3-4h shooting (3 shots verticaux 2:3) + 2h post-prod brand-safety`
    : `~½ journée shooting (${nbShots} shots) + 2-3h post-prod overlay/captions`;

  // Brief résumé
  const motifResume = input.motif_ypm_nom
    ? `motif ${input.motif_ypm_nom}${input.motif_ypm_id ? ` (${input.motif_ypm_id})` : ""}`
    : input.motif_ypm_id || "motif non précisé";
  const occasionResume = occasion ? `occasion "${occasion}"` : "occasion non détectée";
  const brief_resume = `${occasionResume} — ${motifResume} — brief : "${brief.slice(0, 120)}${brief.length > 120 ? "..." : ""}"`;

  // Warnings
  const warnings: ShootingPlanWarning[] = [];
  if (!occasion) {
    warnings.push({
      type: "info",
      message: "Aucune occasion explicite détectée dans le brief. Le casting suggéré est basé sur les qualifiers et lieux mentionnés.",
    });
  }
  if (!input.motif_ypm_id) {
    warnings.push({
      type: "warning",
      message: "Aucun motif YPM précisé. Le plan reste générique — précise le motif pour activer la cohérence brand.",
    });
  }
  if (casting_propose.every((c) => c.score < 3)) {
    warnings.push({
      type: "warning",
      message: "Match faible — aucun dispositif canonique ne correspond fortement au brief. Reformule ou pin un canonique manuellement.",
    });
  }

  // Ambiances lookbook pinées (custom) → ajoutées en tête des recommandées
  if (input.ambiances_lookbook_ids?.length) {
    const lookbookAmbiances = input.ambiances_lookbook_ids.map((id) => `lookbook:${id}`);
    ambiances_recommandees.unshift(...lookbookAmbiances);
  }

  return {
    brief_resume,
    occasion_detectee: occasion,
    motif_ypm: input.motif_ypm_id || input.motif_ypm_nom ? { id: input.motif_ypm_id, nom: input.motif_ypm_nom } : null,
    casting_propose,
    ambiances_recommandees,
    shotlist,
    hooks_temporels,
    planning_estime,
    warnings,
    meta: {
      duration_ms: Date.now() - start,
      nb_dispositifs_examines: affinites.dispositifs_etablis.length,
      nb_canoniques_examines: mannequins.length,
    },
  };
}
