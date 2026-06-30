/**
 * API Route: /api/assistant/chat
 *
 * L'Assistant Hub : un chatbot qui répond sur la base du guide + du brand book
 * (injectés dans le system prompt — pas de vector DB, le corpus tient dans le
 * contexte). Deux missions : aider à SE RETROUVER dans le Hub (avec des liens
 * cliquables vers les routes) et aider à CRÉER DU CONTENU dans les règles brand.
 *
 * Modèle : gpt-4o-mini en streaming, cascade Gemini (non-streamé) en secours.
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadAssistantKnowledge } from "@/lib/assistant/knowledge.server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 12; // borne le coût : on ne renvoie que les derniers tours

function buildSystemPrompt(knowledge: string): string {
  return `Tu es l'Assistant du Hub Créatif Ypersoa. Tu aides l'équipe (créa/comm, direction artistique, atelier de production) sur DEUX choses :

1. SE RETROUVER DANS LE HUB — Quand on cherche où faire quelque chose, indique l'atelier et donne le lien cliquable de la route en Markdown, ex : [Atelier Social](/social). Utilise EXCLUSIVEMENT les routes de la "CARTE DU HUB" ci-dessous ; n'invente jamais de route.

2. AIDER À CRÉER DU CONTENU — Captions, hooks, titres/descriptions Pinterest, idées de posts. Tu DOIS respecter les RÈGLES BRAND (tutoiement absolu, vocabulaire de fabrication consumer, termes interdits). Si on te demande un texte qui violerait une règle, corrige-le toi-même et explique en une ligne.

STYLE DE RÉPONSE :
- Tutoie (on est une équipe).
- Concis et actionnable : va droit au but, propose l'étape ou le lien utile.
- Quand c'est une marche à suivre, fais une courte liste numérotée.
- Si l'info n'est pas dans ta base de connaissances, dis-le honnêtement et oriente vers le guide ([Guide](/guide)) ou la recherche globale ([Recherche](/search)) — n'invente pas.
- Réponds en français.

Tout ce que tu sais sur le Hub, le guide et la marque est ci-dessous. C'est ta SEULE source de vérité.

${knowledge}`;
}

/** Nettoie + borne l'historique reçu du client. */
function sanitizeHistory(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const cleaned = input
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return cleaned.slice(-MAX_HISTORY);
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Repli Gemini (non-streamé) renvoyé en un seul bloc. */
async function runGeminiChat(
  apiKey: string,
  system: string,
  history: ChatMessage[],
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: system, temperature: 0.4 },
  });
  const raw = response.text;
  if (!raw) throw new Error("Pas de contenu Gemini");
  return raw;
}

export async function POST(req: NextRequest) {
  let history: ChatMessage[];
  try {
    const body = await req.json();
    history = sanitizeHistory(body?.messages);
  } catch {
    return textResponse("Requête invalide.", 400);
  }
  if (history.length === 0) {
    return textResponse("Pose-moi une question 🙂", 400);
  }

  const knowledge = await loadAssistantKnowledge();
  const system = buildSystemPrompt(knowledge);

  // 1) OpenAI gpt-4o-mini en streaming
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        temperature: 0.4,
        max_tokens: 900,
        messages: [{ role: "system", content: system }, ...history],
      });
      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            }
          } catch {
            controller.enqueue(
              encoder.encode("\n\n_(coupure réseau — relance ta question)_"),
            );
          }
          controller.close();
        },
      });
      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    } catch (e) {
      console.warn("[WARN] Assistant OpenAI KO → fallback Gemini:", e);
    }
  }

  // 2) Gemini en secours (non-streamé)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const text = await runGeminiChat(geminiKey, system, history);
      return textResponse(text);
    } catch (e) {
      console.warn("[WARN] Assistant Gemini KO aussi:", e);
    }
  }

  return textResponse(
    "Désolée, l'assistant est momentanément indisponible (clé IA manquante ou quota atteint). Réessaie dans un instant, ou consulte le guide : /guide",
    503,
  );
}
