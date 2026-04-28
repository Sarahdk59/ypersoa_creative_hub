/**
 * 5 templates overlay pour Atelier Social Hub - V2
 * Style : Sézane × Mr T-shirt × Make My Lemonade
 *
 * V2 changes :
 * - Template "quote-center" repensé : guillemets décoratifs géants en watermark, plus de rectangle opaque
 * - Toggle couleur Auto / Blanc / Marine
 * - Marine = bleu marine Ypersoa
 */

export type OverlayTemplateId =
  | "title-bottom"
  | "quote-center"
  | "title-top-large"
  | "signature-corner"
  | "banner-bottom-color";

export type ColorMode = "auto" | "white" | "marine";

export interface OverlayTemplate {
  id: OverlayTemplateId;
  label: string;
  description: string;
  preview: string;
}

export const OVERLAY_TEMPLATES: OverlayTemplate[] = [
  {
    id: "title-bottom",
    label: "Titre en bas",
    description: "Serif gras centré bas, style Mr T-shirt",
    preview: "📝",
  },
  {
    id: "quote-center",
    label: "Citation centrée",
    description: "Guillemets décoratifs géants en watermark",
    preview: "❝",
  },
  {
    id: "title-top-large",
    label: "Titre haut grand",
    description: "Serif géant en haut, style magazine",
    preview: "📰",
  },
  {
    id: "signature-corner",
    label: "Signature coin",
    description: "Texte discret en bas droite, comme une étiquette",
    preview: "✒️",
  },
  {
    id: "banner-bottom-color",
    label: "Bandeau couleur",
    description: "Bandeau coloré en bas avec texte dessus",
    preview: "🎨",
  },
];

// Couleurs brand Ypersoa
const COLOR_MARINE = "#1A2E4F"; // Bleu marine signature
const COLOR_CREAM = "#FAF7F2"; // Crème
const COLOR_INK = "#1A1614"; // Noir profond

/**
 * Détecte la couleur dominante d'une image et retourne
 * la couleur de texte à utiliser
 */
export async function detectTextColor(imageDataUrl: string): Promise<{
  isDarkBackground: boolean;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ isDarkBackground: false });
        return;
      }

      // Échantillonne l'image entière (centre + bas où va souvent le texte)
      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;
      let totalLuminance = 0;
      let pixelCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += luminance;
        pixelCount++;
      }

      const avgLuminance = totalLuminance / pixelCount;
      resolve({ isDarkBackground: avgLuminance < 128 });
    };

    img.onerror = () => resolve({ isDarkBackground: false });
    img.src = imageDataUrl;
  });
}

/**
 * Résout la couleur de texte selon le mode et la dominante de l'image
 */
function resolveColors(
  colorMode: ColorMode,
  isDarkBackground: boolean
): {
  textColor: string;
  shadowColor: string;
  bannerColor: string;
} {
  if (colorMode === "white") {
    return {
      textColor: COLOR_CREAM,
      shadowColor: "rgba(0,0,0,0.65)",
      bannerColor: "rgba(26,46,79,0.92)", // Marine pour le bandeau
    };
  }
  if (colorMode === "marine") {
    return {
      textColor: COLOR_MARINE,
      shadowColor: "rgba(255,255,255,0.6)",
      bannerColor: "rgba(250,247,242,0.92)", // Cream pour le bandeau
    };
  }
  // Auto
  return {
    textColor: isDarkBackground ? COLOR_CREAM : COLOR_INK,
    shadowColor: isDarkBackground ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.5)",
    bannerColor: isDarkBackground ? "rgba(250,247,242,0.92)" : "rgba(26,46,79,0.85)",
  };
}

/**
 * Compose une image avec overlay texte via Canvas
 */
export async function composeOverlay({
  imageDataUrl,
  text,
  templateId,
  colorMode = "auto",
  width = 1080,
  height = 1350,
}: {
  imageDataUrl: string;
  text: string;
  templateId: OverlayTemplateId;
  colorMode?: ColorMode;
  width?: number;
  height?: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // 1. Image de fond (cover)
      const imgRatio = img.width / img.height;
      const targetRatio = width / height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > targetRatio) {
        drawHeight = height;
        drawWidth = height * imgRatio;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgRatio;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      }
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // 2. Détection auto si nécessaire
      const { isDarkBackground } = await detectTextColor(imageDataUrl);
      const colors = resolveColors(colorMode, isDarkBackground);

      // 3. Render template
      renderTemplate(ctx, text, templateId, width, height, colors);

      resolve(canvas.toDataURL("image/png", 0.95));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageDataUrl;
  });
}

function renderTemplate(
  ctx: CanvasRenderingContext2D,
  text: string,
  templateId: OverlayTemplateId,
  width: number,
  height: number,
  colors: { textColor: string; shadowColor: string; bannerColor: string }
) {
  const { textColor, shadowColor, bannerColor } = colors;

  const wrapText = (txt: string, maxWidth: number, font: string): string[] => {
    ctx.font = font;
    const words = txt.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  switch (templateId) {
    // === TEMPLATE 1 : Titre en bas (inchangé) ===
    case "title-bottom": {
      const fontSize = 56;
      const font = `600 ${fontSize}px 'Playfair Display', 'Times New Roman', serif`;
      const maxWidth = width * 0.85;
      const lines = wrapText(text, maxWidth, font);
      const lineHeight = fontSize * 1.15;
      const totalHeight = lines.length * lineHeight;
      const startY = height - 80 - totalHeight;

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + i * lineHeight);
      });

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      break;
    }

    // === TEMPLATE 2 : Citation centrée — V2 RECONÇU ===
    // Plus de rectangle. Guillemets décoratifs géants en watermark.
    case "quote-center": {
      // 1. Guillemets ouvrants GÉANTS en arrière-plan (watermark)
      const quoteSize = 380;
      const quoteFont = `300 ${quoteSize}px 'Playfair Display', 'Times New Roman', serif`;
      ctx.font = quoteFont;
      ctx.textBaseline = "alphabetic";

      // Couleur watermark : très transparente, même couleur que le texte principal
      ctx.fillStyle = textColor;
      const watermarkAlpha = 0.18;
      ctx.globalAlpha = watermarkAlpha;

      // Guillemet ouvrant en haut à gauche
      ctx.textAlign = "left";
      ctx.fillText('\u201C', width * 0.05, height * 0.4);
      // Guillemet fermant en bas à droite
      ctx.textAlign = "right";
      ctx.fillText('\u201D', width * 0.95, height * 0.85);

      // Reset
      ctx.globalAlpha = 1;

      // 2. Texte principal italique serif au centre
      const fontSize = 52;
      const font = `italic 500 ${fontSize}px 'Playfair Display', 'Times New Roman', serif`;
      const maxWidth = width * 0.78;
      const lines = wrapText(text, maxWidth, font);
      const lineHeight = fontSize * 1.35;
      const totalHeight = lines.length * lineHeight;
      const startY = (height - totalHeight) / 2;

      // Ombre subtile pour la lisibilité (sans rectangle)
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 28;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Double dessin pour ombre + texte propre
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + i * lineHeight);
      });

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 3. Petit trait décoratif sous le texte
      const traitWidth = 80;
      const traitY = startY + totalHeight + 30;
      ctx.strokeStyle = textColor;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo((width - traitWidth) / 2, traitY);
      ctx.lineTo((width + traitWidth) / 2, traitY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }

    // === TEMPLATE 3 : Titre haut grand (inchangé) ===
    case "title-top-large": {
      const fontSize = 90;
      const font = `700 ${fontSize}px 'Playfair Display', serif`;
      const maxWidth = width * 0.9;
      const lines = wrapText(text, maxWidth, font);
      const lineHeight = fontSize * 1.05;
      const startY = 80;

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, width * 0.05, startY + i * lineHeight);
      });

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      break;
    }

    // === TEMPLATE 4 : Signature coin (inchangé) ===
    case "signature-corner": {
      const fontSize = 28;
      const font = `400 ${fontSize}px 'Playfair Display', serif`;
      const maxWidth = width * 0.5;
      const lines = wrapText(text, maxWidth, font);
      const lineHeight = fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;

      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const lineY = height - 60 - totalHeight - 20;
      ctx.moveTo(width - 80 - maxWidth, lineY);
      ctx.lineTo(width - 80 - maxWidth + 60, lineY);
      ctx.stroke();

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8;
      ctx.font = font;
      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, width - 80, lineY + 20 + i * lineHeight);
      });

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      break;
    }

    // === TEMPLATE 5 : Bandeau couleur ===
    case "banner-bottom-color": {
      const bannerHeight = 180;
      const bannerY = height - bannerHeight;

      ctx.fillStyle = bannerColor;
      ctx.fillRect(0, bannerY, width, bannerHeight);

      // Accent en haut du bandeau
      ctx.fillStyle = "rgba(250, 247, 242, 0.4)";
      ctx.fillRect(0, bannerY, width, 2);

      const fontSize = 38;
      const font = `500 ${fontSize}px 'Inter', 'Helvetica', sans-serif`;
      const maxWidth = width * 0.85;
      const lines = wrapText(text, maxWidth, font);
      const lineHeight = fontSize * 1.25;
      const totalTextHeight = lines.length * lineHeight;
      const textStartY = bannerY + (bannerHeight - totalTextHeight) / 2;

      // Texte sur bandeau : couleur opposée au bandeau
      const onBannerColor = bannerColor.includes("250,247,242") ? COLOR_INK : COLOR_CREAM;

      ctx.font = font;
      ctx.fillStyle = onBannerColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, textStartY + i * lineHeight);
      });
      break;
    }
  }
}
