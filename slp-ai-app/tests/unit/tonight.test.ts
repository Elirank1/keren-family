import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { repo } from '@/db/repo';
import { ensureSeeded } from '@/db/seed';
import {
  buildModelAudioQueue,
  buildBaselineQueue,
  computeReadiness,
  enabledSoundsInOrder,
} from '@/features/parent/tonight/tonight';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

describe('tonight prep — queue builders', () => {
  it('model-audio queue is isolated sound → words → sentence, capped', async () => {
    const q = await buildModelAudioQueue('sh', 5);
    expect(q[0].promptType).toBe('isolated_sound');
    expect(q.filter((i) => i.promptType === 'word').length).toBeLessThanOrEqual(5);
    expect(q.some((i) => i.promptType === 'sentence')).toBe(true);
    for (const i of q) expect(i.sound).toBe('sh');
  });

  it('Lavi baseline queue includes a sentence; Niv baseline has no sentence and ≤3 words', async () => {
    const lavi = await buildBaselineQueue('lavi', 's');
    expect(lavi[0].promptType).toBe('isolated_sound');
    expect(lavi.some((i) => i.promptType === 'sentence')).toBe(true);

    const niv = await buildBaselineQueue('niv', 's');
    expect(niv.some((i) => i.promptType === 'sentence')).toBe(false);
    expect(niv.filter((i) => i.promptType === 'word').length).toBeLessThanOrEqual(3);
  });

  it('all four sounds are available to the tonight flow', async () => {
    expect(await enabledSoundsInOrder('lavi')).toEqual(['s', 'sh', 'ts', 'ch']);
    expect(await enabledSoundsInOrder('niv')).toEqual(['s', 'sh', 'ts', 'ch']);
  });
});

describe('tonight prep — readiness', () => {
  it('reflects empty state, then flips as model audio and baseline are added', async () => {
    const before = await computeReadiness();
    expect(before.modelAudioReady).toBe(false);
    expect(before.baselineReady).toBe(false);
    expect(before.firstMissionReady).toBe(true); // all sounds active
    expect(before.storageOk).toBe(true);

    const blobId = await repo.saveAudioBlob(new Blob(['m']), 'audio/webm', 'model');
    await repo.saveModelAudio({
      sound: 's',
      promptType: 'isolated_sound',
      blobId,
      mimeType: 'audio/webm',
      durationMs: 500,
      clinicianApproved: false,
      label: 'הצליל לבד',
    });
    const baseBlob = await repo.saveAudioBlob(new Blob(['b']), 'audio/webm', 'attempt');
    await repo.saveAttempt({
      childId: 'lavi',
      sound: 's',
      promptType: 'word',
      wordId: 's_sus',
      recordingBlobId: baseBlob,
      mimeType: 'audio/webm',
      durationMs: 500,
      baseline: true,
    });

    const after = await computeReadiness();
    expect(after.modelAudioReady).toBe(true);
    expect(after.baselineReady).toBe(true);
    expect(after.baselineByChild.lavi).toBe(1);
  });

  it('keeps model audio provisional (not clinician-approved) when saved by the flow', async () => {
    const blobId = await repo.saveAudioBlob(new Blob(['m']), 'audio/webm', 'model');
    await repo.saveModelAudio({
      sound: 'ts',
      promptType: 'isolated_sound',
      blobId,
      mimeType: 'audio/webm',
      durationMs: 400,
      clinicianApproved: false,
      label: 'הצליל לבד',
    });
    const list = await repo.getModelAudioList();
    expect(list.every((m) => m.clinicianApproved === false)).toBe(true);
  });
});
