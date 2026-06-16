import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { repo } from '@/db/repo';
import { ensureSeeded } from '@/db/seed';
import { buildAndSaveMission } from '@/lib/mission-service';
import { generateMission } from '@/lib/mission-engine';
import { seedWords, seedSentences, getLaviMeta, getNivMeta } from '@/content';
import type { ContrastItem, InterventionMode, TargetSound } from '@/lib/types';

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];

function sampleContrast(): ContrastItem {
  return {
    id: 'test_pair',
    targetSound: 's',
    contrastSound: 'sh',
    targetWord: 'סיר',
    contrastWord: 'שיר',
    kind: 'true_minimal_pair',
    meaningChanging: true,
    language: 'he',
    ageBands: ['7-9'],
    hasImages: false,
    clinicallyReviewed: true,
    clinicianApproved: true,
    enabled: true,
  };
}

function laviMission(mode: InterventionMode, enabledContrastItems: ContrastItem[] = []) {
  return generateMission({
    sound: 's',
    childId: 'lavi',
    ageBand: '7-9',
    stage: 'word',
    maxItems: 6,
    words: seedWords,
    sentences: seedSentences,
    avoidWords: [],
    laviMeta: getLaviMeta('s'),
    bossSentenceIds: [],
    rewardId: 'lavi_s_badge',
    mode,
    enabledContrastItems,
  });
}

describe('contrast / minimal pairs never activate on their own', () => {
  it('produces no contrast step in the neutral (unset) default', () => {
    const kinds = laviMission('unset').steps.map((s) => s.kind);
    expect(kinds).not.toContain('contrast');
  });

  it('produces no contrast step for minimal_pairs when no items are enabled', () => {
    const kinds = laviMission('minimal_pairs', []).steps.map((s) => s.kind);
    expect(kinds).not.toContain('contrast');
  });

  it('adds a contrast step ONLY when the mode is explicit AND an item is enabled', () => {
    const steps = laviMission('minimal_pairs', [sampleContrast()]).steps;
    const contrast = steps.find((s) => s.kind === 'contrast');
    expect(contrast).toBeTruthy();
    expect(contrast?.contrastItemId).toBe('test_pair');
  });

  it('motor_articulation never injects contrast even with enabled items present', () => {
    const kinds = laviMission('motor_articulation', [sampleContrast()]).steps.map((s) => s.kind);
    expect(kinds).not.toContain('contrast');
  });

  it('cycles is not activated by age and does not add contrast', () => {
    // A preschooler on the neutral default must not get cycles behavior.
    for (const age of ['3-4', '7-9'] as const) {
      const m = generateMission({
        sound: 's',
        childId: age === '3-4' ? 'niv' : 'lavi',
        ageBand: age,
        stage: age === '3-4' ? 'listening' : 'word',
        maxItems: age === '3-4' ? 1 : 6,
        words: seedWords,
        sentences: seedSentences,
        avoidWords: [],
        laviMeta: age === '3-4' ? undefined : getLaviMeta('s'),
        nivMeta: age === '3-4' ? getNivMeta('s') : undefined,
        bossSentenceIds: [],
        rewardId: 'r',
        mode: 'unset',
      });
      expect(m.steps.map((s) => s.kind)).not.toContain('contrast');
    }
  });
});

describe('seeded intervention defaults', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it('seeds the contrast library entirely disabled and unapproved', async () => {
    const items = await repo.getContrastItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.enabled).toBe(false);
      expect(item.clinicianApproved).toBe(false);
    }
  });

  it('never manufactures a true /ts/–/tʃ/ minimal pair', () => {
    // (pure content check) — ts↔ch items must not claim to be true minimal pairs.
    return repo.getContrastItems().then((items) => {
      const tsCh = items.filter((i) => i.targetSound === 'ts' && i.contrastSound === 'ch');
      for (const i of tsCh) {
        expect(i.kind).not.toBe('true_minimal_pair');
        expect(i.meaningChanging).toBe(false);
      }
    });
  });

  it('exposes no enabled contrast items for any sound by default', async () => {
    for (const s of SOUNDS) {
      expect(await repo.getEnabledContrastItems(s)).toEqual([]);
    }
  });

  it('has no clinical target profile until a clinician creates one (no inference)', async () => {
    for (const s of SOUNDS) {
      expect(await repo.getClinicalTarget('lavi', s)).toBeUndefined();
      expect(await repo.getClinicalTarget('niv', s)).toBeUndefined();
    }
  });

  it('builds a default mission with no contrast step end-to-end', async () => {
    const mission = await buildAndSaveMission('lavi', 's');
    expect(mission.steps.map((s) => s.kind)).not.toContain('contrast');
  });

  it('activates a contrast step only after a clinician enables an item AND selects minimal_pairs', async () => {
    const items = await repo.getContrastItems('s');
    const pair = items.find((i) => i.kind === 'true_minimal_pair')!;
    // Clinician enables + approves the item and selects the mode.
    await repo.setContrastItem({ ...pair, enabled: true, clinicianApproved: true });
    await repo.setClinicalTarget({
      ...(await repo.getClinicalTarget('lavi', 's')) ??
        { childId: 'lavi', sound: 's', interventionMode: 'unset', suspectedErrorType: 'unset', stimulability: 'not_checked', perceptionStatus: 'not_checked', targetWordPositions: [], currentPracticeLevel: 'unset', weeklyFocusRatio: 0.66, cueText: '', notes: '', clinicianApproved: false, updatedAt: '2026-06-16T00:00:00.000Z' },
      interventionMode: 'minimal_pairs',
    });
    const mission = await buildAndSaveMission('lavi', 's');
    expect(mission.steps.map((s) => s.kind)).toContain('contrast');
  });
});
