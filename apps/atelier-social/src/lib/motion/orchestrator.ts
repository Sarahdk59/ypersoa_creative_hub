/**
 * Atelier Motion — orchestrateur des 3 modes.
 *
 * Construit les ClipPlan[] selon le mode + lance les générations via l'engine,
 * met à jour le job dans le store au fil de la progression.
 */

import type {
  ClipPlan,
  CreateMotionJobInput,
  MotionJob,
  MotionSource,
} from "@/types/motion";
import {
  createMotionEngine,
  type EngineConfig,
  type MotionEngineClient,
} from "./engine";
import {
  promptAmbiance,
  promptCanonique,
  promptPackshot,
  promptReelClip,
  selectShotsForReel,
} from "./prompts";
import {
  computeStatut,
  createMotionJob,
  updateMotionJob,
} from "./store";
import { getLookbookSource, getSource } from "./hub-gateway";

export interface RunJobOptions {
  /** Override de l'engine (sinon : ATELIER_MOTION_ENGINE env, défaut stub). */
  engine?: EngineConfig["engine"];
  /** Lancer en parallèle (défaut séquentiel pour respecter quotas Veo/Omni). */
  parallele?: boolean;
}

/**
 * Construit les ClipPlan[] selon le mode (sans appeler l'API encore).
 */
async function buildPlans(
  job: MotionJob,
  source: MotionSource,
  lookbookStyleUrl?: string | null,
): Promise<ClipPlan[]> {
  if (job.mode === "reel" && source.type === "collection") {
    const shots = selectShotsForReel(source.shots, job.format ?? "court");
    return shots.map(
      (s, i) =>
        ({
          ordre: i + 1,
          shot_type: s.shot_type,
          asset_sujet_url: s.public_url,
          asset_style_url: lookbookStyleUrl ?? undefined,
          prompt_mouvement: promptReelClip(s.shot_type, job.brief),
          duree_sec: 8,
          clip_url: null,
          statut: "en_attente",
        }) satisfies ClipPlan,
    );
  }

  if (job.mode === "ambiance") {
    // Toutes sources photo unique acceptées (lookbook, like, canonique, media, packshot)
    const url = sourceImageUrl(source);
    if (!url) throw new Error(`Source ambiance sans image : ${source.type}`);
    return [
      {
        ordre: 1,
        shot_type: source.type === "canonique" ? "PORTRAIT ÉDITORIAL" : "AMBIANCE",
        asset_sujet_url: url,
        asset_style_url: lookbookStyleUrl ?? undefined,
        prompt_mouvement:
          source.type === "canonique"
            ? promptCanonique(job.brief)
            : promptAmbiance(job.brief),
        duree_sec: 8,
        clip_url: null,
        statut: "en_attente",
      },
    ];
  }

  if (job.mode === "packshot") {
    // Toutes sources photo unique acceptées
    const url = sourceImageUrl(source);
    if (!url) throw new Error(`Source packshot sans image : ${source.type}`);
    return [
      {
        ordre: 1,
        shot_type:
          source.type === "canonique"
            ? "PORTRAIT ÉDITORIAL"
            : source.type === "packshot"
              ? "PACKSHOT"
              : "OBJET / PROP",
        asset_sujet_url: url,
        asset_style_url: lookbookStyleUrl ?? undefined,
        prompt_mouvement:
          source.type === "canonique"
            ? promptCanonique(job.brief)
            : promptPackshot("rotation", job.brief),
        duree_sec: 8,
        clip_url: null,
        statut: "en_attente",
      },
    ];
  }

  throw new Error(`Incohérence mode/source : ${job.mode} / ${source.type}`);
}

function sourceImageUrl(source: MotionSource): string | null {
  if (source.type === "collection") return source.shots[0]?.public_url ?? null;
  return source.public_url;
}

export interface StartJobInput extends CreateMotionJobInput {
  /** Optionnel : style image pour mode reel (lookbook id). */
  lookbook_id?: string | null;
}

/**
 * Crée un job, lance la génération en arrière-plan (fire-and-forget côté
 * appelant), et retourne le job initial pour que l'UI puisse poller.
 */
export async function startMotionJob(
  input: StartJobInput,
  options: RunJobOptions = {},
): Promise<MotionJob> {
  const source = await getSource(input.mode, input.source_id);
  if (!source) {
    throw new Error(`Source ${input.mode}/${input.source_id} introuvable`);
  }
  const sourceLabel = source.type === "collection" ? source.label : source.label;

  const engine: EngineConfig["engine"] =
    options.engine ??
    (process.env.ATELIER_MOTION_ENGINE as EngineConfig["engine"]) ??
    "stub";

  const job = await createMotionJob({
    ...input,
    engine,
    source_label: sourceLabel,
  });

  // Lance en arrière-plan, pas d'await ici
  void runJobInBackground(job, options).catch(async (err) => {
    await updateMotionJob(job.id, {
      statut: "echec",
      a_faire_manuel: [
        `Erreur orchestrateur : ${err instanceof Error ? err.message : String(err)}`,
      ],
    });
  });

  return job;
}

async function runJobInBackground(
  job: MotionJob,
  options: RunJobOptions,
): Promise<void> {
  // 1. Résoudre la source + lookbook style (mode reel)
  const source = await getSource(job.mode, job.source_id);
  if (!source) throw new Error(`Source ${job.source_id} disparue`);

  let styleUrl: string | null = null;
  if (job.mode === "reel" && job.lookbook_id) {
    const lb = await getLookbookSource(job.lookbook_id);
    styleUrl = lb?.public_url ?? null;
  }

  // 2. Construire les plans
  const plans = await buildPlans(job, source, styleUrl);
  await updateMotionJob(job.id, {
    clips: plans,
    statut: "en_cours",
  });

  // 3. Créer l'engine
  const engineClient: MotionEngineClient = createMotionEngine({
    engine: options.engine ?? job.engine,
  });

  // 4. Génération (séquentielle par défaut pour respecter les quotas)
  const out: ClipPlan[] = [];
  if (options.parallele) {
    const results = await Promise.all(
      plans.map(async (p) => runOnePlan(p, engineClient)),
    );
    out.push(...results);
  } else {
    for (const p of plans) {
      const r = await runOnePlan(p, engineClient);
      out.push(r);
      // Update partial dans le store pour permettre au polling UI de voir l'avancée
      await updateMotionJob(job.id, {
        clips: [...out, ...plans.slice(out.length)],
      });
    }
  }

  // 5. Statut final
  const statut = computeStatut(out);
  const dureeTotale = out.filter((c) => c.statut === "genere").reduce(
    (s, c) => s + c.duree_sec,
    0,
  );

  await updateMotionJob(job.id, {
    clips: out,
    statut,
    duree_totale_sec: dureeTotale,
    a_faire_manuel: buildAFaireManuel(job, out),
  });
}

async function runOnePlan(
  plan: ClipPlan,
  engine: MotionEngineClient,
): Promise<ClipPlan> {
  const updated: ClipPlan = { ...plan, statut: "en_cours" };
  const result = await engine.generateClip(updated);
  if (result.error || !result.clip_url) {
    return {
      ...updated,
      statut: "echec",
      erreur: result.error ?? "Réponse vide",
    };
  }
  return {
    ...updated,
    statut: "genere",
    clip_url: result.clip_url,
  };
}

function buildAFaireManuel(job: MotionJob, clips: ClipPlan[]): string[] {
  const lines: string[] = [];
  const ko = clips.filter((c) => c.statut === "echec");
  if (ko.length > 0) {
    lines.push(
      `Re-générer ${ko.length} clip${ko.length > 1 ? "s" : ""} en échec : ` +
        ko.map((c) => `clip ${c.ordre}${c.erreur ? ` (${c.erreur})` : ""}`).join(", "),
    );
  }
  if (job.mode === "reel") {
    lines.push(
      "Assembler les clips dans l'ordre (montage A/V) — l'engine sort des clips isolés, pas un Reel monté.",
      "Choisir et caler le son tendance Instagram — aucune API ne fournit légalement les audios viraux.",
      "Incruster hook + sous-titres animés (copy depuis Atelier Social).",
      "Contrôle qualité final : cohérence mannequin entre clips, rendu terracotta, relief broderie.",
      "Publier dans apps/planable-ypersoa à la date prévue.",
    );
  } else if (job.mode === "ambiance") {
    lines.push(
      "Ajouter musique d'ambiance instrumentale au montage (lo-fi, piano contemplatif).",
      "Possible boucle infinie pour intégration site (header lookbook).",
      "Export en plusieurs ratios si réutilisation hors 9:16 (16:9 pour hero web, 1:1 pour grid).",
    );
  } else if (job.mode === "packshot") {
    lines.push(
      "Intégrer dans la fiche produit Shopify comme vidéo galerie (Shopify accepte MP4 ≤ 4 Go).",
      "Possible auto-loop sans son sur la PDP.",
      "Si plusieurs variations souhaitées (rotation + zoom + swing), relancer le job 2-3 fois avec une variation différente.",
    );
  }
  return lines;
}
