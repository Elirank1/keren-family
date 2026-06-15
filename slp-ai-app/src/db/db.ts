import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  AudioBlobRecord,
  ChildProfile,
  ClinicianSoundConfig,
  GeneratedMission,
  ModelAudio,
  PracticeSentence,
  PracticeSession,
  PracticeWord,
  RecordingAttempt,
  RewardDef,
  SoundDef,
} from '@/lib/types';

// Versioned Dexie schema. Binary audio lives in `audioBlobs`, referenced by id
// from attempts and model audio so query tables stay light.
export class SlpDb extends Dexie {
  children!: Table<ChildProfile, string>;
  sounds!: Table<SoundDef, string>;
  words!: Table<PracticeWord, string>;
  sentences!: Table<PracticeSentence, string>;
  missions!: Table<GeneratedMission, string>;
  sessions!: Table<PracticeSession, string>;
  attempts!: Table<RecordingAttempt, string>;
  audioBlobs!: Table<AudioBlobRecord, string>;
  modelAudio!: Table<ModelAudio, string>;
  clinicianConfigs!: Table<ClinicianSoundConfig, [string, string]>;
  settings!: Table<AppSettings, string>;
  rewards!: Table<RewardDef, string>;

  constructor() {
    super('slp-ai');
    // v1 — initial schema. Add later versions with .upgrade() for migrations.
    this.version(1).stores({
      children: 'id',
      sounds: 'id',
      words: 'id, sound, enabled',
      sentences: 'id, sound',
      missions: 'id, childId, sound',
      sessions: 'id, childId, sound, completedAt',
      attempts: 'id, childId, sound, wordId, sessionId, baseline, createdAt',
      audioBlobs: 'id, kind',
      modelAudio: 'id, sound, promptType, wordId, sentenceId',
      clinicianConfigs: '[childId+sound], childId, sound',
      settings: 'id',
      rewards: 'id, childId, sound',
    });
  }
}

export const db = new SlpDb();
