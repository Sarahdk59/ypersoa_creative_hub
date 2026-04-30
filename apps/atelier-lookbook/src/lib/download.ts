import JSZip from "jszip";
import { AmbianceExtraite } from "./types";

export interface LookbookDownloadInput {
  titre: string;
  slug: string;
  brief: string;
  tags: string[];
  ambiance: AmbianceExtraite | null;
  canoniquesInclus: string[];
  llmModelUsed: string;
  images: Array<{
    position: number;
    famille: string;
    url: string | null;
    canonique_injecte: string | null;
    prompt_en: string;
    valide: boolean;
  }>;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildImageFilename(
  lookbookSlug: string,
  position: number,
  total: number,
  famille: string
): string {
  return `ypersoa-lookbook-${lookbookSlug}-${String(position).padStart(2, "0")}-of-${String(total).padStart(2, "0")}-${slugify(famille)}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadSingleImage(
  url: string,
  filename: string
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch image failed (${res.status})`);
  const blob = await res.blob();
  triggerDownload(blob, filename);
}

/**
 * Génère un fichier HTML statique "lookbook.html" qui présente le lookbook
 * complet en grille avec toutes les métadonnées d'ambiance — Sarah peut
 * l'ouvrir dans son browser et imprimer en PDF si elle veut un "tableau".
 */
function buildLookbookHtml(input: LookbookDownloadInput, imageFilenames: string[]): string {
  const { titre, brief, tags, ambiance, canoniquesInclus, llmModelUsed, images } = input;
  const ambianceBlock = ambiance
    ? `
    <section class="ambiance">
      <h2>Ambiance extraite</h2>
      <div class="grid">
        <div><h3>Palette</h3><div class="swatches">${ambiance.palette
          .map((h) => `<div><span class="sw" style="background:${h}"></span><code>${h}</code></div>`)
          .join("")}</div></div>
        <div><h3>Lieux</h3><p>${ambiance.lieux.join(" · ")}</p></div>
        <div><h3>Lumière</h3><p>${ambiance.lumiere}</p></div>
        <div><h3>Grain</h3><p>${ambiance.grain}</p></div>
        <div><h3>Props</h3><p>${ambiance.props.join(" · ")}</p></div>
        <div><h3>Postures</h3><p>${ambiance.postures}</p></div>
        <div><h3>Références implicites</h3><p>${ambiance.references_implicites.join(" · ")}</p></div>
      </div>
    </section>`
    : "";

  const imagesBlock = images
    .map((img, i) => {
      const fn = imageFilenames[i];
      const tags = [
        `<span class="badge famille">${img.famille}</span>`,
        img.canonique_injecte ? `<span class="badge canonique">${img.canonique_injecte}</span>` : "",
        img.valide ? `<span class="badge valide">✓ validée</span>` : "",
      ]
        .filter(Boolean)
        .join("");
      return `
      <figure>
        <img src="images/${fn}" alt="Slide ${img.position}" loading="lazy" />
        <figcaption>
          <div class="meta">${tags}<span class="pos">#${img.position}</span></div>
        </figcaption>
      </figure>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${titre} — Ypersoa Lookbook</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Josefin+Sans:wght@400;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 32px; font-family: 'DM Sans', sans-serif; background: #F5F0E8; color: #2c2c2c; }
  h1, h2, h3 { font-family: 'Josefin Sans', sans-serif; margin: 0 0 8px; }
  h1 { font-size: 2.5rem; font-weight: 600; }
  h2 { font-size: 1.5rem; font-weight: 600; color: #A76059; margin-top: 32px; }
  h3 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #9a9a9a; font-weight: 700; }
  header { max-width: 1200px; margin: 0 auto 40px; }
  header .brief { font-style: italic; color: #9a9a9a; margin: 8px 0 16px; }
  header .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; background: #8A9E8C20; color: #8A9E8C; padding: 4px 10px; border-radius: 999px; font-weight: 700; }
  header .meta-line { font-size: 0.7rem; color: #9a9a9a; margin-top: 12px; }
  .ambiance { max-width: 1200px; margin: 0 auto 40px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #00000010; }
  .ambiance .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 12px; }
  .swatches { display: flex; gap: 8px; }
  .swatches > div { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .sw { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #00000010; display: block; }
  code { font-size: 0.65rem; color: #9a9a9a; }
  .grid-images { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  figure { margin: 0; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px #00000010; }
  figure img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; }
  figcaption { padding: 8px 10px; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
  .badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 999px; font-weight: 700; }
  .badge.famille { background: #A7605920; color: #A76059; }
  .badge.canonique { background: #8A9E8C; color: white; }
  .badge.valide { background: #2c2c2c; color: white; }
  .pos { margin-left: auto; font-size: 0.65rem; color: #9a9a9a; }
  @media print {
    body { padding: 16px; }
    figure { break-inside: avoid; }
  }
</style>
</head>
<body>
  <header>
    <h1>${titre}</h1>
    <p class="brief">« ${brief} »</p>
    <div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
    <p class="meta-line">${images.length} images · canoniques : ${canoniquesInclus.join(", ") || "—"} · modèle ${llmModelUsed}</p>
  </header>
  ${ambianceBlock}
  <section><h2>Visuels</h2><div class="grid-images">${imagesBlock}</div></section>
</body>
</html>`;
}

function buildBriefTxt(input: LookbookDownloadInput): string {
  return [
    `# ${input.titre}`,
    "",
    `Brief original : « ${input.brief} »`,
    `Tags : ${input.tags.join(", ")}`,
    `Canoniques inclus : ${input.canoniquesInclus.join(", ") || "—"}`,
    `Modèle LLM : ${input.llmModelUsed}`,
    "",
    "Ambiance extraite :",
    input.ambiance
      ? [
          `  Palette : ${input.ambiance.palette.join(" / ")}`,
          `  Lieux : ${input.ambiance.lieux.join(", ")}`,
          `  Props : ${input.ambiance.props.join(", ")}`,
          `  Lumière : ${input.ambiance.lumiere}`,
          `  Grain : ${input.ambiance.grain}`,
          `  Postures : ${input.ambiance.postures}`,
          `  Références : ${input.ambiance.references_implicites.join(", ")}`,
        ].join("\n")
      : "(non générée)",
  ].join("\n");
}

export async function downloadLookbookAsZip(input: LookbookDownloadInput): Promise<void> {
  const zip = new JSZip();
  const imagesFolder = zip.folder("images");
  if (!imagesFolder) throw new Error("ZIP folder creation failed");

  const filenames: string[] = [];
  for (const img of input.images) {
    if (!img.url) {
      filenames.push("");
      continue;
    }
    const res = await fetch(img.url);
    if (!res.ok) {
      console.warn(`Skip image ${img.position} fetch failed`);
      filenames.push("");
      continue;
    }
    const blob = await res.blob();
    const fn = buildImageFilename(input.slug, img.position, input.images.length, img.famille);
    imagesFolder.file(fn, blob);
    filenames.push(fn);
  }

  zip.file("brief.txt", buildBriefTxt(input));
  zip.file(
    "ambiance.json",
    JSON.stringify({ titre: input.titre, slug: input.slug, ambiance: input.ambiance }, null, 2)
  );
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        titre: input.titre,
        slug: input.slug,
        brief: input.brief,
        tags: input.tags,
        canoniques_inclus: input.canoniquesInclus,
        llm_model_used: input.llmModelUsed,
        images: input.images.map((img, i) => ({
          filename: filenames[i] || null,
          position: img.position,
          famille: img.famille,
          canonique_injecte: img.canonique_injecte,
          valide: img.valide,
          prompt_en: img.prompt_en,
        })),
      },
      null,
      2
    )
  );
  zip.file("lookbook.html", buildLookbookHtml(input, filenames));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `ypersoa-lookbook-${input.slug}.zip`);
}
