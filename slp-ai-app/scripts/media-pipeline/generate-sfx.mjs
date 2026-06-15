// Generate short sound effects via ElevenLabs sound-generation. Build-time only.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SFX } from './config/assets.mjs';
import { soundEffect } from './providers/elevenlabs.mjs';
import {
  GENERATED_DIR, ensureDir, loadManifest, nowIso, parseArgs, promptHash,
  publicPath, recordAsset, requireEnv, saveManifest, shouldGenerate,
} from './lib.mjs';

export async function generateSfx(args = parseArgs()) {
  const apiKey = requireEnv('ELEVENLABS_API_KEY');
  if (!apiKey) return { skipped: true };
  const manifest = loadManifest();
  let made = 0, cached = 0;

  for (const fx of SFX) {
    if (made >= args.limit) break;
    const hash = promptHash({ text: fx.text, duration: fx.duration, kind: 'sfx' });
    const rel = `audio/${fx.id}.mp3`;
    const abs = join(GENERATED_DIR, rel);
    const decision = shouldGenerate(manifest, fx.id, hash, abs, args);
    if (!decision.go) { cached++; continue; }

    console.log(`🔊 sfx ${fx.id} (${decision.reason})${args.dryRun ? ' [dry-run]' : ''}`);
    if (!args.dryRun) {
      const buf = await soundEffect({ apiKey, text: fx.text, durationSeconds: fx.duration });
      ensureDir(abs);
      writeFileSync(abs, buf);
    }
    recordAsset(manifest, {
      id: fx.id, type: 'audio', purpose: 'sound_effect', provider: 'elevenlabs',
      model: 'eleven_sound_generation', promptHash: hash, prompt: fx.text,
      file: publicPath(rel), created: nowIso(), target: { kind: 'sfx' },
    });
    made++;
  }
  if (!args.dryRun) saveManifest(manifest);
  console.log(`✓ sfx: ${made} generated, ${cached} cached`);
  return { made, cached };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateSfx().catch((e) => { console.error(e); process.exit(1); });
}
