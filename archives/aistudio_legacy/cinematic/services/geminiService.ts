
import { GoogleGenAI, Modality, VideoGenerationReferenceType } from "@google/genai";

// Standard base64 helpers as requested
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateYpersoaVideo = async (
  prompt: string,
  images?: { data: string, mimeType: string }[],
  aspectRatio: '16:9' | '9:16' = '16:9',
  onProgress?: (msg: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress?.("Initialisation de la génération Veo...");
  
  let operation;

  let enhancedPrompt = prompt;
  if (aspectRatio === '9:16') {
    enhancedPrompt += " IMPORTANT: Fill the entire 9:16 vertical frame. If the reference image is a different aspect ratio, creatively generate and extend the background to fill the vertical space completely. Absolutely NO black borders or letterboxing.";
  }

  if (images && images.length > 1) {
    const referenceImagesPayload = images.map(img => ({
      image: {
        imageBytes: img.data,
        mimeType: img.mimeType,
      },
      referenceType: VideoGenerationReferenceType.ASSET,
    }));

    operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: enhancedPrompt,
      config: {
        numberOfVideos: 1,
        referenceImages: referenceImagesPayload,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } else {
    const finalPrompt = images && images.length === 1 ? `Starting from this image: ${enhancedPrompt}` : enhancedPrompt;
    const generateParams: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatio
      }
    };
    
    if (images && images.length === 1) {
      generateParams.image = {
        imageBytes: images[0].data,
        mimeType: images[0].mimeType,
      };
    }
    
    operation = await ai.models.generateVideos(generateParams);
  }

  while (!operation.done) {
    onProgress?.("Génération en cours... Création de l'univers premium.");
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    console.error("Opération de génération échouée:", JSON.stringify(operation, null, 2));
    let errorDetails = "Erreur inconnue";
    if (operation.error) {
      errorDetails = operation.error.message || JSON.stringify(operation.error);
    } else if (operation.response) {
      if (operation.response.raiMediaFilteredReasons && operation.response.raiMediaFilteredReasons.length > 0) {
        const reasons = operation.response.raiMediaFilteredReasons.join(" | ");
        if (reasons.includes("photorealistic children")) {
          errorDetails = "Les filtres de sécurité de l'IA bloquent les images contenant des enfants photoréalistes. Veuillez retirer cette image et réessayer.";
        } else {
          errorDetails = `Bloqué par les filtres de sécurité : ${reasons}`;
        }
      } else {
        errorDetails = "Réponse reçue mais sans vidéo : " + JSON.stringify(operation.response);
      }
    }
    throw new Error(`Échec de la génération. Détails : ${errorDetails}`);
  }

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.API_KEY as string,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors du téléchargement de la vidéo : ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateVoiceOver = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a soft, cinematic, professional, slow-paced voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Échec de la génération audio.");

  const audioBytes = decode(base64Audio);
  const blob = new Blob([audioBytes], { type: 'audio/pcm' });
  return URL.createObjectURL(blob);
};

export const generateMusic = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContentStream({
    model: "lyria-3-clip-preview",
    contents: prompt,
    config: {
      responseModalities: [Modality.AUDIO],
    }
  });

  let audioBase64 = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
      }
    }
  }

  if (!audioBase64) throw new Error("Échec de la génération musicale. Aucune donnée audio reçue.");

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};
