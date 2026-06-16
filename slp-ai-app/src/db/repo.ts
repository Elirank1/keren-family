import { db } from './db';
import { uid, nowIso } from '@/lib/ids';
import { blobToArrayBuffer } from '@/lib/blob';
import type {
  AppSettings,
  AttemptRating,
  ChildId,
  ChildProfile,
  ClinicalTargetProfile,
  ClinicianSoundConfig,
  ContrastItem,
  GeneratedMission,
  LoadedAudio,
  ModelAudio,
  PracticeSentence,
  PracticeSession,
  PracticeWord,
  PromptType,
  RecordingAttempt,
  TargetSound,
  WeeklyFocus,
} from '@/lib/types';

// A neutral, un-inferred default plan: mode 'unset' so the app runs only its
// neutral practice path until a clinician configures the target.
export function makeDefaultClinicalTarget(
  childId: ChildId,
  sound: TargetSound,
): ClinicalTargetProfile {
  return {
    childId,
    sound,
    interventionMode: 'unset',
    suspectedErrorType: 'unset',
    stimulability: 'not_checked',
    perceptionStatus: 'not_checked',
    targetWordPositions: [],
    currentPracticeLevel: 'unset',
    weeklyFocusRatio: 0.66,
    cueText: '',
    notes: '',
    clinicianApproved: false,
    updatedAt: nowIso(),
  };
}

// ---------- Reads ----------

export const repo = {
  async getChildren(): Promise<ChildProfile[]> {
    return db.children.toArray();
  },
  async getChild(id: ChildId): Promise<ChildProfile | undefined> {
    return db.children.get(id);
  },
  async getWords(): Promise<PracticeWord[]> {
    return db.words.toArray();
  },
  async getWordsBySound(sound: TargetSound): Promise<PracticeWord[]> {
    return db.words.where('sound').equals(sound).toArray();
  },
  async getWord(id: string): Promise<PracticeWord | undefined> {
    return db.words.get(id);
  },
  async getSentence(id: string): Promise<PracticeSentence | undefined> {
    return db.sentences.get(id);
  },
  async getSentencesBySound(sound: TargetSound): Promise<PracticeSentence[]> {
    return db.sentences.where('sound').equals(sound).toArray();
  },

  async getClinicianConfigs(childId: ChildId): Promise<ClinicianSoundConfig[]> {
    return db.clinicianConfigs.where('childId').equals(childId).toArray();
  },
  async getClinicianConfig(
    childId: ChildId,
    sound: TargetSound,
  ): Promise<ClinicianSoundConfig | undefined> {
    return db.clinicianConfigs.get([childId, sound]);
  },
  async getEnabledSounds(childId: ChildId): Promise<TargetSound[]> {
    const configs = await db.clinicianConfigs.where('childId').equals(childId).toArray();
    return configs.filter((c) => c.enabled).map((c) => c.sound);
  },
  async updateClinicianConfig(config: ClinicianSoundConfig): Promise<void> {
    await db.clinicianConfigs.put({ ...config, updatedAt: nowIso() });
  },

  async getSettings(): Promise<AppSettings | undefined> {
    return db.settings.get('singleton');
  },
  async updateSettings(patch: Partial<AppSettings>): Promise<void> {
    await db.settings.update('singleton', patch);
  },
  async getWeeklyFocus(childId: ChildId): Promise<WeeklyFocus | undefined> {
    const settings = await db.settings.get('singleton');
    return settings?.weeklyFocus?.[childId];
  },
  async setWeeklyFocus(childId: ChildId, focus: WeeklyFocus): Promise<void> {
    const settings = await db.settings.get('singleton');
    const weeklyFocus = { ...(settings?.weeklyFocus ?? {}), [childId]: focus };
    await db.settings.update('singleton', { weeklyFocus });
  },

  // ---------- Clinical target profiles (intervention layer) ----------
  // Absence of a row means 'unset' — the app never invents clinical judgments.
  async getClinicalTarget(
    childId: ChildId,
    sound: TargetSound,
  ): Promise<ClinicalTargetProfile | undefined> {
    return db.clinicalTargets.get([childId, sound]);
  },
  async getClinicalTargets(childId: ChildId): Promise<ClinicalTargetProfile[]> {
    return db.clinicalTargets.where('childId').equals(childId).toArray();
  },
  async setClinicalTarget(profile: ClinicalTargetProfile): Promise<void> {
    await db.clinicalTargets.put({ ...profile, updatedAt: nowIso() });
  },

  // ---------- Contrast library (gated; disabled until a clinician opts in) ----
  async getContrastItems(targetSound?: TargetSound): Promise<ContrastItem[]> {
    if (targetSound) {
      return db.contrastItems.where('targetSound').equals(targetSound).toArray();
    }
    return db.contrastItems.toArray();
  },
  async getEnabledContrastItems(targetSound: TargetSound): Promise<ContrastItem[]> {
    const items = await db.contrastItems.where('targetSound').equals(targetSound).toArray();
    // Double gate: only items a clinician has both enabled AND approved.
    return items.filter((i) => i.enabled && i.clinicianApproved);
  },
  async setContrastItem(item: ContrastItem): Promise<void> {
    await db.contrastItems.put(item);
  },

  // ---------- Words editing ----------
  async putWord(word: PracticeWord): Promise<void> {
    await db.words.put(word);
  },
  async setWordEnabled(id: string, enabled: boolean): Promise<void> {
    await db.words.update(id, { enabled });
  },

  // ---------- Audio blobs ----------
  // Stored as ArrayBuffer to survive iOS Safari's IndexedDB Blob bug.
  async saveAudioBlob(
    blob: Blob,
    mimeType: string,
    kind: 'model' | 'attempt',
  ): Promise<string> {
    const id = uid('blob');
    const data = await blobToArrayBuffer(blob);
    await db.audioBlobs.put({ id, data, mimeType, kind, createdAt: nowIso() });
    return id;
  },
  async getAudioBlob(id: string): Promise<LoadedAudio | undefined> {
    const rec = await db.audioBlobs.get(id);
    if (!rec) return undefined;
    // New records carry `data`; legacy records carry a `blob` directly.
    const blob = rec.data
      ? new Blob([rec.data], { type: rec.mimeType })
      : rec.blob;
    if (!blob) return undefined;
    return { id: rec.id, blob, mimeType: rec.mimeType, kind: rec.kind, createdAt: rec.createdAt };
  },
  async deleteAudioBlob(id: string): Promise<void> {
    await db.audioBlobs.delete(id);
  },

  // ---------- Child attempts ----------
  async saveAttempt(
    attempt: Omit<RecordingAttempt, 'id' | 'createdAt'> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<RecordingAttempt> {
    const full: RecordingAttempt = {
      ...attempt,
      id: attempt.id ?? uid('attempt'),
      createdAt: attempt.createdAt ?? nowIso(),
    };
    await db.attempts.put(full);
    return full;
  },
  async setAttemptRating(id: string, rating: AttemptRating): Promise<void> {
    await db.attempts.update(id, { rating });
  },
  async setAttemptNote(id: string, parentNote: string): Promise<void> {
    await db.attempts.update(id, { parentNote });
  },
  async deleteAttempt(id: string): Promise<void> {
    const attempt = await db.attempts.get(id);
    if (attempt) {
      await db.audioBlobs.delete(attempt.recordingBlobId);
      await db.attempts.delete(id);
    }
  },
  async getAttempt(id: string): Promise<RecordingAttempt | undefined> {
    return db.attempts.get(id);
  },
  async getAttemptsByChild(childId: ChildId): Promise<RecordingAttempt[]> {
    return db.attempts.where('childId').equals(childId).toArray();
  },
  async getAllAttempts(): Promise<RecordingAttempt[]> {
    return db.attempts.toArray();
  },

  // ---------- Missions ----------
  async saveMission(mission: GeneratedMission): Promise<void> {
    await db.missions.put(mission);
  },
  async getMission(id: string): Promise<GeneratedMission | undefined> {
    return db.missions.get(id);
  },

  // ---------- Sessions ----------
  async saveSession(session: PracticeSession): Promise<void> {
    await db.sessions.put(session);
  },
  async getSession(id: string): Promise<PracticeSession | undefined> {
    return db.sessions.get(id);
  },
  async getSessionsByChild(childId: ChildId): Promise<PracticeSession[]> {
    return db.sessions.where('childId').equals(childId).toArray();
  },
  async getAllSessions(): Promise<PracticeSession[]> {
    return db.sessions.toArray();
  },

  // ---------- Model audio ----------
  async saveModelAudio(
    params: Omit<ModelAudio, 'id' | 'createdAt'> & { id?: string },
  ): Promise<ModelAudio> {
    const full: ModelAudio = {
      ...params,
      id: params.id ?? uid('model'),
      createdAt: nowIso(),
    };
    await db.modelAudio.put(full);
    return full;
  },
  async getModelAudioList(): Promise<ModelAudio[]> {
    return db.modelAudio.toArray();
  },
  async findModelAudio(
    sound: TargetSound,
    promptType: PromptType,
    wordId?: string,
    sentenceId?: string,
  ): Promise<ModelAudio | undefined> {
    const list = await db.modelAudio.where('sound').equals(sound).toArray();
    return list.find(
      (m) =>
        m.promptType === promptType &&
        (wordId ? m.wordId === wordId : true) &&
        (sentenceId ? m.sentenceId === sentenceId : true),
    );
  },
  async wordsWithModelAudio(sound: TargetSound): Promise<Set<string>> {
    const list = await db.modelAudio.where('sound').equals(sound).toArray();
    return new Set(list.filter((m) => m.wordId).map((m) => m.wordId as string));
  },
  async deleteModelAudio(id: string): Promise<void> {
    const m = await db.modelAudio.get(id);
    if (m) {
      await db.audioBlobs.delete(m.blobId);
      await db.modelAudio.delete(id);
    }
  },
  async setModelAudioApproved(id: string, approved: boolean): Promise<void> {
    await db.modelAudio.update(id, { clinicianApproved: approved });
  },
};
