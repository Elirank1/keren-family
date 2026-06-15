import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import { RecordingQueue } from './RecordingQueue';
import { buildModelAudioQueue, enabledSoundsInOrder, type QueueItem } from './tonight';
import type { RecordingResult } from '@/lib/recorder';
import type { TargetSound } from '@/lib/types';

type Phase = 'setup' | 'recording' | 'done';

export default function TonightModelAudio() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('setup');
  const [sound, setSound] = useState<TargetSound>('s');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const { data, loading } = useAsync(async () => {
    const sounds = await enabledSoundsInOrder('lavi');
    return { sounds };
  }, []);

  if (loading || !data) return <Spinner />;
  const sounds = data.sounds.length ? data.sounds : (['s'] as TargetSound[]);

  const begin = async (s: TargetSound) => {
    setSound(s);
    setQueue(await buildModelAudioQueue(s));
    setSavedCount(0);
    setPhase('recording');
  };

  // Replace any existing model audio for this exact target, then store the new
  // one as parent-recorded / provisional (clinicianApproved: false).
  const save = async (item: QueueItem, result: RecordingResult) => {
    const existing = await repo.findModelAudio(
      item.sound,
      item.promptType,
      item.wordId,
      item.sentenceId,
    );
    if (existing) await repo.deleteModelAudio(existing.id);
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'model');
    await repo.saveModelAudio({
      sound: item.sound,
      promptType: item.promptType,
      wordId: item.wordId,
      sentenceId: item.sentenceId,
      blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      clinicianApproved: false,
      label: item.title,
    });
    setSavedCount((c) => c + 1);
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent/tonight')} className="w-fit text-base font-bold text-slate-600">
        → חזרה להכנה
      </button>
      <header>
        <h1 className="text-2xl font-black">הקלטת דוגמאות 🎙️</h1>
        <p className="mt-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 shadow-sm" data-testid="model-provisional-note">
          הקלטות של הורה — זמניות, <strong>אינן מאושרות קלינאית</strong>, ומשמשות את שני הילדים.
          הקריינות המובנית באפליקציה אינה נחשבת דוגמה קלינית.
        </p>
      </header>

      {phase === 'setup' && (
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
          <p className="font-bold">בחרו צליל להקלטה</p>
          <div className="grid grid-cols-2 gap-3">
            {sounds.map((s) => (
              <button
                key={s}
                onClick={() => begin(s)}
                data-testid={`model-pick-${s}`}
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 p-4 font-black text-indigo-900 hover:bg-indigo-100"
              >
                <SoundBadge sound={s} size="sm" /> הקלטה
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            כל מסלול: הצליל לבד, כמה מילים, ומשפט — דקות ספורות.
          </p>
        </section>
      )}

      {phase === 'recording' && (
        <RecordingQueue
          items={queue}
          theme="arena"
          saveLabel="שמירת דוגמה והמשך"
          onSave={save}
          onComplete={() => setPhase('done')}
          onExit={() => navigate('/parent/tonight')}
        />
      )}

      {phase === 'done' && (
        <section className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">✅</span>
          <h2 className="text-xl font-black">נשמרו {savedCount} דוגמאות לצליל <SoundBadge sound={sound} size="sm" /></h2>
          <p className="text-sm text-slate-600">הדוגמאות זמינות בתרגול ומסומנות כממתינות לאישור קלינאית.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase('setup')}>צליל נוסף</Button>
            <Button variant="arena" onClick={() => navigate('/parent/tonight')}>חזרה להכנה</Button>
          </div>
        </section>
      )}
    </main>
  );
}
