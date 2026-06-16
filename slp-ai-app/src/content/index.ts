import childrenJson from './children.json';
import soundsJson from './sounds.json';
import wordsJson from './words.json';
import sentencesJson from './sentences.json';
import rewardsJson from './rewards.json';
import missionsJson from './missions.json';
import type {
  ChildProfile,
  ContrastItem,
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

// Provisional contrast library. Deliberately SMALL and conservatively labeled:
// Hebrew has genuine /s/–/ʃ/ minimal pairs but essentially no /ts/–/tʃ/ ones
// (צ׳ lives almost entirely in loanwords), so we do NOT manufacture false pairs.
// Every item ships disabled + unreviewed; nothing activates until a clinician
// selects a minimal_pairs / integrated mode AND approves the item.
export const seedContrastItems: ContrastItem[] = [
  {
    id: 'cp_s_sh_sir_shir',
    targetSound: 's',
    contrastSound: 'sh',
    targetWord: 'סיר',
    contrastWord: 'שיר',
    targetWithNikud: 'סִיר',
    contrastWithNikud: 'שִׁיר',
    kind: 'true_minimal_pair', // pot ↔ song — single-phoneme, meaning-changing
    meaningChanging: true,
    language: 'he',
    ageBands: ['7-9'],
    hasImages: false,
    clinicallyReviewed: false,
    clinicianApproved: false,
    enabled: false,
  },
  {
    id: 'cp_s_sh_sofer_shofar',
    targetSound: 's',
    contrastSound: 'sh',
    targetWord: 'סופר',
    contrastWord: 'שופר',
    targetWithNikud: 'סוֹפֵר',
    contrastWithNikud: 'שׁוֹפָר',
    kind: 'near_minimal_pair', // also differs in a vowel — NOT a true minimal pair
    meaningChanging: true,
    language: 'he',
    ageBands: ['7-9'],
    hasImages: false,
    clinicallyReviewed: false,
    clinicianApproved: false,
    enabled: false,
  },
  {
    id: 'cl_ts_ch_tsipor_cheetah',
    targetSound: 'ts',
    contrastSound: 'ch',
    targetWord: 'ציפור',
    contrastWord: 'צ׳יטה',
    targetWithNikud: 'צִיפּוֹר',
    contrastWithNikud: 'צִ׳יטָה',
    kind: 'listening_contrast', // for hearing ts vs tʃ only — NOT a minimal pair
    meaningChanging: false,
    language: 'he',
    ageBands: ['3-4', '7-9'],
    hasImages: false,
    clinicallyReviewed: false,
    clinicianApproved: false,
    enabled: false,
  },
  {
    id: 'cn_ts_ch_atsa',
    targetSound: 'ts',
    contrastSound: 'ch',
    targetWord: 'אצה',
    contrastWord: 'אצ׳ה',
    targetWithNikud: 'אַצָּה',
    contrastWithNikud: 'אַצָּ׳ה',
    kind: 'nonword_contrast', // contrast word is a nonword — flagged as such
    meaningChanging: false,
    language: 'he',
    ageBands: ['7-9'],
    hasImages: false,
    clinicallyReviewed: false,
    clinicianApproved: false,
    enabled: false,
  },
];

// Current seed data version. Bumping it does NOT overwrite parent edits;
// see db/seed.ts for the merge policy.
// v2: activate all four target sounds (s/sh/ts/ch) for existing installs.
// v3: seed the provisional contrast library (disabled) for the intervention layer.
export const SEED_VERSION = 3;
