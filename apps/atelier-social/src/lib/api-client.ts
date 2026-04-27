/**
 * API Client front -> Next.js API routes (proxy backend)
 *
 * Ne contient AUCUNE clé API. Les clés sont côté serveur uniquement.
 */

export interface GenerateImageInput {
  base64Image: string;
  mimeType: string;
  vibePrompt: string;
  angle: string;
  customPrompt?: string;
  canoniqueIds?: string[];
}

export interface GenerateCopyInput {
  base64Image: string;
  mimeType: string;
  platform: "instagram" | "pinterest";
  vibeLabel: string;
  occasionContext: string;
  customPrompt?: string;
  canoniqueContext?: string; // Contexte canoniques pour enrichir le copy
}

export async function generateImageVariation(input: GenerateImageInput): Promise<string> {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.imageDataUrl;
}

export async function generateSocialCopy(input: GenerateCopyInput): Promise<string> {
  const response = await fetch("/api/generate-copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `Copy generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}
