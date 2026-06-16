// Domain types for SLP-AI. Kept framework-free so they can be shared by
// the content engine, the DB layer and the UI.

export type ChildId = 'lavi' | 'niv';

export type TargetSound = 's' | 'sh' | 'ts' | 'ch';

export type WordPosition = 'initial' | 'medial' | 'final';

export type AgeBand = '3-4' | '7-9';

export type ChildMode = 'school_age_arena' | 'preschool_animal_garden';

export type ReadingLevel = 'none' | 'reader';

export type ClinicalStatus =
  | 'awaiting_assessment'
  | 'play_and_monitor'
  | 'clinician_configured';

export type ClinicalStage =
  | 'listening'
  | 'isolated_sound'
  | 'syllable'
  | 'word'
  | 'phrase'
  | 'sentence'
  | 'conversation';

export type PromptType = 'isolated_sound' | 'word' | 'sentence';

// NOTE (product boundary): these are *manual* self/parent ratings of how an
// attempt felt. They are deliberately NOT an automatic correctness judgment.
export type AttemptRating =
  | 'independent'
  | 'after_model'
  | 'not_yet'
  | 'participated'
  | 'imitated'
  | 'skipped';

export interface ChildProfile {
  id: ChildId;
  displayName: string;
  ageYears: number;
  ageBand: AgeBand;
  mode: ChildMode;
  readingLevel: ReadingLevel;
  defaultSessionMinutes: number;
  clinicalStatus: ClinicalStatus;
  targetSounds: TargetSound[];
}

export interface SoundDef {
  id: TargetSound;
  ipa: string;
  hebrewLabels: string[];
  childName: string;
  clinicianApproved: boolean;
}

export interface PracticeWord {
  id: string;
  text: string;
  textWithNikud?: string;
  sound: TargetSound;
  positions: WordPosition[];
  syllables: number;
  ageBands: AgeBand[];
  difficulty: 1 | 2 | 3;
  category: string;
  imageAsset?: string | null;
  modelAudioAsset?: string | null;
  clinicianApproved: boolean;
  // Parent toggle — disabled words are excluded from missions.
  enabled?: boolean;
}

export interface PracticeSentence {
  id: string;
  sound: TargetSound;
  text: string;
  textWithNikud?: string;
  ageBands: AgeBand[];
  difficulty: 1 | 2 | 3;
  clinicianApproved: boolean;
}

export interface ClinicianSoundConfig {
  childId: ChildId;
  sound: TargetSound;
  enabled: boolean;
  currentStage: ClinicalStage;
  targetPositions: WordPosition[];
  verbalCue: string;
  visualCue: string;
  maxRepetitions: number;
  advancementRule: string;
  avoidWords: string[];
  notes: string;
  clinicianApproved: boolean;
  updatedAt: string;
}

// ---- Clinician-selectable intervention layer (P3) ----
// The app NEVER picks a therapy method on its own. Every target defaults to
// 'unset' and runs neutral practice until a clinician explicitly configures it.

export type InterventionMode =
  | 'unset'
  | 'motor_articulation'
  | 'speech_perception'
  | 'minimal_pairs'
  | 'cycles'
  | 'integrated'
  | 'custom';

export type PracticeLevel =
  | 'unset'
  | 'listening'
  | 'isolated_sound'
  | 'syllable'
  | 'word'
  | 'phrase'
  | 'sentence'
  | 'conversation';

export type SuspectedErrorType =
  | 'unset'
  | 'distortion'
  | 'substitution'
  | 'omission'
  | 'phoneme_collapse'
  | 'inconsistent'
  | 'mixed';

export type Stimulability =
  | 'not_checked'
  | 'independent'
  | 'after_model'
  | 'not_currently_stimulable';

export type PerceptionStatus =
  | 'not_checked'
  | 'discriminates'
  | 'inconsistent'
  | 'does_not_discriminate';

// One clinician-defined plan per child × target sound. All clinical judgments
// are entered by the clinician — never inferred by the app.
export interface ClinicalTargetProfile {
  childId: ChildId;
  sound: TargetSound;
  interventionMode: InterventionMode;
  suspectedErrorType: SuspectedErrorType;
  childProduction?: string;
  intendedTarget?: string;
  stimulability: Stimulability;
  perceptionStatus: PerceptionStatus;
  targetWordPositions: WordPosition[];
  currentPracticeLevel: PracticeLevel;
  // Share of practice items concentrated on the focus position (0..1).
  weeklyFocusRatio: number;
  cueText: string;
  notes: string;
  clinicianApproved: boolean;
  updatedAt: string;
}

// How honestly a contrast item represents a phonemic contrast. Near-minimal
// and nonword items must NEVER be presented as true minimal pairs.
export type ContrastKind =
  | 'true_minimal_pair'
  | 'near_minimal_pair'
  | 'listening_contrast'
  | 'nonword_contrast';

export interface ContrastItem {
  id: string;
  targetSound: TargetSound;
  contrastSound: TargetSound;
  targetWord: string;
  contrastWord: string;
  targetWithNikud?: string;
  contrastWithNikud?: string;
  kind: ContrastKind;
  // True only for genuine meaning-changing minimal pairs.
  meaningChanging: boolean;
  language: 'he';
  ageBands: AgeBand[];
  hasImages: boolean;
  // 'not_clinically_reviewed' maps to clinicallyReviewed:false.
  clinicallyReviewed: boolean;
  clinicianApproved: boolean;
  // Gated: stays false until a clinician selects minimal_pairs/integrated.
  enabled: boolean;
}

export interface RewardDef {
  id: string;
  childId: ChildId;
  sound: TargetSound | 'any';
  title: string;
  emoji: string;
  description: string;
}

// ---- Mission engine ----

export type MissionStepKind =
  | 'briefing'
  | 'warmup'
  | 'focused_listening'
  | 'word'
  | 'sentence'
  | 'listen_choose'
  | 'say_three'
  | 'contrast'
  | 'completion';

export interface MissionStep {
  id: string;
  kind: MissionStepKind;
  promptType?: PromptType;
  wordId?: string;
  sentenceId?: string;
  // For Niv's listen_choose: ids of distractor words.
  choiceWordIds?: string[];
  // For 'contrast' (minimal-pairs / integrated only): the clinician-approved
  // contrast item to present. Never set unless a clinician enabled the item.
  contrastItemId?: string;
  // For 'focused_listening' (passive listening): the words the child hears.
  // NOTE: a neutral default. Only a clinician choosing a Cycles intervention
  // reframes this step clinically as "auditory bombardment".
  wordIds?: string[];
  title?: string;
}

export interface GeneratedMission {
  id: string;
  childId: ChildId;
  sound: TargetSound;
  title: string;
  estimatedMinutes: number;
  steps: MissionStep[];
  rewardId: string;
  createdAt: string;
}

export interface MissionRequest {
  childId: ChildId;
  sound: TargetSound;
  ageBand: AgeBand;
  stage: ClinicalStage;
  maxItems: number;
  seed?: string;
}

// ---- Persistence ----

export interface RecordingAttempt {
  id: string;
  childId: ChildId;
  sound: TargetSound;
  wordId?: string;
  sentenceId?: string;
  promptType: PromptType;
  recordingBlobId: string;
  mimeType: string;
  durationMs: number;
  rating?: AttemptRating;
  parentNote?: string;
  createdAt: string;
  // Tags a baseline snapshot attempt so it is distinguishable from practice.
  baseline?: boolean;
  sessionId?: string;
}

export interface AudioBlobRecord {
  id: string;
  // Audio is persisted as an ArrayBuffer, NOT a Blob. iOS Safari/WebKit can
  // store a Blob in IndexedDB whose read-back is empty/unreadable, silently
  // losing recordings. We store bytes and rebuild a Blob on read.
  data: ArrayBuffer;
  mimeType: string;
  createdAt: string;
  // 'model' = parent/clinician example; 'attempt' = child recording.
  kind: 'model' | 'attempt';
  // Legacy records (written before the ArrayBuffer fix) held a Blob directly.
  blob?: Blob;
}

// What getAudioBlob hands back: a ready-to-use Blob, regardless of how the
// record was stored (new ArrayBuffer or legacy Blob).
export interface LoadedAudio {
  id: string;
  blob: Blob;
  mimeType: string;
  kind: 'model' | 'attempt';
  createdAt: string;
}

export interface ModelAudio {
  id: string;
  sound: TargetSound;
  promptType: PromptType;
  wordId?: string;
  sentenceId?: string;
  blobId: string;
  mimeType: string;
  durationMs: number;
  clinicianApproved: boolean;
  createdAt: string;
  label: string;
}

export interface PracticeSession {
  id: string;
  childId: ChildId | 'siblings';
  sound: TargetSound;
  missionId: string;
  startedAt: string;
  completedAt?: string;
  attemptIds: string[];
  rewardId?: string;
  // For sibling sessions, references both children's attempts.
  participantChildIds?: ChildId[];
}

// What the treating clinician set as this week's home-practice focus per child.
export interface WeeklyFocus {
  sound?: TargetSound;
  position?: WordPosition;
  note: string;
  updatedAt: string;
}

export interface AppSettings {
  id: 'singleton';
  parentPin: string;
  seededVersion: number;
  reducedMotionOverride?: boolean;
  // Clinician's weekly focus per child (set in the clinician area).
  weeklyFocus?: Partial<Record<ChildId, WeeklyFocus>>;
}
