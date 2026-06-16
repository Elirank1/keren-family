import type {
  AgeBand,
  ContrastItem,
  GeneratedMission,
  InterventionMode,
  MissionRequest,
  MissionStep,
  PracticeSentence,
  PracticeWord,
  WordPosition,
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
  /** Clinician's weekly focus position — biases word selection when set. */
  focusPosition?: WordPosition;
  /** Clinician-selected intervention mode. Defaults to 'unset' (neutral path). */
  mode?: InterventionMode;
  /** Share of items concentrated on the focus position (0..1). Default 0.66. */
  focusRatio?: number;
  /**
   * Contrast items the clinician has BOTH enabled AND approved. The engine adds
   * a contrast step only for minimal_pairs / integrated modes and only when this
   * list is non-empty — so contrast work never activates on its own.
   */
  enabledContrastItems?: ContrastItem[];
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
  focusPosition?: WordPosition,
  focusRatio = 0.66,
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
  let ordered = [...withAudio, ...without];

  const selected: PracticeWord[] = [];
  const usedCount = new Map<string, number>();

  // When the clinician set a weekly focus position, deliberately CONCENTRATE on
  // it: front-load words that cover that position so it is over-represented,
  // while still leaving room for the others (we never fully exclude them).
  if (focusPosition) {
    const hasFocus = ordered.filter((w) => w.positions.includes(focusPosition));
    const rest = ordered.filter((w) => !w.positions.includes(focusPosition));
    // Concentrate the clinician-set share of the mission on the focus position.
    const ratio = Math.min(1, Math.max(0, focusRatio));
    const focusTarget = Math.ceil(maxItems * ratio);
    for (const w of hasFocus) {
      if (selected.length >= focusTarget) break;
      selected.push(w);
      usedCount.set(w.id, 1);
    }
    // Remaining slots mix in the other positions for generalization.
    ordered = [...rest, ...hasFocus];
  }

  // Position-mixing greedy pass: walk position buckets round-robin.
  const byPosition = new Map<string, PracticeWord[]>();
  for (const pos of POSITION_ORDER) byPosition.set(pos, []);
  for (const w of ordered) {
    if ((usedCount.get(w.id) ?? 0) > 0) continue; // already taken in focus pass
    const primary = POSITION_ORDER.find((p) => w.positions.includes(p)) ?? 'initial';
    byPosition.get(primary)!.push(w);
  }

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
    input.focusPosition,
    input.focusRatio,
  );

  // Mode drives composition. 'unset' (default) keeps the neutral practice path.
  const mode = input.mode ?? 'unset';
  const contrastPool = input.enabledContrastItems ?? [];
  // Contrast work activates ONLY for an explicit minimal_pairs / integrated mode
  // AND only when the clinician has enabled+approved contrast items. It is never
  // added on its own, and never inferred from age.
  const wantsContrast =
    (mode === 'minimal_pairs' || mode === 'integrated') && contrastPool.length > 0;
  // Perception-leaning modes open with passive listening before production.
  const perceptionFirst = mode === 'speech_perception' || mode === 'cycles';

  // Build the focused-listening word list for the target sound.
  const buildListeningIds = (seedId?: string): string[] => {
    const pool = seededShuffle(
      input.words.filter(
        (w) =>
          w.sound === input.sound &&
          (w.enabled ?? true) &&
          w.ageBands.includes(input.ageBand),
      ),
      rng,
    ).slice(0, 4);
    return Array.from(new Set([seedId, ...pool.map((w) => w.id)].filter(Boolean) as string[])).slice(0, 4);
  };

  const steps: MissionStep[] = [];

  if (input.childId === 'lavi') {
    // School-age arena: briefing → [focused listening] → warmup → words →
    // [contrast] → boss → completion.
    steps.push({
      id: uid('step'),
      kind: 'briefing',
      title: input.laviMeta?.title ?? 'משימה',
    });
    if (perceptionFirst) {
      const ids = buildListeningIds();
      if (ids.length) steps.push({ id: uid('step'), kind: 'focused_listening', promptType: 'word', wordIds: ids });
    }
    // motor_articulation and the neutral default keep the production warm-up;
    // a pure perception session leads with listening instead.
    if (mode !== 'speech_perception') {
      steps.push({ id: uid('step'), kind: 'warmup', promptType: 'isolated_sound' });
    }
    for (const w of selected) {
      steps.push({ id: uid('step'), kind: 'word', promptType: 'word', wordId: w.id });
    }
    if (wantsContrast) {
      steps.push({ id: uid('step'), kind: 'contrast', contrastItemId: contrastPool[0].id });
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
    // Preschool garden: greeting → [focused listening] → listen&choose →
    // [contrast] → say three → completion.
    steps.push({
      id: uid('step'),
      kind: 'briefing',
      title: input.nivMeta?.title ?? 'גן הצלילים',
    });
    const target = selected[0];
    if (target) {
      // Focused listening (passive): hear the target sound in real words first.
      // Neutral default; a Cycles clinician may reframe it as auditory
      // bombardment. Skipped only for a production-first motor mode.
      if (mode !== 'motor_articulation') {
        const ids = buildListeningIds(target.id);
        if (ids.length) {
          steps.push({ id: uid('step'), kind: 'focused_listening', promptType: 'word', wordIds: ids });
        }
      }
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
      if (wantsContrast) {
        steps.push({ id: uid('step'), kind: 'contrast', contrastItemId: contrastPool[0].id });
      }
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
