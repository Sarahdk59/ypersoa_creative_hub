// scripts/render.mjs
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { captureFrames } from './capture.mjs';
import { encode } from './encode.mjs';

export async function renderGif(spec, outDir) {
  const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clemence-'));
  const { frames } = await captureFrames(spec, framesDir);
  await fs.mkdir(outDir, { recursive: true });
  const outBase = path.join(outDir, spec.id);
  const files = await encode(framesDir, outBase, spec);
  await fs.rm(framesDir, { recursive: true, force: true });
  return { id: spec.id, frames, durationMs: Math.round(spec.durationSec*1000), files };
}

// exécution directe : node scripts/render.mjs specs/xxx.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error('Usage: node scripts/render.mjs specs/xxx.json');
    process.exit(1);
  }
  const __dir = path.dirname(new URL(import.meta.url).pathname);
  const APP = path.resolve(__dir, '..');
  const spec = JSON.parse(await fs.readFile(path.resolve(specPath), 'utf-8'));
  const result = await renderGif(spec, path.join(APP, 'out'));
  console.log(JSON.stringify(result, null, 2));
}
