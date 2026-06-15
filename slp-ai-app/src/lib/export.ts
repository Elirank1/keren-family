import { db } from '@/db/db';
import { repo } from '@/db/repo';
import { createZip, safeName, type ZipEntry } from './zip';
import { nowIso } from './ids';

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'bin';
}

// The progress JSON — everything except binary audio. This is the JSON-only
// export and is also embedded in the ZIP.
export async function buildProgressJson() {
  const [children, words, sentences, sessions, attempts, modelAudio, settings] =
    await Promise.all([
      repo.getChildren(),
      repo.getWords(),
      db.sentences.toArray(),
      repo.getAllSessions(),
      repo.getAllAttempts(),
      repo.getModelAudioList(),
      repo.getSettings(),
    ]);
  const clinicianConfigs = await db.clinicianConfigs.toArray();

  return {
    app: 'SLP-AI',
    schemaVersion: 1,
    exportedAt: nowIso(),
    children,
    words,
    sentences,
    sessions,
    attempts,
    modelAudio,
    clinicianConfigs,
    settings: settings ? { ...settings, parentPin: undefined } : undefined,
  };
}

export async function buildClinicianConfigJson() {
  const clinicianConfigs = await db.clinicianConfigs.toArray();
  return { app: 'SLP-AI', exportedAt: nowIso(), clinicianConfigs };
}

export interface ExportManifest {
  app: string;
  exportedAt: string;
  counts: {
    children: number;
    sessions: number;
    attempts: number;
    recordings: number;
  };
  recordings: Array<{
    file: string;
    attemptId: string;
    childId: string;
    sound: string;
    promptType: string;
    mimeType: string;
    durationMs: number;
    createdAt: string;
    baseline: boolean;
  }>;
}

// Build the full ZIP export: manifest, progress, clinician config, recordings/.
export async function buildExportZip(): Promise<Blob> {
  const progress = await buildProgressJson();
  const clinician = await buildClinicianConfigJson();
  const attempts = await repo.getAllAttempts();

  const entries: ZipEntry[] = [];
  const recordings: ExportManifest['recordings'] = [];
  const usedNames = new Set<string>();

  for (const attempt of attempts) {
    const blobRec = await repo.getAudioBlob(attempt.recordingBlobId);
    if (!blobRec) continue;
    const ext = extForMime(attempt.mimeType || blobRec.mimeType);
    let base = `${safeName(attempt.childId)}_${safeName(attempt.sound)}_${safeName(
      attempt.promptType,
    )}_${safeName(attempt.id, 'attempt')}`;
    if (attempt.baseline) base = `baseline_${base}`;
    let file = `recordings/${base}.${ext}`;
    let i = 1;
    while (usedNames.has(file)) {
      file = `recordings/${base}_${i++}.${ext}`;
    }
    usedNames.add(file);

    const buf = new Uint8Array(await blobRec.blob.arrayBuffer());
    entries.push({ name: file, data: buf });
    recordings.push({
      file,
      attemptId: attempt.id,
      childId: attempt.childId,
      sound: attempt.sound,
      promptType: attempt.promptType,
      mimeType: attempt.mimeType || blobRec.mimeType,
      durationMs: attempt.durationMs,
      createdAt: attempt.createdAt,
      baseline: !!attempt.baseline,
    });
  }

  const manifest: ExportManifest = {
    app: 'SLP-AI',
    exportedAt: nowIso(),
    counts: {
      children: progress.children.length,
      sessions: progress.sessions.length,
      attempts: attempts.length,
      recordings: recordings.length,
    },
    recordings,
  };

  const enc = (obj: unknown) => new TextEncoder().encode(JSON.stringify(obj, null, 2));
  entries.unshift(
    { name: 'slp-ai-export/manifest.json', data: enc(manifest) },
    { name: 'slp-ai-export/progress.json', data: enc(progress) },
    { name: 'slp-ai-export/clinician-config.json', data: enc(clinician) },
  );
  // Re-root recording paths under slp-ai-export/.
  for (const e of entries) {
    if (e.name.startsWith('recordings/')) e.name = `slp-ai-export/${e.name}`;
  }

  return createZip(entries);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
