import { GoogleGenAI, Type } from "@google/genai";
import { ShootingParams, ShootingPlan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateShootingPlan(params: ShootingParams): Promise<ShootingPlan> {
  const systemInstruction = `Tu es un directeur de shooting e-commerce et lifestyle pour une marque textile premium.
Ta mission est de construire un plan de shooting unique et coherent pour toute une collection en respectant strictement les contraintes suivantes :
- Produits adulte : ${params.adultProducts.join(', ')}
- Produits enfant : ${params.kidProducts.join(', ')}
- Couleurs : ${params.colors.join(', ')}
- Nombre de motifs de broderie : ${params.motifsCount}
- Mannequins : ${params.models.map(m => `${m.role} (${m.profile})`).join(', ')}
- interactions obligatoires : couple adulte, duo mere-fille, interactions adulte-enfant, solos adulte, solos enfant, flatlay, packshot, close-up broderie
- un seul univers visuel
- un seul decor principal
- coherence editoriale sur toute la collection

Regles :
- Ne pas proposer un shooting complet pour chaque motif sur chaque produit
- Optimiser le volume d'images (environ 500-600 photos max)
- Prioriser la coherence de marque
- Repartir les motifs en 3 niveaux : hero lifestyle (10-15 motifs), produit standard (tous les motifs), detail broderie (tous les motifs)
- Repartir les couleurs entre hero colors (4-6) et couleurs secondaires
- Toujours inclure des scenes intergenerationnelles
- Toujours inclure des scenes avec 2 motifs visibles dans la meme image pour couple et mere-fille
- Toujours retourner un JSON strictement valide
- Le decor doit rester constant : appartement editorial, mur moule vert sauge, parquet chevron, lumiere naturelle, accessoires botaniques et vintage.
- Fournir des prompts d'images IA (en anglais) pour chaque scene.

ATTENTION CRITIQUE : 
1. Tu DOIS OBLIGATOIREMENT générer une matrice de scènes complète dans le tableau "scenes" (au moins 10 à 12 scènes différentes incluant : 2 solos adulte, 2 solos enfant, 2 scènes couple, 2 scènes mère-fille, 2 scènes adulte-enfant, 2 duos adultes multiculturels, flatlay, packshot, macro).
2. Tu DOIS OBLIGATOIREMENT générer un extrait représentatif de la shotlist dans le tableau "shotlist" (génère exactement 20 shots détaillés pour illustrer le plan). 
NE LAISSE JAMAIS les tableaux "scenes" ou "shotlist" vides !`;

  const prompt = `Cree un plan de shooting pour cette collection textile. Je veux une direction artistique globale, une matrice de scenes (au moins 10 scenes), une strategie motifs/couleurs, un shotlist representatif (20 shots), un planning de shooting en journees, et les prompts images pour chaque type de scene.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          collection_name: { type: Type.STRING },
          art_direction: {
            type: Type.OBJECT,
            properties: {
              decor: { type: Type.STRING },
              light: { type: Type.STRING },
              mood: { type: Type.STRING },
            }
          },
          casting: {
            type: Type.OBJECT,
            properties: {
              adults: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    role: { type: Type.STRING },
                    ethnic_profile: { type: Type.STRING }
                  }
                }
              },
              kids: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    role: { type: Type.STRING },
                    ethnic_profile: { type: Type.STRING }
                  }
                }
              }
            }
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_id: { type: Type.STRING },
                type: { type: Type.STRING },
                required_products: { type: Type.ARRAY, items: { type: Type.STRING } },
                required_interaction: { type: Type.STRING },
                motifs_visible: { type: Type.INTEGER },
                decor_zone: { type: Type.STRING },
                framing: { type: Type.STRING },
                deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
                image_prompt: { type: Type.STRING }
              }
            }
          },
          motif_strategy: {
            type: Type.OBJECT,
            properties: {
              hero_motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
              detail_only_motifs: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          color_strategy: {
            type: Type.OBJECT,
            properties: {
              hero_colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              secondary_colors: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          shotlist: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                shot_id: { type: Type.STRING },
                scene_id: { type: Type.STRING },
                models: { type: Type.ARRAY, items: { type: Type.STRING } },
                product: { type: Type.STRING },
                color: { type: Type.STRING },
                motif: { type: Type.STRING },
                shot_type: { type: Type.STRING }
              }
            }
          },
          planning: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                shots_count: { type: Type.INTEGER }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(response.text) as ShootingPlan;
}

export async function generateImage(prompt: string, referenceImages: string[] = []): Promise<string> {
  const parts: any[] = [];
  
  for (const img of referenceImages) {
    const match = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }
  
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      }
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Aucune image générée");
}
