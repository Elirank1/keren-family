// "הכנה לתרגול הערב" — pure helpers for the tonight-prep batch flow.
// Builds ordered recording queues and computes readiness from the local DB.
// No UI, no side effects beyond the explicit storage probe.
import { repo } from '@/db/repo';
import { db } from '@/db/db';
import { blobToArrayBuffer } from '@/lib/blob';
import { detectRecorderSupport } from '@/lib/recorder';
import type { ChildId, PromptType, TargetSound } from '@/lib/types';

export interface QueueItem {
  key: string;
  sound: TargetSound;
  promptType: PromptType;
  /** Short Hebrew label shown to the parent for this item. */
  title: string;
  wordId?: string;
  sentenceId?: string;
}

const ORDER: TargetSound[] = ['s', 'sh', 'ts', 'ch'];

// Model-audio queue for one sound: isolated sound → selected words → one
// sentence. Defaults to a small, fast pack (cap words) so a usable set is
// recordable in a few minutes; the caller may trim further.
export async function buildModelAudioQueue(
  sound: TargetSound,
  maxWords = 5,
): Promise<QueueItem[]> {
  const words = (await repo.getWordsBySound(sound)).filter((w) => w.enabled ?? true);
  const sentences = await repo.getSentencesBySound(sound);
  const items: QueueItem[] = [
    { key: `${sound}-iso`, sound, promptType: 'isolated_sound', title: 'הצליל לבד' },
  ];
  for (const w of words.slice(0, maxWords)) {
    items.push({ key: `${sound}-w-${w.id}`, sound, promptType: 'word', title: w.text, wordId: w.id });
  }
  if (sentences[0]) {
    items.push({
      key: `${sound}-s-${sentences[0].id}`,
      sound,
      promptType: 'sentence',
      title: sentences[0].text,
      sentenceId: sentences[0].id,
    });
  }
  return items;
}

// Baseline queue per child × sound. Lavi: isolated + up to 4-5 words + one
// sentence. Niv: optional isolated + 2-3 words (no sentence, no reading).
export async function buildBaselineQueue(
  childId: ChildId,
  sound: TargetSound,
): Promise<QueueItem[]> {
  const child = await repo.getChild(childId);
  const ageBand = child?.ageBand ?? (childId === 'niv' ? '3-4' : '7-9');
  const words = (await repo.getWordsBySound(sound)).filter(
    (w) => (w.enabled ?? true) && w.ageBands.includes(ageBand),
  );
  const items: QueueItem[] = [
    { key: `${sound}-iso`, sound, promptType: 'isolated_sound', title: 'הצליל לבד' },
  ];
  const wordCount = childId === 'niv' ? 3 : 5;
  for (const w of words.slice(0, wordCount)) {
    items.push({ key: `${sound}-w-${w.id}`, sound, promptType: 'word', title: w.text, wordId: w.id });
  }
  if (childId === 'lavi') {
    const sentences = await repo.getSentencesBySound(sound);
    if (sentences[0]) {
      items.push({
        key: `${sound}-s-${sentences[0].id}`,
        sound,
        promptType: 'sentence',
        title: sentences[0].text,
        sentenceId: sentences[0].id,
      });
    }
  }
  return items;
}

export async function enabledSoundsInOrder(childId: ChildId): Promise<TargetSound[]> {
  const enabled = await repo.getEnabledSounds(childId);
  return ORDER.filter((s) => enabled.includes(s));
}

export interface TonightReadiness {
  modelAudioCount: number;
  modelAudioReady: boolean;
  baselineByChild: Record<ChildId, number>;
  baselineReady: boolean;
  firstMissionReady: boolean;
  micSupported: boolean;
  storageOk: boolean;
}

// Probe IndexedDB with a real write+read+delete so the checklist reflects
// actual device behavior (iOS private mode / storage pressure can break this).
export async function probeStorage(): Promise<boolean> {
  try {
    const id = 'singleton';
    const current = await db.settings.get(id);
    if (!current) return false;
    // Touch-update with the same value: proves the store is writable.
    await db.settings.update(id, { seededVersion: current.seededVersion });
    const after = await db.settings.get(id);
    return !!after;
  } catch {
    return false;
  }
}

// Real audio write→read→verify roundtrip. This is the check that actually
// catches the iOS Safari "Blob saved but reads back empty" failure mode, since
// it stores bytes via the same path child recordings use and reads them back.
export async function probeAudioRoundtrip(): Promise<boolean> {
  let id: string | null = null;
  try {
    const bytes = new Uint8Array([7, 13, 42, 255, 0, 99]);
    id = await repo.saveAudioBlob(new Blob([bytes], { type: 'audio/mp4' }), 'audio/mp4', 'attempt');
    const loaded = await repo.getAudioBlob(id);
    if (!loaded) return false;
    const out = new Uint8Array(await blobToArrayBuffer(loaded.blob));
    return out.length === bytes.length && out.every((b, i) => b === bytes[i]);
  } catch {
    return false;
  } finally {
    if (id) await repo.deleteAudioBlob(id).catch(() => {});
  }
}

export async function computeReadiness(): Promise<TonightReadiness> {
  const [models, laviBase, nivBase, laviEnabled, storageOk] = await Promise.all([
    repo.getModelAudioList(),
    repo.getAttemptsByChild('lavi'),
    repo.getAttemptsByChild('niv'),
    repo.getEnabledSounds('lavi'),
    probeStorage(),
  ]);
  const baselineByChild: Record<ChildId, number> = {
    lavi: laviBase.filter((a) => a.baseline).length,
    niv: nivBase.filter((a) => a.baseline).length,
  };
  return {
    modelAudioCount: models.length,
    modelAudioReady: models.length > 0,
    baselineByChild,
    baselineReady: baselineByChild.lavi > 0 || baselineByChild.niv > 0,
    firstMissionReady: laviEnabled.length > 0,
    micSupported: detectRecorderSupport().supported,
    storageOk,
  };
}
