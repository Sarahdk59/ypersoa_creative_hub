/**
 * API Route: /api/avis/generate
 *
 * Générateur de légende Instagram pour un avis client. Le squelette (étoiles,
 * citation, phrase-pont, CTA, hashtags) est verrouillé côté serveur — seule
 * l'histoire (1-3 phrases) est confiée au LLM, avec repli déterministe pour
 * ne jamais rendre une légende vide (même pattern que /api/generate-copy).
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadInstagramHashtags } from "@/lib/instagram-hashtags.server";
import { buildInstagramHashtags } from "@/lib/instagram-hashtags";
import type { InstagramHashtagBank } from "@/lib/instagram-hashtags";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  prenom: string;
  avis: string;
  produit: string;
  occasion: string;
}

interface BrandViolation {
  term: string;
  position: number;
  severity: "critical" | "warning";
}

interface BrandSafety {
  safe: boolean;
  criticalViolations: BrandViolation[];
  warnings: BrandViolation[];
}

// Red lines CLAUDE.md §2.
const FORBIDDEN_TERMS_CRITICAL = [
  "brodé à la main",
  "brodés à la main",
  "brodée à la main",
  "brodées à la main",
  "broderie à la main",
  "fait main",
  "faite main",
  "marketplace",
  "Etsy",
  "Amazon",
  "Vinted",
];

// Consumer-facing : aucune référence machine/fil, réservée au pro (mémoire feedback_vocab_fabrication).
const FORBIDDEN_TERMS_MACHINE = ["métier Tajima", "Tajima", "machine à broder", "Gunold", "Madeira", "Isacord"];

function checkBrandSafety(text: string): BrandSafety {
  const lower = text.toLowerCase();
  const criticalViolations: BrandViolation[] = [];
  const warnings: BrandViolation[] = [];

  for (const term of [...FORBIDDEN_TERMS_CRITICAL, ...FORBIDDEN_TERMS_MACHINE]) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) {
      criticalViolations.push({ term, position: idx, severity: "critical" });
    }
  }

  const vouvoiementRegex = /\b(vous|votre|vos)\b/gi;
  let match;
  while ((match = vouvoiementRegex.exec(text)) !== null) {
    warnings.push({ term: match[0], position: match.index, severity: "warning" });
  }

  return { safe: criticalViolations.length === 0, criticalViolations, warnings };
}

const SYSTEM_PROMPT = `Tu es la voix Ypersoa — vêtements et accessoires brodés personnalisés, brodés à la commande dans notre atelier des Hauts-de-France.

# TÂCHE
Écris UNIQUEMENT le paragraphe "histoire" d'un post Instagram qui met en avant l'avis d'une cliente. Ce paragraphe raconte, à la 3e personne, ce que la cliente a acheté ou offert et pourquoi — de façon intime et concrète, jamais marketing.

# FORME
- 2 à 3 phrases COURTES.
- Commence par le prénom de la cliente + un verbe d'action concret ("a fait broder", "a offert", "a choisi").
- Décris le motif/mot brodé et le destinataire si connus.
- Termine par une phrase courte, sensible, qui dit ce que représente ce cadeau (pas de grande envolée lyrique).
- 0 ou 1 emoji maximum, uniquement en fin de paragraphe si naturel.

# RÈGLES ABSOLUES
- Pas de vouvoiement ("vous"/"votre"/"vos") — reste neutre à la 3e personne, ou tutoie si tu t'adresses au lecteur.
- JAMAIS "brodé à la main" / "fait main" → dis "brodé à la commande" ou "brodé dans notre atelier des Hauts-de-France".
- JAMAIS de référence machine ("métier Tajima", "machine à broder").
- JAMAIS Etsy, Amazon, Vinted, marketplace.
- INTERDIT le registre "poème" : pas de "chaque courbe raconte une histoire", "sublimer ton quotidien avec authenticité". Reste concret et sobre.

# EXEMPLES DE TON (histoire seule, ne pas copier, juste le registre)
"Justine a fait broder « S&J ❤️ » avec la date de leur rencontre, pour elle et son amoureux. Deux initiales entrelacées, un jour qu'on n'oublie pas — leur histoire, portée sur eux."
"Amina a choisi une pièce brodée pour sa sœur, qui vient de devenir maman. Un cadeau pour marquer le début d'une nouvelle vie — celle où on porte fièrement son nouveau titre. 👶"
"Aurélie a offert un « maman de ❤️❤️❤️ » à sa meilleure amie pour son anniversaire. Trois petits cœurs pour trois enfants — une pièce qui ne pouvait être qu'à elle."

# OUTPUT REQUIS — JSON STRICT
{ "histoire": "..." }

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

const PHRASES_PONT = [
  "Chaque broderie se compose à ton image.",
  "Un prénom, une date, un petit mot : chaque pièce se personnalise, à ton image.",
  "C'est ça, une broderie à la commande : un détail qui rend le cadeau unique et qui dure.",
  "Une pièce personnalisée, brodée à la commande dans notre atelier des Hauts-de-France, qui se garde longtemps.",
];

const CTAS = [
  "👉 Crée la tienne sur ypersoa.fr",
  "👉 Compose la tienne sur ypersoa.fr",
  "👉 Imagine la tienne sur ypersoa.fr",
];

function pickIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % mod;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Repli sans IA : l'occasion saisie par Sarah peut être une phrase courte
// ("Anniversaire de sa meilleure amie") ou une phrase complète ("Sa sœur vient
// de devenir maman") — on la traite toujours comme sa propre phrase plutôt que
// de la coller après "pour", pour rester grammaticalement correct dans les deux cas.
function fallbackHistoire(prenom: string, produit: string, occasion: string): string {
  const produitPart = produit.trim();
  const sentences = [
    produitPart ? `${prenom} a fait broder ${produitPart}.` : `${prenom} a fait broder une pièce personnalisée.`,
  ];
  if (occasion.trim()) sentences.push(`${cap(occasion.trim())}.`);
  sentences.push("Une attention brodée à la commande, qui ne ressemble qu'à cette histoire-là.");
  return sentences.join(" ");
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function runOpenAI(apiKey: string, userMessage: string): Promise<Record<string, unknown>> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
    temperature: 0.85,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Pas de contenu OpenAI");
  return JSON.parse(raw);
}

async function runGemini(apiKey: string, userMessage: string): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: userMessage }] },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.85,
    },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  return JSON.parse(raw);
}

// Détection heuristique occasion/produit à partir du texte libre saisi (pas de
// dropdown dans cet outil) — réutilise la banque de hashtags existante en
// retrouvant l'ID (YPxxx / slug occasion_mapping) dont la valeur mappée
// correspond à la catégorie détectée.
function resolveProductId(bank: InstagramHashtagBank, produitText: string): string | undefined {
  const t = produitText.toLowerCase();
  let key: string | null = null;
  if (/casquette/.test(t)) key = "casquette";
  else if (/tote\s?bag/.test(t)) key = "totebag";
  else if (/teddy/.test(t)) key = "teddy";
  else if (/sweat.*(enfant|kids?)|enfant.*sweat/.test(t)) key = "sweat_enfant";
  else if (/sweat|hoodie|pull|zoodie/.test(t)) key = "sweat";
  else if (/t-?shirt/.test(t)) key = "tshirt";
  if (!key) return undefined;
  const entry = Object.entries(bank.produit_mapping).find(([, v]) => v === key);
  return entry?.[0];
}

function resolveOccasionId(bank: InstagramHashtagBank, text: string): string | undefined {
  const t = text.toLowerCase();
  let occKey: string;
  if (/naissance|bébé|nouveau-né|future maman/.test(t)) occKey = "naissance";
  else if (/mariage|marié|épouse|époux/.test(t)) occKey = "mariage";
  else if (/nounou|nourrice/.test(t)) occKey = "merci_nounou";
  else if (/grand-m[eè]re|mamie|papy|grand-p[eè]re/.test(t)) occKey = "fete_grands_meres";
  else if (/m[eè]re|maman/.test(t)) occKey = "fete_meres";
  else if (/p[eè]re|papa/.test(t)) occKey = "fete_peres";
  else if (/couple|amoureux|copain|copine|valentin/.test(t)) occKey = "couple";
  else if (/rentr[ée]e|[ée]cole/.test(t)) occKey = "rentree";
  else if (/[ée]t[ée]|vacances|plage/.test(t)) occKey = "ete";
  else if (/no[ëe]l/.test(t)) occKey = "noel";
  else occKey = "cadeau";
  const entry = Object.entries(bank.occasion_mapping).find(([, v]) => v.occasion === occKey);
  return entry?.[0];
}

function assembleCaption(
  prenom: string,
  avis: string,
  histoire: string,
  phrasePont: string,
  cta: string,
  hashtagLigne: string
): string {
  return [
    `⭐️⭐️⭐️⭐️⭐️ Merci ${prenom} 🧡`,
    "",
    `« ${avis.trim()} »`,
    "",
    histoire.trim(),
    "",
    `${phrasePont} ${cta}`,
    "",
    ".",
    ".",
    hashtagLigne,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const prenom = (body.prenom ?? "").trim();
  const avis = (body.avis ?? "").trim();
  const produit = (body.produit ?? "").trim();
  const occasion = (body.occasion ?? "").trim();

  if (!prenom || !avis) {
    return NextResponse.json(
      { ok: false, error: "Prénom et avis sont obligatoires." },
      { status: 400 }
    );
  }

  const userMessage = `Prénom de la cliente : ${prenom}
Avis (verbatim, ne pas réutiliser tel quel dans l'histoire) : ${avis}
Produit acheté : ${produit || "non précisé"}
Occasion / pourquoi : ${occasion || "non précisée"}

Écris l'histoire selon les consignes.`;

  let parsed: Record<string, unknown> | null = null;
  let source: "openai" | "gemini" | "fallback" = "openai";
  const engineErrors: string[] = [];

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      parsed = await runOpenAI(openaiKey, userMessage);
    } catch (e) {
      engineErrors.push(`openai: ${errMsg(e)}`);
    }
  } else {
    engineErrors.push("openai: OPENAI_API_KEY manquante");
  }

  if (!parsed) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        parsed = await runGemini(geminiKey, userMessage);
        source = "gemini";
      } catch (e) {
        engineErrors.push(`gemini: ${errMsg(e)}`);
      }
    } else {
      engineErrors.push("gemini: GEMINI_API_KEY manquante");
    }
  }

  let histoire = typeof parsed?.histoire === "string" ? parsed.histoire.trim() : "";
  if (!histoire) {
    source = "fallback";
    histoire = fallbackHistoire(prenom, produit, occasion);
  }

  const seed = `${prenom}|${avis}`;
  const phrasePont = PHRASES_PONT[pickIndex(seed, PHRASES_PONT.length)];
  const cta = CTAS[pickIndex(seed + "cta", CTAS.length)];

  const bank = await loadInstagramHashtags();
  const productId = resolveProductId(bank, produit);
  const occasionId = resolveOccasionId(bank, `${occasion} ${produit}`);
  const rotate = pickIndex(seed + "rotate", 997);
  const built = buildInstagramHashtags(bank, { productId, occasionId, rotate });
  const tags = built.tags.filter((t) => t.toLowerCase() !== "#hautsdefrance");
  tags.push("#hautsdefrance");
  const hashtagLigne = tags.join(" ");

  const brandSafety = checkBrandSafety(`${histoire} ${phrasePont}`);

  const caption = assembleCaption(prenom, avis, histoire, phrasePont, cta, hashtagLigne);

  const notice =
    source === "fallback"
      ? "Histoire générée sans IA (clés indisponibles ou erreur) — relis avant de publier."
      : source === "gemini"
        ? "Histoire générée par Gemini (repli OpenAI)."
        : undefined;

  return NextResponse.json({
    ok: true,
    caption,
    histoire,
    phrasePont,
    cta,
    hashtags: tags,
    hashtagLigne,
    brandSafety,
    source,
    notice,
    engineErrors: engineErrors.length ? engineErrors : undefined,
  });
}
