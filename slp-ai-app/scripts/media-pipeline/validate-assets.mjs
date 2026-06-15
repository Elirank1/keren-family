// Validate manifest integrity: every manifest entry has a file on disk.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED_DIR, loadManifest } from './lib.mjs';

export function validateAssets() {
  const manifest = loadManifest();
  const ids = Object.keys(manifest.assets);
  let missing = 0;
  for (const id of ids) {
    const a = manifest.assets[id];
    const abs = join(GENERATED_DIR, a.file.replace(/^generated\//, ''));
    if (!existsSync(abs)) {
      console.error(`✗ missing file for ${id}: ${a.file}`);
      missing++;
    }
  }
  console.log(`validate: ${ids.length} assets, ${missing} missing`);
  if (missing > 0) process.exitCode = 1;
  return { total: ids.length, missing };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateAssets();
}
