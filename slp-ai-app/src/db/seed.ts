import { db } from './db';
import {
  SEED_VERSION,
  seedChildren,
  seedRewards,
  seedSentences,
  seedSounds,
  seedWords,
} from '@/content';
import type { ChildId, ClinicianSoundConfig, TargetSound } from '@/lib/types';
import { nowIso } from '@/lib/ids';

const DEFAULT_PIN = '2468';

const SOUND_CUES: Record<TargetSound, { verbal: string; visual: string }> = {
  s: { verbal: 'נשמור על חיוך ואוויר ארוך כמו נחש: סססס', visual: '🐍 אוויר ארוך' },
  sh: { verbal: 'שפתיים עגולות ושקט: שששש', visual: '🤫 גל שקט' },
  ts: { verbal: 'ניצוץ קצר וחד: צ!', visual: '✨ ניצוץ' },
  ch: { verbal: 'פיצוץ קצר: צ׳!', visual: '💥 פיצוץ' },
};

function defaultClinicianConfig(
  childId: ChildId,
  sound: TargetSound,
): ClinicianSoundConfig {
  return {
    childId,
    sound,
    // All four target sounds are active for real family use. "Active" means
    // playable, not clinically approved — clinical cues stay provisional
    // (clinicianApproved: false) and parent/clinician editable.
    enabled: true,
    currentStage: childId === 'niv' ? 'listening' : 'word',
    targetPositions: ['initial', 'medial', 'final'],
    verbalCue: SOUND_CUES[sound].verbal,
    visualCue: SOUND_CUES[sound].visual,
    maxRepetitions: 3,
    advancementRule: 'התקדמות נקבעת ידנית על ידי הורה או קלינאית בלבד.',
    avoidWords: [],
    notes: 'ערכים זמניים — ממתין לאישור קלינאית.',
    clinicianApproved: false,
    updatedAt: nowIso(),
  };
}

// Seed the local DB. First-ever launch populates everything. Later launches
// only ADD missing seed words (never overwrite parent edits or restore
// parent-deleted rows beyond what a version bump introduces).
export async function ensureSeeded(): Promise<void> {
  const existing = await db.settings.get('singleton');

  await db.transaction(
    'rw',
    [
      db.children,
      db.sounds,
      db.words,
      db.sentences,
      db.rewards,
      db.clinicianConfigs,
      db.settings,
    ],
    async () => {
      if (!existing) {
        await db.children.bulkPut(seedChildren);
        await db.sounds.bulkPut(seedSounds);
        await db.words.bulkPut(seedWords);
        await db.sentences.bulkPut(seedSentences);
        await db.rewards.bulkPut(seedRewards);

        const configs: ClinicianSoundConfig[] = [];
        for (const child of seedChildren) {
          for (const sound of child.targetSounds) {
            configs.push(defaultClinicianConfig(child.id, sound));
          }
        }
        await db.clinicianConfigs.bulkPut(configs);

        await db.settings.put({
          id: 'singleton',
          parentPin: DEFAULT_PIN,
          seededVersion: SEED_VERSION,
        });
        return;
      }

      // Version bump: add-only for words/sentences/sounds/rewards.
      if (existing.seededVersion < SEED_VERSION) {
        const existingWordIds = new Set((await db.words.toArray()).map((w) => w.id));
        const newWords = seedWords.filter((w) => !existingWordIds.has(w.id));
        if (newWords.length) await db.words.bulkPut(newWords);

        const existingSentenceIds = new Set(
          (await db.sentences.toArray()).map((s) => s.id),
        );
        const newSentences = seedSentences.filter(
          (s) => !existingSentenceIds.has(s.id),
        );
        if (newSentences.length) await db.sentences.bulkPut(newSentences);

        // v2: activate all four target sounds on devices seeded under v1 (which
        // enabled only /s/). Add any missing config rows; enable existing ones
        // while preserving every other parent/clinician-edited field.
        const existingConfigs = await db.clinicianConfigs
          .where('childId')
          .anyOf(seedChildren.map((c) => c.id))
          .toArray();
        const haveConfig = new Set(existingConfigs.map((c) => `${c.childId}:${c.sound}`));
        const upserts: ClinicianSoundConfig[] = [];
        for (const child of seedChildren) {
          for (const sound of child.targetSounds) {
            const key = `${child.id}:${sound}`;
            const current = existingConfigs.find(
              (c) => c.childId === child.id && c.sound === sound,
            );
            if (!haveConfig.has(key)) {
              upserts.push(defaultClinicianConfig(child.id, sound));
            } else if (current && !current.enabled) {
              upserts.push({ ...current, enabled: true, updatedAt: nowIso() });
            }
          }
        }
        if (upserts.length) await db.clinicianConfigs.bulkPut(upserts);

        await db.settings.update('singleton', { seededVersion: SEED_VERSION });
      }
    },
  );
}
