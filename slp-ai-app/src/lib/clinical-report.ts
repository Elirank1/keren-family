import { repo } from '@/db/repo';
import type {
  AttemptRating,
  ChildId,
  TargetSound,
  WordPosition,
} from './types';

export interface SoundReport {
  sound: TargetSound;
  total: number;
  baseline: number;
  byPosition: Record<WordPosition, number>;
  byPromptType: { isolated_sound: number; word: number; sentence: number };
}

export interface ParentNote {
  createdAt: string;
  sound: TargetSound;
  label: string;
  note: string;
}

export interface ClinicalReport {
  childId: ChildId;
  totalProductions: number;
  baselineCount: number;
  sessionsCompleted: number;
  lastPracticeDate?: string;
  byRating: Partial<Record<AttemptRating, number>>;
  bySound: SoundReport[];
  recentNotes: ParentNote[];
}

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];
const POSITIONS: WordPosition[] = ['initial', 'medial', 'final'];

function emptySoundReport(sound: TargetSound): SoundReport {
  return {
    sound,
    total: 0,
    baseline: 0,
    byPosition: { initial: 0, medial: 0, final: 0 },
    byPromptType: { isolated_sound: 0, word: 0, sentence: 0 },
  };
}

// Aggregate a child's recordings into a clinician-facing report: total
// productions (the metric that drives carryover), coverage by word position,
// rating trend, and recent parent notes. Per-child only — no comparison.
export async function computeClinicalReport(childId: ChildId): Promise<ClinicalReport> {
  const [attempts, sessions, words] = await Promise.all([
    repo.getAttemptsByChild(childId),
    repo.getSessionsByChild(childId),
    repo.getWords(),
  ]);
  const wordById = new Map(words.map((w) => [w.id, w]));

  const bySound = new Map<TargetSound, SoundReport>(
    SOUNDS.map((s) => [s, emptySoundReport(s)]),
  );
  const byRating: Partial<Record<AttemptRating, number>> = {};
  const recentNotes: ParentNote[] = [];

  for (const a of attempts) {
    const report = bySound.get(a.sound);
    if (report) {
      report.total += 1;
      if (a.baseline) report.baseline += 1;
      report.byPromptType[a.promptType] += 1;
      const w = a.wordId ? wordById.get(a.wordId) : undefined;
      if (w) {
        for (const pos of POSITIONS) {
          if (w.positions.includes(pos)) report.byPosition[pos] += 1;
        }
      }
    }
    if (a.rating) byRating[a.rating] = (byRating[a.rating] ?? 0) + 1;
    if (a.parentNote && a.parentNote.trim()) {
      const w = a.wordId ? wordById.get(a.wordId) : undefined;
      recentNotes.push({
        createdAt: a.createdAt,
        sound: a.sound,
        label: w?.text ?? (a.sentenceId ? 'משפט' : 'הצליל לבד'),
        note: a.parentNote.trim(),
      });
    }
  }

  const completed = sessions.filter((s) => s.completedAt);
  const lastPracticeDate = completed
    .map((s) => s.completedAt!)
    .sort((a, b) => b.localeCompare(a))[0];

  recentNotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    childId,
    totalProductions: attempts.length,
    baselineCount: attempts.filter((a) => a.baseline).length,
    sessionsCompleted: completed.length,
    lastPracticeDate,
    byRating,
    bySound: SOUNDS.map((s) => bySound.get(s)!),
    recentNotes: recentNotes.slice(0, 12),
  };
}
