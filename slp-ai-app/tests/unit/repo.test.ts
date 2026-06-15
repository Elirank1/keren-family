import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { repo } from '@/db/repo';
import { ensureSeeded } from '@/db/seed';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

describe('child attempts', () => {
  it('keeps attempts associated with the correct child', async () => {
    const blob = new Blob(['lavi'], { type: 'audio/webm' });
    const blobId = await repo.saveAudioBlob(blob, 'audio/webm', 'attempt');
    await repo.saveAttempt({
      childId: 'lavi',
      sound: 's',
      promptType: 'word',
      wordId: 's_sus',
      recordingBlobId: blobId,
      mimeType: 'audio/webm',
      durationMs: 1000,
    });

    const nivBlobId = await repo.saveAudioBlob(blob, 'audio/webm', 'attempt');
    await repo.saveAttempt({
      childId: 'niv',
      sound: 's',
      promptType: 'word',
      wordId: 's_sus',
      recordingBlobId: nivBlobId,
      mimeType: 'audio/webm',
      durationMs: 1000,
    });

    const laviAttempts = await repo.getAttemptsByChild('lavi');
    const nivAttempts = await repo.getAttemptsByChild('niv');
    expect(laviAttempts).toHaveLength(1);
    expect(nivAttempts).toHaveLength(1);
    expect(laviAttempts[0].childId).toBe('lavi');
    expect(nivAttempts[0].childId).toBe('niv');
  });

  it('has no automatic correctness/score field on attempts', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const blobId = await repo.saveAudioBlob(blob, 'audio/webm', 'attempt');
    const attempt = await repo.saveAttempt({
      childId: 'lavi',
      sound: 's',
      promptType: 'word',
      recordingBlobId: blobId,
      mimeType: 'audio/webm',
      durationMs: 500,
    });
    const keys = Object.keys(attempt);
    for (const forbidden of ['correct', 'isCorrect', 'score', 'accuracy', 'pass', 'graded']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('deletes the audio blob when an attempt is deleted', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const blobId = await repo.saveAudioBlob(blob, 'audio/webm', 'attempt');
    const attempt = await repo.saveAttempt({
      childId: 'lavi',
      sound: 's',
      promptType: 'word',
      recordingBlobId: blobId,
      mimeType: 'audio/webm',
      durationMs: 500,
    });
    await repo.deleteAttempt(attempt.id);
    expect(await repo.getAudioBlob(blobId)).toBeUndefined();
    expect(await repo.getAttempt(attempt.id)).toBeUndefined();
  });
});

describe('seeding', () => {
  it('activates all four sounds by default while keeping cues provisional', async () => {
    const laviEnabled = (await repo.getEnabledSounds('lavi')).sort();
    const nivEnabled = (await repo.getEnabledSounds('niv')).sort();
    expect(laviEnabled).toEqual(['ch', 's', 'sh', 'ts']);
    expect(nivEnabled).toEqual(['ch', 's', 'sh', 'ts']);

    const configs = await repo.getClinicianConfigs('lavi');
    expect(configs).toHaveLength(4);
    // Active ≠ clinically approved: cues stay provisional until a clinician signs off.
    for (const c of configs) expect(c.clinicianApproved).toBe(false);
  });

  it('does not overwrite parent edits on a second ensureSeeded run', async () => {
    await repo.setWordEnabled('s_sus', false);
    await ensureSeeded();
    const word = await repo.getWord('s_sus');
    expect(word?.enabled).toBe(false);
  });
});
