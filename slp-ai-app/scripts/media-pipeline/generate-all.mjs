// Orchestrate the full media pipeline. Each stage degrades gracefully when its
// provider key is absent. Honors --dry-run / --limit / --child / --sound.
import { parseArgs } from './lib.mjs';
import { generateNarration } from './generate-narration.mjs';
import { generateSfx } from './generate-sfx.mjs';
import { generateImages } from './generate-images.mjs';
import { validateAssets } from './validate-assets.mjs';

const args = parseArgs();
console.log('▶ media pipeline', JSON.stringify(args));

await generateNarration(args);
await generateSfx(args);
await generateImages(args);
validateAssets();

console.log('✓ media pipeline done');
