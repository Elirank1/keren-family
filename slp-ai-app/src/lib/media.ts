// Runtime layer for build-time generated media (narration, SFX, images).
// Everything degrades gracefully: if the manifest or a file is missing, calls
// become silent no-ops. Generated audio is GAME audio only — never presented as
// a clinical pronunciation model.

export type AssetStatus = 'provisional' | 'approved' | 'rejected';

export interface GeneratedAsset {
  id: string;
  type: 'audio' | 'image' | 'video';
  purpose: string;
  provider: string;
  model: string;
  file: string; // relative to BASE_URL, e.g. "generated/audio/x.mp3"
  status: AssetStatus;
  promptHash?: string;
  prompt?: string;
  created?: string;
  target?: Record<string, unknown>;
}

interface Manifest {
  app: string;
  schemaVersion: number;
  assets: Record<string, GeneratedAsset>;
}

const BASE = import.meta.env.BASE_URL || '/';
let manifestPromise: Promise<Manifest | null> | null = null;

export function loadMediaManifest(): Promise<Manifest | null> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const res = await fetch(`${BASE}generated/generated-assets.manifest.json`, {
          cache: 'no-cache',
        });
        if (!res.ok) return null;
        return (await res.json()) as Manifest;
      } catch {
        return null; // no generated media → silent fallback
      }
    })();
  }
  return manifestPromise;
}

let cache: Manifest | null = null;
loadMediaManifest().then((m) => {
  cache = m;
});

export function getAsset(id: string): GeneratedAsset | undefined {
  const a = cache?.assets[id];
  if (!a || a.status === 'rejected') return undefined;
  return a;
}

export function assetUrl(id: string): string | undefined {
  const a = getAsset(id);
  return a ? `${BASE}${a.file}` : undefined;
}

// ---- Mute control (game audio only) ----
const MUTE_KEY = 'slp-muted';
export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
export function setMuted(v: boolean): void {
  try {
    if (v) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* ignore */
  }
}

let current: HTMLAudioElement | null = null;

// Play a generated audio clip by id. No-op if muted, missing, or playback is
// blocked (no user gesture). Only one clip plays at a time.
export function playClip(id: string): void {
  if (isMuted()) return;
  const url = assetUrl(id);
  if (!url) return;
  try {
    if (current) {
      current.pause();
      current = null;
    }
    const audio = new Audio(url);
    current = audio;
    void audio.play().catch(() => {
      /* autoplay blocked or decode error — silent */
    });
  } catch {
    /* ignore */
  }
}

export function hasImage(id: string): boolean {
  const a = getAsset(id);
  return !!a && a.type === 'image';
}
