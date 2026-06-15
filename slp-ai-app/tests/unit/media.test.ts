import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAsset,
  isMuted,
  setMuted,
  playClip,
  loadMediaManifest,
} from '@/lib/media';

beforeEach(() => {
  localStorage.clear();
});

describe('generated media — graceful degradation', () => {
  it('returns no asset and never throws when the manifest is absent', async () => {
    // In the test environment there is no manifest to fetch.
    await expect(loadMediaManifest()).resolves.toBeNull();
    expect(getAsset('lavi_mission_start')).toBeUndefined();
    expect(() => playClip('lavi_mission_start')).not.toThrow();
    expect(() => playClip('does_not_exist')).not.toThrow();
  });

  it('persists the mute preference', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('playClip is a no-op when muted', () => {
    setMuted(true);
    expect(() => playClip('sfx_spark')).not.toThrow();
  });
});
