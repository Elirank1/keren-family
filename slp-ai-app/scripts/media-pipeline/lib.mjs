// Shared helpers for the build-time media pipeline.
// - never commits keys (read from env)
// - idempotent + cached via prompt hashes
// - --dry-run / --limit / --child / --sound flags
// - never overwrites APPROVED assets unless --force
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GENERATED_DIR = join(ROOT, 'public', 'generated');
export const MANIFEST_PATH = join(GENERATED_DIR, 'generated-assets.manifest.json');

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { dryRun: false, force: false, limit: Infinity, child: null, sound: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--child') args.child = argv[++i];
    else if (a === '--sound') args.sound = argv[++i];
  }
  return args;
}

export function promptHash(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

export function loadManifest() {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      // fall through to fresh manifest
    }
  }
  return { app: 'SLP-AI', schemaVersion: 1, assets: {} };
}

export function saveManifest(manifest) {
  mkdirSync(GENERATED_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

export function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

// Decide whether to (re)generate an asset.
// Skips when the file exists and the prompt hash is unchanged (cache hit).
// Never regenerates an APPROVED asset unless --force.
export function shouldGenerate(manifest, id, hash, absFile, args) {
  const existing = manifest.assets[id];
  if (existing?.status === 'approved' && !args.force) return { go: false, reason: 'approved' };
  if (existing?.status === 'rejected' && !args.force) return { go: false, reason: 'rejected' };
  if (existing && existing.promptHash === hash && existsSync(absFile) && !args.force) {
    return { go: false, reason: 'cached' };
  }
  return { go: true, reason: existing ? 'changed' : 'new' };
}

export function recordAsset(manifest, asset) {
  // Preserve an approved/rejected status across regeneration unless changed.
  const prev = manifest.assets[asset.id];
  manifest.assets[asset.id] = {
    status: prev?.status && prev.status !== 'provisional' ? prev.status : 'provisional',
    ...asset,
  };
}

export function nowIso() {
  return new Date().toISOString();
}

// Public URL the app fetches an asset by (relative to Vite BASE_URL).
export function publicPath(relFromGenerated) {
  return `generated/${relFromGenerated}`;
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`⚠ Missing ${name} — skipping (app degrades gracefully).`);
    return null;
  }
  return v;
}
