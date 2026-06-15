// Generate the Hebrew narration pack via ElevenLabs. Build-time only.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NARRATION, VOICES } from './config/assets.mjs';
import { tts, ELEVENLABS_MODEL } from './providers/elevenlabs.mjs';
import {
  GENERATED_DIR, ensureDir, loadManifest, nowIso, parseArgs, promptHash,
  publicPath, recordAsset, requireEnv, saveManifest, shouldGenerate,
} from './lib.mjs';

export async function generateNarration(args = parseArgs()) {
  const apiKey = requireEnv('ELEVENLABS_API_KEY');
  if (!apiKey) return { skipped: true };
  const manifest = loadManifest();
  let made = 0, cached = 0;

  for (const line of NARRATION) {
    if (made >= args.limit) break;
    if (args.child && line.child !== args.child) continue;
    const voiceId = VOICES[line.voice];
    const hash = promptHash({ text: line.text, voiceId, model: ELEVENLABS_MODEL });
    const rel = `audio/${line.id}.mp3`;
    const abs = join(GENERATED_DIR, rel);
    const decision = shouldGenerate(manifest, line.id, hash, abs, args);
    if (!decision.go) { cached++; continue; }

    console.log(`🎙  narration ${line.id} (${decision.reason})${args.dryRun ? ' [dry-run]' : ''}`);
    if (!args.dryRun) {
      const buf = await tts({ apiKey, voiceId, text: line.text });
      ensureDir(abs);
      writeFileSync(abs, buf);
    }
    recordAsset(manifest, {
      id: line.id, type: 'audio', purpose: 'game_narration', provider: 'elevenlabs',
      model: ELEVENLABS_MODEL, promptHash: hash, prompt: line.text,
      file: publicPath(rel), created: nowIso(),
      target: { child: line.child, kind: 'narration' },
    });
    made++;
  }
  if (!args.dryRun) saveManifest(manifest);
  console.log(`✓ narration: ${made} generated, ${cached} cached`);
  return { made, cached };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateNarration().catch((e) => { console.error(e); process.exit(1); });
}
