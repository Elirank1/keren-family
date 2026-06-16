import { repo } from '@/db/repo';
import { generateMission } from './mission-engine';
import { getMissionMeta } from '@/content';
import type { ChildId, GeneratedMission, TargetSound } from './types';

// Build + persist a mission for a child and sound, honoring the clinician
// config (enabled state, avoided words, stage). Returns the saved mission.
export async function buildAndSaveMission(
  childId: ChildId,
  sound: TargetSound,
  seed?: string,
): Promise<GeneratedMission> {
  const [child, words, sentences, config, weeklyFocus, target, enabledContrastItems] =
    await Promise.all([
      repo.getChild(childId),
      repo.getWords(),
      repo.getSentencesBySound(sound),
      repo.getClinicianConfig(childId, sound),
      repo.getWeeklyFocus(childId),
      repo.getClinicalTarget(childId, sound),
      repo.getEnabledContrastItems(sound),
    ]);
  if (!child) throw new Error(`Unknown child ${childId}`);

  // Intervention mode is the clinician's choice; absent a profile it is 'unset'
  // and the app runs only its neutral practice path.
  const mode = target?.interventionMode ?? 'unset';
  const focusRatio = target?.weeklyFocusRatio ?? 0.66;

  // Positional concentration is only meaningful for production-oriented work, so
  // restrict it to the neutral, motor, and integrated paths. A clinician who
  // listed exactly one target position concentrates on it; "mixed" (several) or
  // none falls back to the lighter weekly-focus reminder.
  const positionFocusModes = mode === 'unset' || mode === 'motor_articulation' || mode === 'integrated';
  const targetPositions = target?.targetWordPositions ?? [];
  const focusPosition = !positionFocusModes
    ? undefined
    : targetPositions.length === 1
      ? targetPositions[0]
      : targetPositions.length === 0 && weeklyFocus?.sound === sound
        ? weeklyFocus.position
        : undefined;

  const laviMeta = childId === 'lavi' ? getMissionMeta('lavi', sound) : undefined;
  const nivMeta = childId === 'niv' ? getMissionMeta('niv', sound) : undefined;
  const wordsWithModelAudio = await repo.wordsWithModelAudio(sound);

  const rewardId = `${childId}_${sound}_${childId === 'lavi' ? 'badge' : 'star'}`;
  const bossSentenceIds =
    childId === 'lavi'
      ? laviMeta?.bossSentenceIds.filter((id) => sentences.some((s) => s.id === id))
      : undefined;

  const mission = generateMission({
    childId,
    sound,
    ageBand: child.ageBand,
    stage: config?.currentStage ?? (childId === 'niv' ? 'listening' : 'word'),
    maxItems: childId === 'lavi' ? 6 : 1,
    seed,
    words,
    sentences,
    laviMeta,
    nivMeta,
    avoidWords: config?.avoidWords ?? [],
    wordsWithModelAudio,
    bossSentenceIds,
    rewardId,
    focusPosition,
    focusRatio,
    mode,
    enabledContrastItems,
  });

  await repo.saveMission(mission);
  return mission;
}

// The primary sound for the first vertical slice.
export const PRIMARY_SOUND: TargetSound = 's';
