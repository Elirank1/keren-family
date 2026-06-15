import { repo } from '@/db/repo';
import type { AttemptRating, ChildId, RecordingAttempt, TargetSound } from './types';

export interface ChildStats {
  childId: ChildId;
  sessionsCompleted: number;
  lastPracticeDate?: string;
  enabledSounds: TargetSound[];
  ratingCounts: Partial<Record<AttemptRating, number>>;
  topWords: { wordId: string; count: number }[];
  latestAttempts: RecordingAttempt[];
}

// Compute a child's dashboard summary. Deliberately keeps each child fully
// separate — there is no cross-child comparison anywhere.
export async function computeChildStats(childId: ChildId): Promise<ChildStats> {
  const [attempts, sessions, enabledSounds] = await Promise.all([
    repo.getAttemptsByChild(childId),
    repo.getSessionsByChild(childId),
    repo.getEnabledSounds(childId),
  ]);

  const completed = sessions.filter((s) => s.completedAt);
  const sorted = [...completed].sort((a, b) =>
    (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
  );

  const ratingCounts: Partial<Record<AttemptRating, number>> = {};
  for (const a of attempts) {
    if (a.rating) ratingCounts[a.rating] = (ratingCounts[a.rating] ?? 0) + 1;
  }

  const wordCounts = new Map<string, number>();
  for (const a of attempts) {
    if (a.wordId) wordCounts.set(a.wordId, (wordCounts.get(a.wordId) ?? 0) + 1);
  }
  const topWords = [...wordCounts.entries()]
    .map(([wordId, count]) => ({ wordId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const latestAttempts = [...attempts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return {
    childId,
    sessionsCompleted: completed.length,
    lastPracticeDate: sorted[0]?.completedAt,
    enabledSounds,
    ratingCounts,
    topWords,
    latestAttempts,
  };
}
