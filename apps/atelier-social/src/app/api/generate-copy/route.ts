/**
 * API Route: /api/generate-copy
 *
 * Génère du copywriting Instagram/Pinterest BRAND-SAFE
 * via OpenAI GPT-4o (vision + texte).
 *
 * Génère 1 caption complète + 5 hooks éditoriaux par registre.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkBrandSafety } from "@/lib/brand-rules";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM_PROMPT = `Tu es le copywriter de la marque "Ypersoa", marque française premium de personnalisation textile brodée à la commande, basée à Wattrelos (Nord, France) sous Phenix Group.

# IDENTITÉ DE MARQUE

Ypersoa est une marque PREMIUM, DISTINCTIVE, CHALEUREUSE et SOBRE. Elle s'adresse à une cliente CSP+ urbaine de 30-50 ans, sensible et cultivée, exigeante sur la qualité sans snobisme. Elle offre des cadeaux qui durent.

Références de positionnement : Émoï-Émoï × Make My Lemonade × Gamin Gamine.
Ton à fuir absolument : kitsch Etsy, mièvre, "petite boutique fait-main", girlboss caricaturale, urgentisme commercial, hallmark générique.

# RÈGLES BRAND ABSOLUES (NON NÉGOCIABLES)

## 1. Tutoiement systématique
Tous les textes clients utilisent "tu" / "ton" / "ta". JAMAIS "vous", "votre", "vos", "offrez", "découvrez", "choisissez". Ces formules sont creuses et vouvoyantes — bannies absolument.

## 2. Lexique broderie - INTERDITS ABSOLUS
Les termes suivants sont STRICTEMENT INTERDITS dans tout copy client :
- "artisanal", "artisanale", "artisanat", "broderie artisanale", "broderies artisanales"
- "fait main", "fait à la main"
- "par le fil et l'aiguille", "fil et aiguille"
- "Etsy", "marketplace"
- "Tajima TMEZ"

## 3. Façons CORRECTES de mentionner la broderie
- "brodé à la commande"
- "brodé à la demande"
- "brodé dans notre atelier de Wattrelos"
- "brodé chez nous, dans le Nord"

⚠️ EXCEPTION ULTRA-NICHE UNIQUEMENT : "brodé sur métier Tajima" autorisé SEULEMENT en blog atelier ou vidéo process.

## 4. Pas d'urgentisme
Pas de "vite", "dépêchez-vous", "dernières heures", "stock limité". Sobriété et invitation calme.

## 5. Pas de "carrousel qui claque" stop-scroll viral
Une signature visuelle, pas un effet de mode. Voix calme, précise, complice. Pas viral bruyant.

# TON ÉDITORIAL

- Complice (pas distant)
- Précis (pas vague)
- Sobre (pas mièvre, pas Etsy, pas "écrin de douceur")
- Inclusif (pas militant)
- Joueur (pas corporate)
- Émotion retenue, pas pleurnicharde

# 4 PILIERS ÉDITORIAUX

- P1 Process / Savoir-Faire (atelier, métier — contexte ultra-niche uniquement)
- P2 Émotion (lien, souvenir, présence)
- P3 Produit / Usage (catalogue, configurateur, occasions de port)
- P4 Preuve (témoignages, communauté, longévité)

# TAGLINES VALIDÉES (références)

- "Il y a les clubs officiels. Et il y a le tien." (Le Club / Mama Club)
- "Pour celles qui ne sont pas sœurs de sang. Mais sœurs de cœur." (Sista Club)
- "Parce qu'un chien, c'est pas un animal. C'est une famille." (Team Dog)
- "Un cœur, une initiale. C'est tout, c'est assez." (Brigitte)

# TOURNURES VALIDÉES

- "Pour celle qui..." / "Pour celui qui..."
- "Un cadeau qui dure"
- "Un cadeau chargé de sens"
- "Compose ton..." (CTA configurateur)

# AUTO-VÉRIFICATION OBLIGATOIRE AVANT DE RÉPONDRE

1. Tutoiement partout ? Pas de "vous"/"votre" ?
2. Aucun terme INTERDIT ?
3. Ton sobre Émoï-Émoï, pas kitsch Etsy ?
4. Hashtags cohérents avec l'occasion (ex: pas #fêtedesmères pour la fête des Pères) ?

Si une règle absolue est violée, RÉÉCRIS avant d'envoyer.`;

interface RequestBody {
  base64Image: string;
  mimeType: string;
  platform: "instagram" | "pinterest";
  vibeLabel: string;
  occasionContext: string;
  customPrompt?: string;
  canoniqueContext?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "OPENAI_API_KEY manquante. Vérifie ton .env.local" },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Body JSON invalide" }, { status: 400 });
  }

  const {
    base64Image,
    mimeType,
    platform,
    vibeLabel,
    occasionContext,
    customPrompt,
    canoniqueContext,
  } = body;

  if (!base64Image || !mimeType || !platform) {
    return NextResponse.json(
      { message: "Paramètres requis manquants" },
      { status: 400 }
    );
  }

  const customInstruction = customPrompt
    ? `\n\nINSTRUCTION CRÉATIVE DA : "${customPrompt}". Cette instruction guide le contexte créatif, mais NE PEUT JAMAIS faire enfreindre les règles brand absolues.`
    : "";

  const canoniqueInstruction = canoniqueContext
    ? `\n\nMANNEQUINS UTILISÉS DANS LES VISUELS : ${canoniqueContext}. Tu peux mentionner subtilement la nature des personnages dans la caption (sans citer les prénoms), mais pas obligatoire.`
    : "";

  // === USER PROMPT pour Instagram avec MODULE HOOKS ===
  const userPromptInstagram = `CONTEXTE : ${occasionContext}${customInstruction}${canoniqueInstruction}

Voici une image de produit Ypersoa. Ambiance visuelle : "${vibeLabel}".

Tu vas générer DEUX choses :

## 1. UNE CAPTION INSTAGRAM PRINCIPALE
- Engageante, émotionnelle, ton sobre Émoï-Émoï
- Tutoiement obligatoire
- Question communauté à la fin
- 1-3 emojis élégants max (✨ 💌 🤍 🌿 — JAMAIS 🔥💯⚡)
- 8-10 hashtags stratégiques (mix niches Ypersoa + pertinents)
- ⚠️ Hashtags COHÉRENTS avec l'occasion (pas de #fêtedesmères pour la fête des pères)

## 2. CINQ HOOKS ÉDITORIAUX COURTS (1 ligne chacun)
Cinq registres distincts (un de chaque) :
1. **Émotion** — qui touche le cœur immédiatement
2. **Question** — qui interpelle directement (ex: "POV : ...", "Et toi, ...")
3. **POV / Storytelling** — qui plante une scène en 1 phrase
4. **Humour / Complice** — sourire, second degré sobre, pas vulgaire
5. **Affirmation forte** — déclaration assumée style tagline

⚠️ Format de sortie OBLIGATOIRE en JSON strict :

\`\`\`json
{
  "caption": "<la caption complète Instagram avec hashtags>",
  "hooks": [
    "<hook 1 - registre Émotion>",
    "<hook 2 - registre Question>",
    "<hook 3 - registre POV>",
    "<hook 4 - registre Humour>",
    "<hook 5 - registre Affirmation>"
  ]
}
\`\`\`

PAS de préambule, PAS de texte avant ou après le JSON. Juste le JSON brut, parsable.`;

  const userPromptPinterest = `CONTEXTE : ${occasionContext}${customInstruction}${canoniqueInstruction}

Voici une image de produit Ypersoa. Ambiance visuelle : "${vibeLabel}".

Génère pour Pinterest, format JSON strict :

\`\`\`json
{
  "caption": "<Titre accrocheur (max 100 caractères)\\n\\nDescription détaillée et inspirante (max 500 caractères, optimisée SEO Pinterest, mots-clés forts français)\\n\\n5-8 hashtags pertinents>",
  "hooks": []
}
\`\`\`

PAS de préambule, juste le JSON brut.`;

  const userPrompt = platform === "instagram" ? userPromptInstagram : userPromptPinterest;

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ message: "Réponse OpenAI vide" }, { status: 500 });
    }

    // Parse le JSON
    let parsed: { caption: string; hooks: string[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("JSON parse failed:", parseError, "Raw:", rawContent);
      // Fallback : tout dans caption, pas de hooks
      parsed = { caption: rawContent, hooks: [] };
    }

    // Vérification brand-safety sur la caption + tous les hooks
    const allTextToCheck = [parsed.caption, ...(parsed.hooks || [])].join("\n");
    const safetyCheck = checkBrandSafety(allTextToCheck);

    return NextResponse.json({
      text: parsed.caption,
      hooks: parsed.hooks || [],
      brandSafety: {
        safe: safetyCheck.safe,
        criticalViolations: safetyCheck.violations.filter((v) => v.severity === "critical"),
        warnings: safetyCheck.violations.filter((v) => v.severity === "warning"),
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ message: `Erreur API OpenAI: ${message}` }, { status: 500 });
  }
}
