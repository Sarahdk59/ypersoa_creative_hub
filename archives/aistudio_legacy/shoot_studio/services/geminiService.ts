
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "../types";
import { PROMPT_BASE, PACKSHOT_PROMPT, MODEL_DESCRIPTION, FAMILY_DESCRIPTION, SHOTS_CONFIG, PRODUCT_MATERIALS, FULL_PACK_PARISIEN, FULL_PACK_MINIMALIST, FULL_PACK_LOFT } from "../constants";

function getFullPackPrompts(style: string) {
  if (style === 'minimalist') return FULL_PACK_MINIMALIST;
  if (style === 'loft') return FULL_PACK_LOFT;
  return FULL_PACK_PARISIEN;
}

async function generateSingleShot(settings: GenerationSettings, shotType: string, seedOffset: number): Promise<{url: string, label: string}> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const match = settings.embroideryImage!.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = match ? match[1] : 'image/png';
  const base64Data = settings.embroideryImage!.split(',')[1] || settings.embroideryImage!;
  
  const material = PRODUCT_MATERIALS[settings.product] || "textile de qualité";
  const threadColorText = settings.threadColor || "identique à l'image fournie";
  
  const productDescription = {
    'JH001 Hoodie cordons ronds sans embout': 'sweat à capuche (hoodie) avec cordons ronds sans embout',
    'Zoodie JH050 cordons ronds sans embout': 'sweat zippé à capuche (zoodie) avec cordons ronds sans embout',
    'JH030': 'sweat à col rond classique (crewneck), col ras du cou, SANS AUCUNE CAPUCHE ET SANS POCHE KANGOUROU',
    'T-shirt Epais': 't-shirt épais à manches courtes. ATTENTION : C\'EST UN T-SHIRT, IL N\'Y A ABSOLUMENT AUCUNE POCHE KANGOUROU SUR LE VENTRE.',
    'JH01J Hoodie Junior sans cordon': 'sweat à capuche petite taille sans aucun cordon'
  }[settings.product] || settings.product;
  
  let promptText = "";
  let label = "";

  if (settings.mode === 'full') {
    const packPrompts = getFullPackPrompts(settings.fullPackStyle);
    const shot = packPrompts[shotType as keyof typeof packPrompts];
    label = shot.label;
    const emplacement = settings.size >= 20 ? "centre du vêtement" : "côté cœur";
    const dimension = `${settings.size} cm`;
    
    promptText = shot.prompt
      .replace(/\[PRODUIT\]/g, productDescription)
      .replace(/\[COULEUR SWEAT\]/g, settings.garmentColor)
      .replace(/\[COULEUR FIL\]/g, threadColorText)
      .replace(/\[EMPLACEMENT\]/g, emplacement)
      .replace(/\[DIMENSION\]/g, dimension)
      .replace(/\[MATERIAL\]/g, material);
  } else {
    const shot = SHOTS_CONFIG[shotType as keyof typeof SHOTS_CONFIG];
    label = shot.label;

    if (settings.mode === 'packshot') {
      const emplacement = settings.size >= 20 ? "centre du vêtement" : "côté cœur";
      const dimension = `${settings.size} cm`;
      
      promptText = PACKSHOT_PROMPT
        .replace(/\[PRODUIT\]/g, productDescription)
        .replace(/\[COULEUR SWEAT\]/g, settings.garmentColor)
        .replace(/\[COULEUR FIL\]/g, threadColorText)
        .replace(/\[EMPLACEMENT\]/g, emplacement)
        .replace(/\[DIMENSION\]/g, dimension);
        
      promptText += " " + shot.packshotSuffix;
    } else {
      let variation = "";
      let context = "";

      if (settings.mode === 'mannequin') {
        variation = shot.promptSuffix;
        
        const diversityParts = [];
        if (settings.diversity.ethnicity !== 'diverse') diversityParts.push(`ethnie ${settings.diversity.ethnicity}`);
        if (settings.diversity.age !== 'diverse') diversityParts.push(`âge ${settings.diversity.age}`);
        if (settings.diversity.bodyType !== 'diverse') diversityParts.push(`morphologie ${settings.diversity.bodyType}`);
        if (settings.diversity.disability !== 'none') diversityParts.push(`avec ${settings.diversity.disability}`);
        
        const diversityDesc = diversityParts.length > 0 ? diversityParts.join(', ') : "diversifiée et naturelle";
        context = MODEL_DESCRIPTION.replace("[DIVERSITY_DESCRIPTION]", diversityDesc);
      } else if (settings.mode === 'family') {
        variation = shot.familySuffix;
        const coupleTypeLabel = {
          'random': 'composé aléatoirement de (maman et papa, ou papa et papa, ou maman et maman, ou maman et mamie, ou papi et papa, ou papa et mamie)',
          'maman-papa': 'composé d\'une maman et d\'un papa',
          'papa-papa': 'composé de deux papas',
          'maman-maman': 'composé de deux mamans',
          'maman-mamie': 'composé d\'une maman et d\'une mamie',
          'papi-papa': 'composé d\'un papi et d\'un papa',
          'papa-mamie': 'composé d\'un papa et d\'une mamie'
        }[settings.familyConfig.coupleType];
        
        context = FAMILY_DESCRIPTION
          .replace("[COUPLE_TYPE]", coupleTypeLabel || "mixte")
          .replace("[CHILDREN_COUNT]", settings.familyConfig.childrenCount.toString())
          .replace("[MATERIAL]", material);
      }

      promptText = PROMPT_BASE
        .replace("[PRODUCT]", productDescription)
        .replace("[MATERIAL]", material)
        .replace("[SIZE]", settings.size.toString())
        .replace(/\[THREAD_COLOR\]/g, threadColorText)
        .replace("[GARMENT_COLOR]", settings.garmentColor)
        + context + " " + variation.replace(/\[THREAD_COLOR\]/g, threadColorText);
    }
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: promptText
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: settings.aspectRatio,
        imageSize: "2K"
      }
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error(`Échec de génération pour le shot: ${shotType}`);
  }

  const candidate = response.candidates[0];
  if (!candidate.content || !candidate.content.parts) {
    if (candidate.finishReason === 'IMAGE_OTHER' || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKLIST') {
      console.warn(`Blocked by ${candidate.finishReason}, retrying with safe fallback prompt...`);
      
      const safePrompt = `Generate a simple, safe, and generic 3D mockup of a ${settings.product} in color ${settings.garmentColor}. The garment is floating on a pure white background. The attached image is a simple graphic design to be embroidered on the chest. Do not generate any people, faces, or text. This is a safe, conceptual product visualization.`;
      
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: safePrompt }
            ]
          },
          config: { imageConfig: { aspectRatio: settings.aspectRatio, imageSize: "2K" } }
        });

        const retryCandidate = retryResponse.candidates?.[0];
        if (retryCandidate?.content?.parts) {
          for (const part of retryCandidate.content.parts) {
            if (part.inlineData) {
              return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label: `${label} (Mode Sécurisé)` };
            }
          }
        }
        throw new Error(`First fallback blocked or empty: ${retryCandidate?.finishReason || 'Unknown'}`);
      } catch (retryError) {
        console.error("First fallback retry failed, trying without input image:", retryError);
        
        // Second fallback: Remove the input image entirely
        const noImagePrompt = `Generate a simple, safe, and generic 3D mockup of a ${settings.product} in color ${settings.garmentColor}. The garment is floating on a pure white background. Do not generate any people, faces, or text. This is a safe, conceptual product visualization.`;
        
        try {
          const secondRetryResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
              parts: [
                { text: noImagePrompt }
              ]
            },
            config: { imageConfig: { aspectRatio: settings.aspectRatio, imageSize: "2K" } }
          });

          const secondRetryCandidate = secondRetryResponse.candidates?.[0];
          if (secondRetryCandidate?.content?.parts) {
            for (const part of secondRetryCandidate.content.parts) {
              if (part.inlineData) {
                return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label: `${label} (Vêtement Seul - Image Bloquée)` };
              }
            }
          }
          throw new Error(`Second fallback blocked or empty: ${secondRetryCandidate?.finishReason || 'Unknown'}`);
        } catch (secondRetryError) {
          console.error("Second fallback retry also failed:", secondRetryError);
        }
      }
    }

    if (candidate.finishReason) {
      throw new Error(`Génération bloquée par le modèle (raison : ${candidate.finishReason})`);
    }
    throw new Error(`Échec de génération pour le shot: ${shotType} (contenu vide)`);
  }

  let returnedText = "";
  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label };
    } else if (part.text) {
      returnedText += part.text + " ";
    }
  }

  if (returnedText) {
    console.warn("Model returned text instead of image, attempting retry with fallback prompt:", returnedText);
    
    // Retry once with a strong fallback instruction
    const fallbackPrompt = promptText + "\n\nCRITICAL FALLBACK INSTRUCTION: You previously refused to generate this image due to text content (e.g., 'PAPI'). You MUST generate the image. If the specific text violates guidelines, replace it with a generic safe word like 'FAMILY', 'AMOUR', or a simple embroidered shape. DO NOT refuse the request, generate the image with the placeholder.";
    
    const retryResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: fallbackPrompt
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: settings.aspectRatio,
          imageSize: "2K"
        }
      }
    });

    if (retryResponse.candidates && retryResponse.candidates.length > 0) {
      const retryCandidate = retryResponse.candidates[0];
      if (retryCandidate.content && retryCandidate.content.parts) {
        for (const part of retryCandidate.content.parts) {
          if (part.inlineData) {
            return { url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`, label };
          }
        }
      }
    }

    throw new Error(`Le modèle a refusé de générer l'image, même avec un texte de remplacement : ${returnedText}`);
  }

  throw new Error("Données d'image manquantes.");
}

export async function generateYpersoaPack(settings: GenerationSettings): Promise<{urls: string[], labels: string[]}> {
  if (!settings.embroideryImage) {
    throw new Error("L'image de la broderie est requise.");
  }

  let shotKeys: string[] = [];
  if (settings.mode === 'full') {
    const packPrompts = getFullPackPrompts(settings.fullPackStyle);
    shotKeys = Object.keys(packPrompts);
  } else {
    shotKeys = Object.keys(SHOTS_CONFIG);
  }
  
  const promises = shotKeys.map((key, index) => generateSingleShot(settings, key, index));
  const resultsSettled = await Promise.allSettled(promises);
  
  const successfulResults = resultsSettled
    .filter((result): result is PromiseFulfilledResult<{url: string, label: string}> => result.status === 'fulfilled')
    .map(result => result.value);

  if (successfulResults.length === 0) {
    // If all failed, throw the first error to give the user feedback
    const firstError = resultsSettled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw new Error(firstError?.reason?.message || "Toutes les générations ont échoué.");
  }
  
  return {
    urls: successfulResults.map(r => r.url),
    labels: successfulResults.map(r => r.label)
  };
}
