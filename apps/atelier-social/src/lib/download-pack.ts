import JSZip from "jszip";
import { SocialPack, Collection } from "./social-packs";

/** Slugify : 'Fête des Mères 2026' → 'fete-des-meres-2026' */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents combinants
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Construit un nom de fichier prêt-à-publier :
 *   ypersoa-{collection}-{title}-{NN}.png
 * Sans collection : ypersoa-{title}-{NN}.png
 */
export function buildSlideFilename(
  pack: SocialPack,
  collectionName: string | null,
  index: number,
  total: number,
  ext: string = "png"
): string {
  const parts = ["ypersoa"];
  if (collectionName) parts.push(slugify(collectionName));
  if (pack.title) parts.push(slugify(pack.title));
  parts.push(String(index + 1).padStart(2, "0") + "-of-" + String(total).padStart(2, "0"));
  return parts.join("-") + "." + ext;
}

/** Détermine l'extension depuis le mimetype d'un blob. */
function extFromBlob(blob: Blob): string {
  const t = blob.type || "image/png";
  return t.split("/")[1].replace("jpeg", "jpg");
}

/** Télécharge une image individuelle, nommage propre conservé. */
export async function downloadSlide(
  pack: SocialPack,
  collectionName: string | null,
  index: number,
  total: number
): Promise<void> {
  const url = pack.image_urls[index];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch slide ${index + 1} failed`);
  const blob = await response.blob();
  const ext = extFromBlob(blob);
  const filename = buildSlideFilename(pack, collectionName, index, total, ext);
  triggerDownload(blob, filename);
}

/**
 * Build du sidecar caption.txt selon plateforme.
 * Insta : caption complet + hooks séparés.
 * Pinterest : titre + description + tags (format brut, pas de hashtag).
 */
function buildCaptionFile(pack: SocialPack): string {
  const lines: string[] = [];
  lines.push(`# ${pack.title || "Pack"}`);
  lines.push(`# Plateforme : ${pack.platform}`);
  lines.push(`# Généré le : ${new Date(pack.created_at).toLocaleString("fr-FR")}`);
  lines.push("");

  if (pack.platform === "instagram") {
    lines.push("=== CAPTION INSTAGRAM ===");
    lines.push(pack.caption_text || "(vide)");
    if (pack.caption_hooks && Object.keys(pack.caption_hooks).length > 0) {
      lines.push("");
      lines.push("=== HOOKS ALTERNATIFS ===");
      for (const [registre, hook] of Object.entries(pack.caption_hooks)) {
        lines.push(`[${registre.toUpperCase()}] ${hook}`);
      }
    }
  } else {
    lines.push("=== TITRE PINTEREST ===");
    lines.push(pack.pinterest_title || "(vide)");
    lines.push("");
    lines.push("=== DESCRIPTION SEO ===");
    lines.push(pack.pinterest_description || "(vide)");
    lines.push("");
    lines.push("=== TAGS ===");
    lines.push(pack.pinterest_tags.join(", "));
  }

  if (pack.notes) {
    lines.push("");
    lines.push("=== NOTES ===");
    lines.push(pack.notes);
  }

  return lines.join("\n");
}

/**
 * Sidecar metadata.json — pour Shopify (alt text par image) ou usage programmatique.
 */
function buildMetadataJson(
  pack: SocialPack,
  collectionName: string | null,
  filenames: string[]
): string {
  const altSuggestion = (idx: number) => {
    const base = pack.title || "Ypersoa pack";
    return `${base} — slide ${idx + 1}/${filenames.length}`;
  };
  return JSON.stringify(
    {
      pack_id: pack.id,
      title: pack.title,
      collection: collectionName,
      platform: pack.platform,
      created_at: pack.created_at,
      vibe_id: pack.vibe_id,
      occasion_id: pack.occasion_id,
      canonique_ids: pack.canonique_ids,
      with_overlay: pack.with_overlay,
      brand_safety: pack.brand_safety,
      caption_text: pack.caption_text,
      caption_hooks: pack.caption_hooks,
      pinterest_title: pack.pinterest_title,
      pinterest_description: pack.pinterest_description,
      pinterest_tags: pack.pinterest_tags,
      notes: pack.notes,
      images: filenames.map((filename, idx) => ({
        filename,
        alt: altSuggestion(idx),
        position: idx + 1,
      })),
    },
    null,
    2
  );
}

/**
 * Télécharge tout le pack en .zip avec :
 *   images/<filename>.png × N
 *   caption.txt
 *   metadata.json
 */
export async function downloadPackAsZip(
  pack: SocialPack,
  collection: Collection | null
): Promise<void> {
  const collectionName = collection?.name || null;
  const total = pack.image_urls.length;
  const zip = new JSZip();
  const imagesFolder = zip.folder("images");
  if (!imagesFolder) throw new Error("ZIP folder creation failed");

  const filenames: string[] = [];
  for (let i = 0; i < total; i++) {
    const response = await fetch(pack.image_urls[i]);
    if (!response.ok) throw new Error(`Fetch slide ${i + 1} failed`);
    const blob = await response.blob();
    const ext = extFromBlob(blob);
    const filename = buildSlideFilename(pack, collectionName, i, total, ext);
    imagesFolder.file(filename, blob);
    filenames.push(filename);
  }

  zip.file("caption.txt", buildCaptionFile(pack));
  zip.file("metadata.json", buildMetadataJson(pack, collectionName, filenames));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFilename =
    "ypersoa" +
    (collectionName ? "-" + slugify(collectionName) : "") +
    (pack.title ? "-" + slugify(pack.title) : "") +
    ".zip";
  triggerDownload(zipBlob, zipFilename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
