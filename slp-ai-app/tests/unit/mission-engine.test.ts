import { describe, expect, it } from 'vitest';
import { generateMission, selectWords } from '@/lib/mission-engine';
import { makeRng } from '@/lib/rng';
import { seedWords, seedSounds, getLaviMeta, getNivMeta } from '@/content';
import type { PracticeWord, TargetSound } from '@/lib/types';

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];

function wordsFor(sound: TargetSound): PracticeWord[] {
  return seedWords.filter((w) => w.sound === sound);
}

describe('sound taxonomy', () => {
  it('keeps the four sounds distinct with no overlap', () => {
    const ids = seedSounds.map((s) => s.id).sort();
    expect(ids).toEqual(['ch', 's', 'sh', 'ts']);
  });

  it('never classifies a שׁ word as /s/ and keeps ts and ch separate', () => {
    const shWords = seedWords.filter((w) => w.text.includes('שׁ') || w.id.startsWith('sh_'));
    for (const w of shWords) expect(w.sound).toBe('sh');

    // צנון is /ts/, צ׳יפס is /ch/ — must not be merged.
    const tznon = seedWords.find((w) => w.id === 'ts_tznon');
    const chips = seedWords.find((w) => w.id === 'ch_chips');
    expect(tznon?.sound).toBe('ts');
    expect(chips?.sound).toBe('ch');
    expect(tznon?.sound).not.toBe(chips?.sound);
  });
});

describe('mission generator — filtering', () => {
  it('filters by age band', () => {
    const rng = makeRng('test');
    const selected = selectWords(seedWords, 's', '3-4', [], 6, rng);
    for (const w of selected) expect(w.ageBands).toContain('3-4');
  });

  it('excludes avoided words (by id and by text)', () => {
    const rng = makeRng('avoid');
    const selected = selectWords(seedWords, 's', '7-9', ['s_sus', 'מסיבה'], 6, rng);
    expect(selected.some((w) => w.id === 's_sus')).toBe(false);
    expect(selected.some((w) => w.text === 'מסיבה')).toBe(false);
  });

  it('excludes disabled words', () => {
    const rng = makeRng('disabled');
    const words = seedWords.map((w) =>
      w.id === 's_sus' ? { ...w, enabled: false } : w,
    );
    const selected = selectWords(words, 's', '7-9', [], 6, rng);
    expect(selected.some((w) => w.id === 's_sus')).toBe(false);
  });

  it('never shows the same word more than twice in one mission', () => {
    const rng = makeRng('dup');
    // Tiny pool to force potential repeats.
    const tiny = wordsFor('s').slice(0, 2);
    const selected = selectWords(tiny, 's', '7-9', [], 6, rng);
    const counts = new Map<string, number>();
    for (const w of selected) counts.set(w.id, (counts.get(w.id) ?? 0) + 1);
    for (const c of counts.values()) expect(c).toBeLessThanOrEqual(2);
  });

  it('is deterministic for the same seed', () => {
    const a = selectWords(seedWords, 's', '7-9', [], 6, makeRng('same'));
    const b = selectWords(seedWords, 's', '7-9', [], 6, makeRng('same'));
    expect(a.map((w) => w.id)).toEqual(b.map((w) => w.id));
  });
});

describe('mission generator — structure', () => {
  const base = {
    sound: 's' as TargetSound,
    words: seedWords,
    sentences: [],
    avoidWords: [],
    rewardId: 'r',
  };

  it('gives Lavi and Niv visibly different structures from the same sound', () => {
    const lavi = generateMission({
      ...base,
      childId: 'lavi',
      ageBand: '7-9',
      stage: 'word',
      maxItems: 6,
      laviMeta: getLaviMeta('s'),
      bossSentenceIds: [],
    });
    const niv = generateMission({
      ...base,
      childId: 'niv',
      ageBand: '3-4',
      stage: 'listening',
      maxItems: 1,
      nivMeta: getNivMeta('s'),
    });

    const laviKinds = lavi.steps.map((s) => s.kind);
    const nivKinds = niv.steps.map((s) => s.kind);

    expect(laviKinds).toContain('warmup');
    expect(laviKinds.filter((k) => k === 'word').length).toBeGreaterThan(1);
    expect(nivKinds).toContain('listen_choose');
    expect(nivKinds).toContain('say_three');
    expect(nivKinds).not.toContain('warmup');
    expect(laviKinds).not.toEqual(nivKinds);
    expect(lavi.estimatedMinutes).not.toBe(niv.estimatedMinutes);
  });

  it('works for all four sounds', () => {
    for (const sound of SOUNDS) {
      const mission = generateMission({
        ...base,
        sound,
        childId: 'lavi',
        ageBand: '7-9',
        stage: 'word',
        maxItems: 6,
        laviMeta: getLaviMeta(sound),
      });
      expect(mission.sound).toBe(sound);
      expect(mission.steps.length).toBeGreaterThan(2);
    }
  });
});
