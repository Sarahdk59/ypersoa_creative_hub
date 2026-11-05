/**
 * Assemblage client-side d'un réel "Focus motif" : diaporama silencieux de
 * N photos (Ken Burns léger : zoom + pan lents), format 9:16, exporté en
 * vidéo via Canvas + MediaRecorder. Pas de musique en V1 (ajoutée par Sarah
 * directement dans Instagram/TikTok au moment de poster — bibliothèques
 * royalty-free natives, plus simple côté droits). Net-new : aucune brique
 * vidéo n'existait dans le repo avant.
 */

export type MotifReelPhase = "loading" | "recording" | "done";

export interface MotifReelProgress {
  phase: MotifReelPhase;
  index?: number;
  total?: number;
}

export interface MotifReelOptions {
  widthPx?: number;
  heightPx?: number;
  secondsPerImage?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = src;
  });
}

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((c) => MediaRecorder.isTypeSupported?.(c));
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Zoom lent + léger pan diagonal, sens alterné à chaque photo pour varier le rythme. */
function drawKenBurnsFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  progress: number,
  reverse: boolean
) {
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);

  const eased = easeInOutQuad(progress);
  const zoom = 1.04 + 0.14 * eased;

  const baseScale = Math.max(width / img.width, height / img.height);
  const scale = baseScale * zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  const maxOffsetX = (drawW - width) / 2;
  const maxOffsetY = (drawH - height) / 2;
  const dir = reverse ? -1 : 1;
  const panX = maxOffsetX * dir * (eased - 0.5) * 0.6;
  const panY = maxOffsetY * (eased - 0.5) * 0.3;

  const x = (width - drawW) / 2 + panX;
  const y = (height - drawH) / 2 + panY;
  ctx.drawImage(img, x, y, drawW, drawH);
}

/**
 * Fetch chaque photo en Blob local avant de la dessiner : évite de "tainter"
 * le canvas avec une image cross-origin (Supabase Storage) sans devoir
 * dépendre des en-têtes CORS du bucket. Même pattern que le téléchargement
 * d'images ailleurs dans l'app (fetch → blob → objectURL).
 */
export async function renderMotifReel(
  imageUrls: string[],
  onProgress?: (p: MotifReelProgress) => void,
  opts: MotifReelOptions = {}
): Promise<Blob> {
  if (imageUrls.length === 0) throw new Error("Aucune photo sélectionnée.");
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("Export vidéo non supporté dans cet environnement.");
  }

  const width = opts.widthPx ?? 1080;
  const height = opts.heightPx ?? 1920;
  const secondsPerImage = opts.secondsPerImage ?? 1.6;

  const objectUrls: string[] = [];
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    onProgress?.({ phase: "loading", index: i, total: imageUrls.length });
    const res = await fetch(imageUrls[i]);
    if (!res.ok) throw new Error(`Photo ${i + 1} : HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.push(objectUrl);
    images.push(await loadImage(objectUrl));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non supporté.");

  const stream = canvas.captureStream(30);
  const mimeType = pickSupportedMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const donePromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    recorder.onerror = (e) => reject(e instanceof Error ? e : new Error("Erreur d'enregistrement"));
  });

  onProgress?.({ phase: "recording", total: images.length });

  const totalDurationMs = images.length * secondsPerImage * 1000;
  recorder.start();
  const startTime = performance.now();

  await new Promise<void>((resolve) => {
    function frame(now: number) {
      const elapsed = now - startTime;
      if (elapsed >= totalDurationMs) {
        drawKenBurnsFrame(ctx as CanvasRenderingContext2D, images[images.length - 1], width, height, 1, false);
        resolve();
        return;
      }
      const idx = Math.min(images.length - 1, Math.floor(elapsed / (secondsPerImage * 1000)));
      const localElapsed = elapsed - idx * secondsPerImage * 1000;
      const progress = Math.min(1, localElapsed / (secondsPerImage * 1000));
      drawKenBurnsFrame(ctx as CanvasRenderingContext2D, images[idx], width, height, progress, idx % 2 === 1);
      onProgress?.({ phase: "recording", index: idx, total: images.length });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  // Laisse le dernier frame être flushé dans le flux avant d'arrêter l'enregistreur.
  await new Promise((r) => setTimeout(r, 150));
  recorder.stop();

  const blob = await donePromise;
  for (const url of objectUrls) URL.revokeObjectURL(url);
  onProgress?.({ phase: "done" });
  return blob;
}
