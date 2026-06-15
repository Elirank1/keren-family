// Generate original images via Gemini (Nano Banana Pro). Build-time only.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGES } from './config/assets.mjs';
import { generateImage, GEMINI_IMAGE_MODEL } from './providers/gemini.mjs';
import {
  GENERATED_DIR, ensureDir, loadManifest, nowIso, parseArgs, promptHash,
  publicPath, recordAsset, requireEnv, saveManifest, shouldGenerate,
} from './lib.mjs';

export async function generateImages(args = parseArgs()) {
  const apiKey = requireEnv('GEMINI_API_KEY');
  if (!apiKey) return { skipped: true };
  const manifest = loadManifest();
  let made = 0, cached = 0, failed = 0;

  for (const img of IMAGES) {
    if (made >= args.limit) break;
    if (args.child && img.child && img.child !== args.child) continue;
    if (args.sound && img.sound && img.sound !== args.sound) continue;
    const hash = promptHash({ prompt: img.prompt, model: GEMINI_IMAGE_MODEL });
    const rel = `images/${img.id}.png`;
    const abs = join(GENERATED_DIR, rel);
    const decision = shouldGenerate(manifest, img.id, hash, abs, args);
    if (!decision.go) { cached++; continue; }

    console.log(`🖼  image ${img.id} (${decision.reason})${args.dryRun ? ' [dry-run]' : ''}`);
    if (!args.dryRun) {
      try {
        const buf = await generateImage({ apiKey, prompt: img.prompt });
        ensureDir(abs);
        writeFileSync(abs, buf);
      } catch (e) {
        console.error(`  ✗ ${img.id}: ${String(e).slice(0, 160)}`);
        failed++;
        continue;
      }
    }
    recordAsset(manifest, {
      id: img.id, type: 'image', purpose: 'visual_asset', provider: 'gemini',
      model: GEMINI_IMAGE_MODEL, promptHash: hash, prompt: img.prompt,
      file: publicPath(rel), created: nowIso(),
      target: { child: img.child ?? null, sound: img.sound ?? null },
    });
    made++;
  }
  if (!args.dryRun) saveManifest(manifest);
  console.log(`✓ images: ${made} generated, ${cached} cached, ${failed} failed`);
  return { made, cached, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateImages().catch((e) => { console.error(e); process.exit(1); });
}
