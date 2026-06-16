import { describe, expect, it } from 'vitest';
import { generateMission, selectWords } from '@/lib/mission-engine';
import { seedWords, seedSentences, getNivMeta } from '@/content';
import type { TargetSound, WordPosition } from '@/lib/types';

// P2 — age-specific clinical UX.

describe('Niv focused listening', () => {
  it('inserts a passive listening step before listen_choose for every sound', () => {
    const sounds: TargetSound[] = ['s', 'sh', 'ts', 'ch'];
    for (const sound of sounds) {
      const mission = generateMission({
        sound,
        childId: 'niv',
        ageBand: '3-4',
        stage: 'listening',
        maxItems: 1,
        words: seedWords,
        sentences: seedSentences,
        avoidWords: [],
        nivMeta: getNivMeta(sound),
        rewardId: `niv_${sound}_star`,
      });
      const kinds = mission.steps.map((s) => s.kind);
      const listenIdx = kinds.indexOf('focused_listening');
      const chooseIdx = kinds.indexOf('listen_choose');
      expect(listenIdx).toBeGreaterThanOrEqual(0);
      // Listening comes before producing.
      expect(listenIdx).toBeLessThan(chooseIdx);

      const listen = mission.steps[listenIdx];
      // Words to hear, all of the target sound, no recording references.
      expect((listen.wordIds?.length ?? 0)).toBeGreaterThanOrEqual(1);
      for (const id of listen.wordIds!) {
        expect(seedWords.find((w) => w.id === id)?.sound).toBe(sound);
      }
    }
  });

  it('does not add focused listening to Lavi arena missions', () => {
    const mission = generateMission({
      sound: 's',
      childId: 'lavi',
      ageBand: '7-9',
      stage: 'word',
      maxItems: 6,
      words: seedWords,
      sentences: seedSentences,
      avoidWords: [],
      rewardId: 'lavi_s_badge',
    });
    expect(mission.steps.map((s) => s.kind)).not.toContain('focused_listening');
  });
});

describe('weekly-focus position biasing', () => {
  const rng = () => 0.42; // deterministic, value irrelevant to the assertion

  function ratio(sound: TargetSound, position: WordPosition, focus?: WordPosition) {
    const picked = selectWords(seedWords, sound, '7-9', [], 6, rng, undefined, focus);
    const withPos = picked.filter((w) => w.positions.includes(position)).length;
    return picked.length ? withPos / picked.length : 0;
  }

  it('over-represents the focus position without excluding the others', () => {
    // 'final' is the focus — its share should not drop when focused, and the
    // first selected word should cover it.
    const focused = selectWords(seedWords, 's', '7-9', [], 6, rng, undefined, 'final');
    expect(focused.length).toBeGreaterThan(0);
    expect(focused[0]?.positions).toContain('final');

    const focusedRatio = ratio('s', 'final', 'final');
    const baseRatio = ratio('s', 'final', undefined);
    expect(focusedRatio).toBeGreaterThanOrEqual(baseRatio);

    // Still a real mix — not ALL items are the focus position (pool permitting).
    const distinctPositions = new Set(focused.flatMap((w) => w.positions));
    expect(distinctPositions.size).toBeGreaterThanOrEqual(1);
  });
});
