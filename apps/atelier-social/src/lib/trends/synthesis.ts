/**
 * Atelier Trends — couche de synthèse IA (serveur only) — Lot 3.
 *
 * C'est le cœur de l'outil : transforme des tendances brutes en tendances
 * ACTIONNABLES pour la broderie Ypersoa. Pour chaque tendance, gpt-4o évalue :
 *   - pertinence_ypersoa (0-10), raison
 *   - occasion liée (marronnier) + motif YPM suggéré (snap déterministe sur
 *     `pinterest_strategy.json` — pas inventé par GPT)
 *   - créneau Planable J-45 (règle des 45 jours, calcul déterministe)
 *   - angle de caption (tutoiement, vocab consumer)
 *   - brand_safe (checkBrandSafety + vocabulaire interdit Pinterest)
 *
 * CDC : docs/CDC_ATELIER_TRENDS.md §3.
 */

import OpenAI from "openai";
import { loadPinterestStrategy } from "@/lib/pinterest-strategy.server";
import { checkBrandSafety } from "@/lib/brand-rules";
import {
  creneauPlanable,
  OCCASION_LABELS,
  type Trend,
  type TrendEnrichissement,
  type TrendsSnapshot,
  type TrendType,
} from "./trends";

interface GptResult {
  index: number;
  type?: TrendType;
  pertinence?: number;
  raison?: string;
  occasion?: string | null;
  motif_fiche_id?: string | null;
  angle_caption?: string | null;
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** Enrichit un snapshot brut via gpt-4o. Renvoie un snapshot status "enriched". */
export async function enrichSnapshot(snapshot: TrendsSnapshot): Promise<TrendsSnapshot> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquante");
  if (snapshot.trends.length === 0) {
    return { ...snapshot, status: "enriched" };
  }

  const strategy = await loadPinterestStrategy();
  const ficheById = new Map(strategy.fiches.map((f) => [f.id, f]));
  const occasionKeys = Object.keys(strategy.mapping_occasions);
  const todayISO = new Date().toISOString().slice(0, 10);

  const occasionsCtx = occasionKeys
    .map((k) => `- ${k} (${OCCASION_LABELS[k] ?? k})`)
    .join("\n");
  const fichesCtx = strategy.fiches
    .map((f) => `- id="${f.id}" → ${f.ypm_id} ${f.nom} (${f.intention}) | occasions: ${f.occasions_cles.join(", ")}`)
    .join("\n");

  const systemPrompt = `Tu es l'analyste tendances d'Ypersoa, marque française de vêtements et accessoires BRODÉS PERSONNALISÉS à la commande (Hauts-de-France). Tu reçois des tendances brutes (Pinterest). Pour CHAQUE tendance, tu juges si Ypersoa peut en faire un contenu ou un produit brodé personnalisé, et tu proposes l'angle.

RÈGLES DE MARQUE (absolues) :
- Tutoiement TOUJOURS ("tu", "ton", "ta"). JAMAIS "vous".
- Vocabulaire AUTORISÉ : ${strategy.vocabulaire.autorise.join(", ")}.
- Vocabulaire INTERDIT (ne JAMAIS écrire) : ${strategy.vocabulaire.interdit.join(", ")}.
- Pas de "fait main" ni de référence à la machine.

OCCASIONS POSSIBLES (choisis UNE clé exacte ou null) :
${occasionsCtx}

FICHES MOTIFS (choisis UN id exact ou null) :
${fichesCtx}

CONSIGNES DE NOTATION :
- pertinence (0-10) : 0 = aucun lien possible avec la broderie personnalisée (actu pure : sport, politique, people, faits divers) ; 10 = directement actionnable en cadeau/produit brodé personnalisé.
- Sois SÉVÈRE : une actu généraliste sans lien cadeau/personnalisation = pertinence 0 à 2, occasion null, motif_fiche_id null, angle_caption null.
- occasion : la clé du marronnier le plus proche, ou null.
- motif_fiche_id : l'id de fiche le plus pertinent, ou null.
- type : "mot" (requête/expression), "look" (esthétique/style), ou "motif" (idée de broderie).
- angle_caption : UNE phrase courte en tutoiement, vocabulaire autorisé, qui amorce un post Ypersoa. null si pertinence < 4.

Réponds en JSON STRICT : { "resultats": [ { "index": <number>, "type": "mot|look|motif", "pertinence": <0-10>, "raison": "<court>", "occasion": "<clé|null>", "motif_fiche_id": "<id|null>", "angle_caption": "<phrase|null>" } ] } — un objet par tendance, dans l'ordre des index fournis.`;

  const userPayload = snapshot.trends.map((t, i) => ({
    index: i,
    terme: t.terme,
    source: t.source,
    contexte: t.contexte,
  }));

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 3000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Tendances à analyser :\n${JSON.stringify(userPayload)}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let results: GptResult[] = [];
  try {
    const parsed = JSON.parse(raw) as { resultats?: GptResult[] };
    results = Array.isArray(parsed.resultats) ? parsed.resultats : [];
  } catch {
    results = [];
  }
  const byIndex = new Map(results.map((r) => [r.index, r]));

  const forbidden = strategy.vocabulaire.interdit.map((t) => t.toLowerCase());

  const enriched: Trend[] = snapshot.trends.map((t, i) => {
    const r = byIndex.get(i);
    const pertinence = clampScore(r?.pertinence);

    // Snap occasion (doit exister dans le mapping).
    const occasion =
      r?.occasion && strategy.mapping_occasions[r.occasion] ? r.occasion : null;

    // Snap motif : id GPT validé, sinon 1er motif du mapping de l'occasion.
    let ficheId = r?.motif_fiche_id && ficheById.has(r.motif_fiche_id) ? r.motif_fiche_id : null;
    if (!ficheId && occasion) {
      ficheId = strategy.mapping_occasions[occasion]?.[0] ?? null;
    }
    const fiche = ficheId ? ficheById.get(ficheId) : null;
    const motif_ypm_suggere = fiche ? `${fiche.ypm_id} ${fiche.nom}` : null;

    const creneau = occasion ? creneauPlanable(occasion, todayISO) : null;

    const angle = (r?.angle_caption ?? "").trim() || null;
    const safetyText = `${t.terme} ${angle ?? ""}`.toLowerCase();
    const brand_safe =
      checkBrandSafety(`${t.terme} ${angle ?? ""}`).safe &&
      !forbidden.some((term) => safetyText.includes(term));

    const enrichissement: TrendEnrichissement = {
      pertinence_ypersoa: pertinence,
      raison_pertinence: (r?.raison ?? "").trim(),
      motif_ypm_suggere,
      occasion_liee: occasion,
      creneau_planable: creneau,
      angle_caption: angle,
      brand_safe,
    };

    const type: TrendType =
      r?.type === "look" || r?.type === "motif" ? r.type : t.type;

    return { ...t, type, enrichissement };
  });

  return {
    ...snapshot,
    status: "enriched",
    trends: enriched,
    meta: {
      ...snapshot.meta,
      note: snapshot.meta.note?.replace("sans enrichissement IA", "enrichi IA (gpt-4o)") ?? "Enrichi IA (gpt-4o).",
    },
  };
}
