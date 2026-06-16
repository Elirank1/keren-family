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
  const [child, words, sentences, config, weeklyFocus] = await Promise.all([
    repo.getChild(childId),
    repo.getWords(),
    repo.getSentencesBySound(sound),
    repo.getClinicianConfig(childId, sound),
    repo.getWeeklyFocus(childId),
  ]);
  if (!child) throw new Error(`Unknown child ${childId}`);

  // The clinician's weekly focus position biases word selection — but only when
  // it applies to the sound being practiced now.
  const focusPosition =
    weeklyFocus?.sound === sound ? weeklyFocus.position : undefined;

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
  });

  await repo.saveMission(mission);
  return mission;
}

// The primary sound for the first vertical slice.
export const PRIMARY_SOUND: TargetSound = 's';
