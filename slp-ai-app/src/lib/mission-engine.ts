import type {
  AgeBand,
  GeneratedMission,
  MissionRequest,
  MissionStep,
  PracticeSentence,
  PracticeWord,
} from './types';
import type { LaviMissionMeta, NivMissionMeta } from '@/content';
import { makeRng, seededShuffle } from './rng';
import { uid, nowIso } from './ids';

export interface MissionEngineInput extends MissionRequest {
  words: PracticeWord[];
  sentences: PracticeSentence[];
  laviMeta?: LaviMissionMeta;
  nivMeta?: NivMissionMeta;
  avoidWords: string[];
  /** Word ids that have a recorded model audio — preferred but never required. */
  wordsWithModelAudio?: Set<string>;
  bossSentenceIds?: string[];
  rewardId: string;
}

const POSITION_ORDER = ['initial', 'medial', 'final'] as const;

// Select practice words for a mission honoring all engine rules:
//  - age band, enabled words, avoided words filtered out
//  - position mixing when possible
//  - no word appears more than twice
//  - prefer words that have model audio (stable, never blocking)
export function selectWords(
  words: PracticeWord[],
  sound: MissionRequest['sound'],
  ageBand: AgeBand,
  avoidWords: string[],
  maxItems: number,
  rng: () => number,
  wordsWithModelAudio?: Set<string>,
): PracticeWord[] {
  const avoidSet = new Set(avoidWords);
  const pool = words.filter(
    (w) =>
      w.sound === sound &&
      (w.enabled ?? true) &&
      w.ageBands.includes(ageBand) &&
      !avoidSet.has(w.id) &&
      !avoidSet.has(w.text),
  );

  // Prefer model-audio words first, then shuffle within each tier so we keep
  // variety while honoring the preference.
  const shuffled = seededShuffle(pool, rng);
  const withAudio: PracticeWord[] = [];
  const without: PracticeWord[] = [];
  for (const w of shuffled) {
    if (wordsWithModelAudio?.has(w.id)) withAudio.push(w);
    else without.push(w);
  }
  const ordered = [...withAudio, ...without];

  // Position-mixing greedy pass: walk position buckets round-robin.
  const byPosition = new Map<string, PracticeWord[]>();
  for (const pos of POSITION_ORDER) byPosition.set(pos, []);
  for (const w of ordered) {
    const primary = POSITION_ORDER.find((p) => w.positions.includes(p)) ?? 'initial';
    byPosition.get(primary)!.push(w);
  }

  const selected: PracticeWord[] = [];
  const usedCount = new Map<string, number>();
  let exhausted = false;
  while (selected.length < maxItems && !exhausted) {
    let addedThisRound = false;
    for (const pos of POSITION_ORDER) {
      if (selected.length >= maxItems) break;
      const bucket = byPosition.get(pos)!;
      const next = bucket.shift();
      if (next && (usedCount.get(next.id) ?? 0) < 2) {
        selected.push(next);
        usedCount.set(next.id, (usedCount.get(next.id) ?? 0) + 1);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) exhausted = true;
  }

  // If under target (small pool), allow a single controlled repeat up to twice.
  if (selected.length < maxItems && pool.length > 0) {
    const repeatable = seededShuffle(pool, rng);
    for (const w of repeatable) {
      if (selected.length >= maxItems) break;
      if ((usedCount.get(w.id) ?? 0) < 2) {
        selected.push(w);
        usedCount.set(w.id, (usedCount.get(w.id) ?? 0) + 1);
      }
    }
  }

  return selected;
}

export function generateMission(input: MissionEngineInput): GeneratedMission {
  const seed = input.seed ?? `${input.childId}:${input.sound}:default`;
  const rng = makeRng(seed);

  const selected = selectWords(
    input.words,
    input.sound,
    input.ageBand,
    input.avoidWords,
    input.maxItems,
    rng,
    input.wordsWithModelAudio,
  );

  const steps: MissionStep[] = [];

  if (input.childId === 'lavi') {
    // School-age arena: briefing → warmup → word rounds → boss → completion.
    steps.push({
      id: uid('step'),
      kind: 'briefing',
      title: input.laviMeta?.title ?? 'משימה',
    });
    steps.push({ id: uid('step'), kind: 'warmup', promptType: 'isolated_sound' });
    for (const w of selected) {
      steps.push({ id: uid('step'), kind: 'word', promptType: 'word', wordId: w.id });
    }
    const bossId = input.bossSentenceIds?.[0];
    if (bossId) {
      steps.push({
        id: uid('step'),
        kind: 'sentence',
        promptType: 'sentence',
        sentenceId: bossId,
      });
    }
    steps.push({ id: uid('step'), kind: 'completion' });
  } else {
    // Preschool garden: greeting → listen&choose → say three → completion.
    steps.push({
      id: uid('step'),
      kind: 'briefing',
      title: input.nivMeta?.title ?? 'גן הצלילים',
    });
    const target = selected[0];
    if (target) {
      // Two distractors of the same age band, different word.
      const distractors = seededShuffle(
        input.words.filter(
          (w) => w.id !== target.id && w.ageBands.includes(input.ageBand),
        ),
        rng,
      ).slice(0, 2);
      steps.push({
        id: uid('step'),
        kind: 'listen_choose',
        promptType: 'word',
        wordId: target.id,
        choiceWordIds: seededShuffle(
          [target.id, ...distractors.map((d) => d.id)],
          rng,
        ),
      });
      steps.push({
        id: uid('step'),
        kind: 'say_three',
        promptType: 'word',
        wordId: target.id,
      });
    }
    steps.push({ id: uid('step'), kind: 'completion' });
  }

  return {
    id: uid('mission'),
    childId: input.childId,
    sound: input.sound,
    title:
      input.childId === 'lavi'
        ? input.laviMeta?.title ?? 'משימה'
        : input.nivMeta?.title ?? 'גן הצלילים',
    estimatedMinutes: input.childId === 'lavi' ? 6 : 3,
    steps,
    rewardId: input.rewardId,
    createdAt: nowIso(),
  };
}
