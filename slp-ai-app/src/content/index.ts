import childrenJson from './children.json';
import soundsJson from './sounds.json';
import wordsJson from './words.json';
import sentencesJson from './sentences.json';
import rewardsJson from './rewards.json';
import missionsJson from './missions.json';
import type {
  ChildProfile,
  PracticeSentence,
  PracticeWord,
  RewardDef,
  SoundDef,
  TargetSound,
  ChildId,
} from '@/lib/types';

export const seedChildren = childrenJson as ChildProfile[];
export const seedSounds = soundsJson as SoundDef[];
export const seedWords = wordsJson as PracticeWord[];
export const seedSentences = sentencesJson as PracticeSentence[];
export const seedRewards = rewardsJson as RewardDef[];

export interface LaviMissionMeta {
  title: string;
  bossSentenceIds: string[];
  realWorldMission: string;
}
export interface NivMissionMeta {
  title: string;
  animal: string;
  animalName: string;
  encourage: string;
}

export const missionMeta = missionsJson as {
  lavi: Record<TargetSound, LaviMissionMeta>;
  niv: Record<TargetSound, NivMissionMeta>;
};

export function getLaviMeta(sound: TargetSound): LaviMissionMeta {
  return missionMeta.lavi[sound];
}
export function getNivMeta(sound: TargetSound): NivMissionMeta {
  return missionMeta.niv[sound];
}

// Overloaded accessor: returns the correctly-typed meta for the child.
export function getMissionMeta(childId: 'lavi', sound: TargetSound): LaviMissionMeta;
export function getMissionMeta(childId: 'niv', sound: TargetSound): NivMissionMeta;
export function getMissionMeta(
  childId: ChildId,
  sound: TargetSound,
): LaviMissionMeta | NivMissionMeta {
  return missionMeta[childId][sound];
}

// Current seed data version. Bumping it does NOT overwrite parent edits;
// see db/seed.ts for the merge policy.
// v2: activate all four target sounds (s/sh/ts/ch) for existing installs.
export const SEED_VERSION = 2;
