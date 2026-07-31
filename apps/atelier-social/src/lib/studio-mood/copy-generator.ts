/**
 * Génère hook + légende-question + hashtags dans la voix Ypersoa.
 * Cascade : Anthropic claude-sonnet-4-6 → OpenAI gpt-4o → repli déterministe.
 */
import OpenAI from "openai";
import { checkBrandSafety } from "@/lib/brand-rules";
import type { GeneratedCopy, StudioMoodEpisode } from "./types";

const SYSTEM_PROMPT = `Tu es la voix Ypersoa pour les Reels Instagram / TikTok — vêtements brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# TON & VOIX
- Complice, direct, sans chichi. Phrase courte. Rythme.
- TOUJOURS tutoyer ("tu", "ton", "ta") — JAMAIS "vous", "votre", "vos"
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande", "brodé dans notre atelier"
- JAMAIS référence machine/équipement (Tajima, machine à broder)
- JAMAIS Etsy, Amazon, Vinted, marketplace
- Vocabulaire autorisé : personnalisation, à ton image, brodé à la commande, brodé en France, Hauts-de-France, personnalisé

# OUTPUT — JSON STRICT
{
  "hook": "Accroche stop-scroll 12-18 mots MAX. Émotion ou micro-scène concrète. 1-2 emojis max. Doit donner envie de regarder la suite.",
  "legende_question": "Légende complète 200-350 caractères : 1 observation/scène (2 lignes max) + 1 question ouverte qui invite à commenter (ex : 'Et toi, tu le ferais broder comment ?') + CTA : → ypersoa.fr",
  "hashtags": ["8 à 10 tags", "sans dièse", "mix brand+occasion+niche", "minuscules sauf YPERSOA"]
}

Réponds UNIQUEMENT en JSON valide.`;

function buildUserMessage(ep: StudioMoodEpisode): string {
  return `Épisode Studio Mood à traiter :

🎭 Humeur : ${ep.humeur}
✍️ Mot brodé : "${ep.mot_brode}"
${ep.motif_ypm_nom ? `🧵 Motif : ${ep.motif_ypm_nom}` : ""}
👕 Support : ${ep.support}
${ep.couleur_produit ? `🎨 Couleur : ${ep.couleur_produit}` : ""}
${ep.occasion ? `🎁 Occasion : ${ep.occasion}` : ""}
${ep.decor ? `🏠 Décor / mise en scène : ${ep.decor}` : ""}
${ep.ampli_saisonnier ? `📅 Ampli saisonnier : ${ep.ampli_saisonnier}` : ""}

Génère un hook stop-scroll + une légende-question engageante + 8-10 hashtags brand-safe.`;
}

async function runAnthropic(
  apiKey: string,
  userMessage: string
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Anthropic: pas de JSON dans la réponse");
  return JSON.parse(jsonMatch[0]);
}

async function runOpenAI(
  apiKey: string,
  userMessage: string
): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 800,
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI: pas de contenu");
  return JSON.parse(raw);
}

function fallback(ep: StudioMoodEpisode): Record<string, unknown> {
  const mot = ep.mot_brode;
  const occasion = ep.occasion ?? "l'occasion";
  const support = ep.support === "tshirt" ? "t-shirt" : ep.support;
  return {
    hook: `Le mot "${mot}" brodé à la commande — juste pour ${occasion === "Evergreen" ? "toi" : occasion.toLowerCase()} ✨`,
    legende_question:
      `"${mot}" brodé dans notre atelier des Hauts-de-France, sur un ${support} qui devient le tien.\n` +
      `Et toi, tu mettrais quoi à la place ?\n→ ypersoa.fr`,
    hashtags: [
      "YPERSOA",
      "broderie personnalisée",
      "brodé à la commande",
      "vêtement personnalisé",
      ep.occasion?.toLowerCase().replace(/\s/g, "") ?? "cadeau personnalisé",
      "haut de france",
      "made in france",
      "personnalisation",
    ],
  };
}

export async function generateCopy(
  ep: StudioMoodEpisode
): Promise<GeneratedCopy> {
  const userMessage = buildUserMessage(ep);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let parsed: Record<string, unknown> | null = null;
  let source: GeneratedCopy["source"] = "anthropic";

  if (anthropicKey) {
    try {
      parsed = await runAnthropic(anthropicKey, userMessage);
    } catch (e) {
      console.warn("[studio-mood] Anthropic KO →", e instanceof Error ? e.message : e);
    }
  }

  if (!parsed && openaiKey) {
    try {
      parsed = await runOpenAI(openaiKey, userMessage);
      source = "openai";
    } catch (e) {
      console.warn("[studio-mood] OpenAI KO →", e instanceof Error ? e.message : e);
    }
  }

  if (!parsed) {
    parsed = fallback(ep);
    source = "fallback";
  }

  const hook = String(parsed.hook ?? "");
  const legende_question = String(parsed.legende_question ?? "");
  const hashtags: string[] = Array.isArray(parsed.hashtags)
    ? (parsed.hashtags as string[])
    : [];

  const fullText = `${hook} ${legende_question}`;
  const safety = checkBrandSafety(fullText);

  return {
    hook,
    legende_question,
    hashtags,
    source,
    brand_safe: safety.safe,
    violations: safety.violations.map((v) => v.term),
  };
}
