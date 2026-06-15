import { describe, expect, it } from 'vitest';
import { generateMission } from '@/lib/mission-engine';
import {
  seedWords,
  seedSentences,
  getLaviMeta,
  getNivMeta,
  missionMeta,
} from '@/content';
import type { TargetSound } from '@/lib/types';

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];

// Guarantees the "all four sounds usable tonight" milestone: a complete minimum
// mission must build for every sound × every child, end to end.
describe('all four sounds — complete missions per child', () => {
  it('builds a full Lavi arena mission for each sound (briefing→warmup→5+ words→boss→completion)', () => {
    for (const sound of SOUNDS) {
      const bossSentenceIds = missionMeta.lavi[sound].bossSentenceIds.filter((id) =>
        seedSentences.some((s) => s.id === id),
      );
      const mission = generateMission({
        sound,
        childId: 'lavi',
        ageBand: '7-9',
        stage: 'word',
        maxItems: 6,
        words: seedWords,
        sentences: seedSentences,
        avoidWords: [],
        laviMeta: getLaviMeta(sound),
        bossSentenceIds,
        rewardId: `lavi_${sound}_badge`,
      });
      const kinds = mission.steps.map((s) => s.kind);
      expect(kinds[0]).toBe('briefing');
      expect(kinds).toContain('warmup');
      expect(kinds.filter((k) => k === 'word').length).toBeGreaterThanOrEqual(5);
      expect(kinds).toContain('sentence'); // one boss sentence
      expect(kinds.at(-1)).toBe('completion');
    }
  });

  it('builds a full Niv garden mission for each sound (briefing→listen→say-three→completion)', () => {
    for (const sound of SOUNDS) {
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
      expect(kinds[0]).toBe('briefing');
      expect(kinds).toContain('listen_choose');
      expect(kinds).toContain('say_three');
      expect(kinds).not.toContain('warmup'); // no school-age warmup for preschool
      expect(kinds.at(-1)).toBe('completion');

      // Listen-and-choose must offer a real choice (target + distractors).
      const choose = mission.steps.find((s) => s.kind === 'listen_choose');
      expect((choose?.choiceWordIds?.length ?? 0)).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps ts and ch as distinct sounds with their own missions and rewards', () => {
    expect(missionMeta.lavi.ts.title).not.toBe(missionMeta.lavi.ch.title);
    expect(getNivMeta('ts').animal).not.toBe(getNivMeta('ch').animal);
  });
});
