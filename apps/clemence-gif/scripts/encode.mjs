// scripts/encode.mjs
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
const run = promisify(execFile);

export async function encode(framesDir, outBase, { fps, outputs }) {
  const input = path.join(framesDir, 'f_%04d.png');
  const results = {};

  if (outputs.includes('mp4')) {
    const mp4 = `${outBase}.mp4`;
    await run('ffmpeg', ['-y','-framerate',String(fps),'-i',input,
      '-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',
      '-vf','scale=1080:-2', mp4]);
    results.mp4 = mp4;
  }

  if (outputs.includes('gif')) {
    const palette = path.join(framesDir, 'palette.png');
    const gif = `${outBase}.gif`;
    // passe 1 : palette optimisée
    await run('ffmpeg', ['-y','-framerate',String(fps),'-i',input,
      '-vf',`fps=${fps},scale=720:-1:flags=lanczos,palettegen=stats_mode=diff`, palette]);
    // passe 2 : application
    await run('ffmpeg', ['-y','-framerate',String(fps),'-i',input,'-i',palette,
      '-lavfi',`fps=${fps},scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
      gif]);
    results.gif = gif;
  }
  return results;
}
