import { GoogleGenAI } from "@google/genai";

export async function generateSocialCopy(
  base64Image: string,
  mimeType: string,
  platform: "instagram" | "pinterest",
  vibe: string,
  occasionContext: string,
  customPrompt?: string
) {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  const customInstruction = customPrompt 
    ? `\nINSTRUCTION SPÉCIFIQUE DU CLIENT : Le client a demandé le contexte suivant : "${customPrompt}". Assure-toi que le texte reflète parfaitement cette idée et ce scénario.` 
    : "";

  const prompt = `
Tu es un expert Community Manager et un as du marketing émotionnel pour "Ypersoa", une marque premium de personnalisation textile brodée. 
Ton objectif : séduire, convertir, réunir et fidéliser une vraie communauté engagée.
L'ADN de la marque est émotionnel, artisanal, unique et chaleureux.

CONTEXTE DE LA PUBLICATION : ${occasionContext}${customInstruction}

Voici une image de l'un de nos produits (ou une variation de celui-ci).
Génère du contenu pour ${platform === "instagram" ? "Instagram" : "Pinterest"} avec l'ambiance visuelle suivante : "${vibe}".

${
  platform === "instagram"
    ? "Rédige une légende Instagram ultra-engageante et émotionnelle. Pose une question à la communauté pour générer des commentaires. Inclus des emojis élégants et une liste de 8 à 10 hashtags stratégiques et tendances."
    : "Rédige un Titre accrocheur (max 100 caractères) et une Description détaillée et inspirante (max 500 caractères) optimisés pour le SEO Pinterest. Inclus des mots-clés forts et des hashtags pertinents."
}

Réponds uniquement avec le contenu final, prêt à être copié-collé.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.warn("Failed with gemini-3-flash-preview, falling back to gemini-2.5-flash", error);
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      },
    });
    return fallbackResponse.text;
  }
}

export async function generateImageVariation(
  base64Image: string,
  mimeType: string,
  vibe: string,
  angle: string,
  customPrompt?: string
) {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const customInstruction = customPrompt 
    ? `\nCRITICAL USER DIRECTION: The user specifically requested the following scene/context: "${customPrompt}". You MUST incorporate this specific scenario, setting, and action into the image while respecting the brand guidelines.` 
    : "";

  const prompt = `You are a visionary Art Director for a premium luxury brand named Ypersoa. Create an ultra-realistic, emotional, and pure (épuré) fashion editorial photograph.
The image must feature this exact embroidered textile item. It is an Ypersoa premium garment (specifically a t-shirt, hoodie, crewneck sweatshirt, or zip-up hoodie / zoodie).
Crucial Art Direction: The garment must be worn by a highly realistic, everyday person ("madame ou monsieur tout le monde"). DO NOT use flawless, plastic supermodels. The model should be around 30 to 40 years old with natural, authentic features: real skin texture, natural expression lines (like laugh lines around the eyes and mouth), and subtle imperfections. They MUST look directly into the camera lens, making a deep, authentic connection with the viewer. They are smiling, laughing, and truly living the moment. The emotion must be palpable, natural, and contagious.${customInstruction}
Vibe/Mood: ${vibe}
Shot composition: ${angle}
Style: 35mm film photography, medium format camera, soft cinematic natural lighting, minimalist aesthetic, highly emotive, perfect for a premium brand carousel to seduce and convert.
Keep the embroidered design, the specific garment type (t-shirt, hoodie, sweatshirt, or zip-up), and the fabric texture exactly as they are in the original image, but seamlessly blend them into this new high-end, emotional human context.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K"
        }
      }
    });

    if (response.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("L'image a été bloquée par les filtres de sécurité.");
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error(`Aucune image générée. Response: ${JSON.stringify(response)}`);
  } catch (error) {
    console.warn("Failed with 3.1-flash-image-preview, falling back to 2.5-flash-image", error);
    
    // Fallback to 2.5-flash-image
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt },
        ],
      }
    });

    for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Échec de la génération d'image même avec le modèle de secours.");
  }
}


