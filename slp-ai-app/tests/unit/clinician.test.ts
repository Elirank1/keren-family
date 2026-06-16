import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { repo } from '@/db/repo';
import { ensureSeeded } from '@/db/seed';
import { computeClinicalReport } from '@/lib/clinical-report';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
});

async function addAttempt(opts: {
  childId: 'lavi' | 'niv';
  sound: 's' | 'sh' | 'ts' | 'ch';
  wordId?: string;
  promptType?: 'isolated_sound' | 'word' | 'sentence';
  rating?: 'independent' | 'after_model' | 'not_yet';
  note?: string;
  baseline?: boolean;
}) {
  const blobId = await repo.saveAudioBlob(new Blob(['a'], { type: 'audio/mp4' }), 'audio/mp4', 'attempt');
  const a = await repo.saveAttempt({
    childId: opts.childId,
    sound: opts.sound,
    wordId: opts.wordId,
    promptType: opts.promptType ?? 'word',
    recordingBlobId: blobId,
    mimeType: 'audio/mp4',
    durationMs: 500,
    baseline: opts.baseline,
  });
  if (opts.rating) await repo.setAttemptRating(a.id, opts.rating);
  if (opts.note) await repo.setAttemptNote(a.id, opts.note);
  return a;
}

describe('clinical report', () => {
  it('counts productions per sound, position and prompt type', async () => {
    // s_sus has positions initial + final.
    await addAttempt({ childId: 'lavi', sound: 's', wordId: 's_sus', rating: 'independent' });
    await addAttempt({ childId: 'lavi', sound: 's', promptType: 'isolated_sound' });
    await addAttempt({ childId: 'lavi', sound: 'sh', wordId: 's_sus' /* wrong-sound id ok: still counts under sh */ });

    const report = await computeClinicalReport('lavi');
    expect(report.totalProductions).toBe(3);

    const s = report.bySound.find((x) => x.sound === 's')!;
    expect(s.total).toBe(2);
    expect(s.byPromptType.word).toBe(1);
    expect(s.byPromptType.isolated_sound).toBe(1);
    // The word attempt on s_sus covers initial + final positions.
    expect(s.byPosition.initial).toBe(1);
    expect(s.byPosition.final).toBe(1);
    expect(s.byPosition.medial).toBe(0);
  });

  it('aggregates ratings and surfaces parent notes', async () => {
    await addAttempt({ childId: 'niv', sound: 's', wordId: 's_sus', rating: 'independent', note: 'נשמע נהדר' });
    await addAttempt({ childId: 'niv', sound: 's', wordId: 's_sus', rating: 'independent' });

    const report = await computeClinicalReport('niv');
    expect(report.byRating.independent).toBe(2);
    expect(report.recentNotes.length).toBe(1);
    expect(report.recentNotes[0].note).toBe('נשמע נהדר');
  });

  it('keeps each child separate', async () => {
    await addAttempt({ childId: 'lavi', sound: 's' });
    const niv = await computeClinicalReport('niv');
    expect(niv.totalProductions).toBe(0);
  });
});

describe('weekly focus', () => {
  it('persists and reads back the clinician weekly focus per child', async () => {
    expect(await repo.getWeeklyFocus('lavi')).toBeUndefined();
    await repo.setWeeklyFocus('lavi', { sound: 's', position: 'initial', note: 'התמקדו ב-/s/ בתחילת מילה', updatedAt: '2026-06-16T00:00:00.000Z' });
    const focus = await repo.getWeeklyFocus('lavi');
    expect(focus?.sound).toBe('s');
    expect(focus?.position).toBe('initial');
    // Setting one child does not affect the other.
    expect(await repo.getWeeklyFocus('niv')).toBeUndefined();
  });
});
