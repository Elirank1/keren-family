import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { Button, Spinner } from '@/components/ui';
import { AudioRecorder } from '@/components/AudioRecorder';
import { SoundBadge } from '@/components/SoundBadge';
import type {
  ModelAudio,
  PracticeSentence,
  PracticeWord,
  PromptType,
  TargetSound,
} from '@/lib/types';
import type { RecordingResult } from '@/lib/recorder';

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];

interface Target {
  key: string;
  label: string;
  promptType: PromptType;
  wordId?: string;
  sentenceId?: string;
}

export default function ModelAudioManager() {
  const navigate = useNavigate();
  const [sound, setSound] = useState<TargetSound>('s');

  const { data, loading, reload } = useAsync(async () => {
    const words = await repo.getWordsBySound(sound);
    const sentences = await repo.getSentencesBySound(sound);
    const models = await repo.getModelAudioList();
    return { words, sentences, models: models.filter((m) => m.sound === sound) };
  }, [sound]);

  if (loading || !data) return <Spinner />;

  const targets: Target[] = [
    { key: 'iso', label: 'הצליל לבד', promptType: 'isolated_sound' },
    ...data.words.map((w: PracticeWord) => ({
      key: `w-${w.id}`,
      label: w.text,
      promptType: 'word' as PromptType,
      wordId: w.id,
    })),
    ...data.sentences.map((s: PracticeSentence) => ({
      key: `s-${s.id}`,
      label: s.text,
      promptType: 'sentence' as PromptType,
      sentenceId: s.id,
    })),
  ];

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">הקלטות דוגמה</h1>
        <p className="text-sm text-slate-600">
          הקלטה של הורה או קלינאית. נשמע לילד רק כשקיימת הקלטה.
        </p>
      </header>

      <div className="flex gap-2" role="tablist" aria-label="בחירת צליל">
        {SOUNDS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={s === sound}
            onClick={() => setSound(s)}
            data-testid={`model-sound-${s}`}
            className={`rounded-2xl px-4 py-2 font-bold ${
              s === sound ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
            }`}
          >
            <SoundBadge sound={s} size="sm" />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {targets.map((t) => {
          const existing = data.models.find(
            (m: ModelAudio) =>
              m.promptType === t.promptType &&
              (t.wordId ? m.wordId === t.wordId : !m.wordId) &&
              (t.sentenceId ? m.sentenceId === t.sentenceId : !m.sentenceId),
          );
          return (
            <ModelRow
              key={t.key}
              sound={sound}
              target={t}
              existing={existing}
              onChanged={reload}
            />
          );
        })}
      </div>
    </main>
  );
}

function ModelRow({
  sound,
  target,
  existing,
  onChanged,
}: {
  sound: TargetSound;
  target: Target;
  existing?: ModelAudio;
  onChanged: () => void;
}) {
  const [recording, setRecording] = useState(false);

  const play = async () => {
    if (!existing) return;
    const blobRec = await repo.getAudioBlob(existing.blobId);
    if (blobRec) {
      const url = URL.createObjectURL(blobRec.blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    }
  };

  const save = async (result: RecordingResult) => {
    // Replace existing: delete old blob/record first.
    if (existing) await repo.deleteModelAudio(existing.id);
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'model');
    await repo.saveModelAudio({
      sound,
      promptType: target.promptType,
      wordId: target.wordId,
      sentenceId: target.sentenceId,
      blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      clinicianApproved: false,
      label: target.label,
    });
    setRecording(false);
    onChanged();
  };

  return (
    <section
      data-testid={`model-row-${target.key}`}
      className="rounded-3xl bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">
          {target.promptType === 'isolated_sound' ? 'צליל' : target.promptType === 'word' ? 'מילה' : 'משפט'}
        </span>
        <h2 className="text-lg font-black">{target.label}</h2>
        {existing ? (
          <span
            data-testid={`model-status-${target.key}`}
            className={`ml-auto rounded-full px-2 py-1 text-xs font-bold ${
              existing.clinicianApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {existing.clinicianApproved ? 'מאושר קלינאית' : 'ממתין לאישור קלינאית'}
          </span>
        ) : (
          <span className="ml-auto text-xs text-slate-400">עוד לא הוקלטה דוגמה</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {existing && !recording && (
          <>
            <Button variant="secondary" onClick={play} data-testid={`model-play-${target.key}`}>
              🔊 השמעה
            </Button>
            <Button variant="secondary" onClick={() => setRecording(true)} data-testid={`model-replace-${target.key}`}>
              🔁 הקלטה מחדש
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await repo.deleteModelAudio(existing.id);
                onChanged();
              }}
              data-testid={`model-delete-${target.key}`}
            >
              🗑️ מחיקה
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await repo.setModelAudioApproved(existing.id, !existing.clinicianApproved);
                onChanged();
              }}
              data-testid={`model-approve-${target.key}`}
            >
              {existing.clinicianApproved ? 'בטל אישור' : 'סמן כמאושר'}
            </Button>
          </>
        )}
        {(!existing || recording) && (
          <AudioRecorder
            promptType={target.promptType}
            onSave={save}
            theme="arena"
            saveLabel="שמירת דוגמה"
          />
        )}
      </div>
    </section>
  );
}
