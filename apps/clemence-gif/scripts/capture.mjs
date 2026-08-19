// scripts/capture.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const APP   = path.resolve(__dir, '..');

export async function captureFrames(spec, framesDir) {
  const N = Math.max(2, Math.round(spec.durationSec * spec.fps));
  await fs.mkdir(framesDir, { recursive: true });

  const asset = (...p) => pathToFileURL(path.join(APP, 'assets', ...p)).href;
  const assetPath = (...p) => path.join(APP, 'assets', ...p);

  const bgFile = path.join('backgrounds', `${spec.theme.split('-')[0] || 'creme'}.png`);
  const resolved = {
    ...spec,
    motifUrl:  existsSync(assetPath(bgFile)) ? asset(bgFile) : null,
    poseUrls:  spec.poseSequence.map(name => asset('poses', `${name}.png`)),
    objects:   spec.objects.map(o => ({ ...o, url: asset('objects', `${o.name}.png`) }))
  };

  for (const url of resolved.poseUrls) {
    const p = decodeURIComponent(url.replace('file://', ''));
    if (!existsSync(p)) throw new Error(`Pose introuvable: ${p}`);
  }
  for (const o of resolved.objects) {
    const p = decodeURIComponent(o.url.replace('file://', ''));
    if (!existsSync(p)) throw new Error(`Objet introuvable: ${p}`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(APP, 'scene', 'scene.html')).href);
  await page.evaluate((s) => window.buildScene(s), resolved);
  await page.waitForTimeout(150); // laisse charger les images

  for (let i = 0; i < N; i++) {
    const t = N === 1 ? 0 : i / (N - 1);
    await page.evaluate((tt) => window.seek(tt), t);
    const el = await page.$('#stage');
    await el.screenshot({ path: path.join(framesDir, `f_${String(i).padStart(4,'0')}.png`) });
  }

  await browser.close();
  return { frames: N };
}
