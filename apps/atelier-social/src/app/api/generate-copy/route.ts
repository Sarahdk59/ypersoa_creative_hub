/**
 * API Route: /api/generate-copy
 * VERSION DEBUG : logs détaillés
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkBrandSafety } from "@/lib/brand-rules";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM_PROMPT = `Tu es le copywriter de la marque Ypersoa, marque française premium de personnalisation textile brodée à la commande.

⚠️ FORMAT DE SORTIE OBLIGATOIRE : tu réponds TOUJOURS en JSON valide. Tu ne réponds JAMAIS en texte simple. Toutes tes réponses sont du JSON parsable.

# RÈGLES BRAND ABSOLUES

1. Tutoiement systématique ("tu" / "ton" / "ta"), JAMAIS "vous"
2. INTERDITS : "artisanal", "fait main", "fil et aiguille", "Etsy", "marketplace", "Tajima TMEZ"
3. Façons CORRECTES : "brodé à la commande", "brodé à la demande", "brodé dans notre atelier de Wattrelos"
4. Pas d'urgentisme

# TON
Sobre, complice, chaleureux, joueur. Références : Émoï-Émoï × Make My Lemonade.

⚠️ Tu réponds en JSON valide avec les champs "caption" (string) et "hooks" (array of strings). PAS de texte avant ou après. PAS de markdown code fences.`;

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
  console.log("\n========== /api/generate-copy START ==========");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[FAIL] OPENAI_API_KEY missing");
    return NextResponse.json({ message: "OPENAI_API_KEY manquante" }, { status: 500 });
  }
  console.log("[OK] OpenAI key loaded, length:", apiKey.length);
  console.log("[OK] Key prefix:", apiKey.substring(0, 8));

  let body: RequestBody;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[FAIL] Body JSON invalide:", e);
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

  console.log("[INFO] Request params:");
  console.log("  - mimeType:", mimeType);
  console.log("  - base64Image length:", base64Image?.length || 0);
  console.log("  - platform:", platform);
  console.log("  - vibeLabel:", vibeLabel);
  console.log("  - occasionContext:", occasionContext?.substring(0, 80));

  if (!base64Image || !mimeType || !platform) {
    console.error("[FAIL] Missing params");
    return NextResponse.json({ message: "Paramètres requis manquants" }, { status: 400 });
  }

  const customInstruction = customPrompt
    ? `\n\nDirection: "${customPrompt}".`
    : "";
  const canoniqueInstructionForCopy = canoniqueContext
    ? `\n\nMannequins: ${canoniqueContext}`
    : "";

  const userPrompt = `Tu réponds UNIQUEMENT en JSON valide. PAS de markdown, PAS de texte avant ou après.

CONTEXTE : ${occasionContext}${customInstruction}${canoniqueInstructionForCopy}

Voici une image de produit Ypersoa. Ambiance : "${vibeLabel}".

Génère un objet JSON exact :
{
  "caption": "<légende ${platform === "instagram" ? "Instagram" : "Pinterest"} complète, tutoiement, ton sobre Émoï-Émoï, 8-10 hashtags pertinents>",
  "hooks": [
    "<hook 1 - registre Émotion>",
    "<hook 2 - registre Question>",
    "<hook 3 - registre POV>",
    "<hook 4 - registre Humour>",
    "<hook 5 - registre Affirmation>"
  ]
}`;

  console.log("[INFO] User prompt length:", userPrompt.length);

  try {
    console.log("[TRY] Calling OpenAI gpt-4o...");
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
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: userPrompt },
          ],
        },
      ],
    });

    console.log("[OK] OpenAI response received");
    console.log("[INFO] Model:", response.model);
    console.log("[INFO] Usage:", JSON.stringify(response.usage));
    console.log("[INFO] Choices count:", response.choices?.length);
    console.log("[INFO] Finish reason:", response.choices?.[0]?.finish_reason);
    console.log("[INFO] Refusal:", response.choices?.[0]?.message?.refusal);

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      const finishReason = response.choices[0]?.finish_reason;
      const refusal = response.choices[0]?.message?.refusal;
      console.error("[FAIL] OpenAI response empty");
      console.error("[FAIL] Full response:", JSON.stringify(response, null, 2).substring(0, 2000));
      return NextResponse.json(
        {
          message: `Réponse OpenAI vide. finish_reason=${finishReason}${refusal ? `, refusal=${refusal}` : ""}`,
        },
        { status: 500 }
      );
    }

    console.log("[OK] Raw content length:", rawContent.length);
    console.log("[INFO] Raw content preview:", rawContent.substring(0, 200));

    let parsed: { caption: string; hooks: string[] };
    try {
      parsed = JSON.parse(rawContent);
      if (typeof parsed.caption !== "string") {
        throw new Error("Field 'caption' missing or not string");
      }
      if (!Array.isArray(parsed.hooks)) {
        parsed.hooks = [];
      }
    } catch (parseError) {
      console.error("[FAIL] JSON parse failed:", parseError);
      console.error("[FAIL] Raw content:", rawContent);
      parsed = { caption: rawContent, hooks: [] };
    }

    const allTextToCheck = [parsed.caption, ...(parsed.hooks || [])].join("\n");
    const safetyCheck = checkBrandSafety(allTextToCheck);

    console.log("[OK] Caption length:", parsed.caption?.length);
    console.log("[OK] Hooks count:", parsed.hooks?.length);
    console.log("[OK] Brand safety:", safetyCheck.safe);
    console.log("========== /api/generate-copy END ==========\n");

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
    console.error("[FAIL] Catch global OpenAI:", error);
    if (error instanceof Error) {
      console.error("[FAIL] Error name:", error.name);
      console.error("[FAIL] Error message:", error.message);
      console.error("[FAIL] Stack:", error.stack);
    }
    // Si c'est une OpenAI APIError, on a plus d'infos
    const errorObj = error as { status?: number; error?: { message?: string }; code?: string };
    console.error("[FAIL] OpenAI error status:", errorObj.status);
    console.error("[FAIL] OpenAI error code:", errorObj.code);
    console.error("[FAIL] OpenAI error.error.message:", errorObj.error?.message);

    const message =
      errorObj.error?.message ||
      (error instanceof Error ? error.message : "Erreur inconnue");
    return NextResponse.json(
      { message: `Erreur OpenAI [${errorObj.code || errorObj.status || "unknown"}]: ${message}` },
      { status: 500 }
    );
  }
}
