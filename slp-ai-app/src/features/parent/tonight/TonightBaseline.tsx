import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { uid } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import {
  LAVI_BASELINE_RATINGS,
  NIV_BASELINE_RATINGS,
  RatingPicker,
} from '@/components/RatingPicker';
import { RecordingQueue } from './RecordingQueue';
import { buildBaselineQueue, enabledSoundsInOrder, type QueueItem } from './tonight';
import type { RecordingResult } from '@/lib/recorder';
import type { AttemptRating, ChildId, TargetSound } from '@/lib/types';

type Phase = 'setup' | 'recording' | 'done';

export default function TonightBaseline() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('setup');
  const [childId, setChildId] = useState<ChildId>('lavi');
  const [sound, setSound] = useState<TargetSound>('s');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const { data, loading } = useAsync(async () => {
    const lavi = await enabledSoundsInOrder('lavi');
    const niv = await enabledSoundsInOrder('niv');
    return { lavi, niv };
  }, []);

  if (loading || !data) return <Spinner />;

  const ratings = childId === 'lavi' ? LAVI_BASELINE_RATINGS : NIV_BASELINE_RATINGS;
  const theme = childId === 'lavi' ? 'arena' : 'garden';
  const soundsForChild = (childId === 'lavi' ? data.lavi : data.niv);
  const sounds = soundsForChild.length ? soundsForChild : (['s'] as TargetSound[]);

  const begin = async (s: TargetSound) => {
    setSound(s);
    setQueue(await buildBaselineQueue(childId, s));
    setSavedCount(0);
    setPhase('recording');
  };

  // Save a baseline attempt (tagged baseline:true). Returns the attempt id so
  // the rating + note follow-up can attach to it.
  const save = async (item: QueueItem, result: RecordingResult): Promise<string> => {
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'attempt');
    const attempt = await repo.saveAttempt({
      id: uid('attempt'),
      childId,
      sound: item.sound,
      wordId: item.wordId,
      sentenceId: item.sentenceId,
      promptType: item.promptType,
      recordingBlobId: blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      baseline: true,
    });
    setSavedCount((c) => c + 1);
    return attempt.id;
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent/tonight')} className="w-fit text-base font-bold text-slate-600">
        → חזרה להכנה
      </button>
      <header>
        <h1 className="text-2xl font-black">תמונת פתיחה 📸</h1>
        <p className="mt-1 rounded-2xl bg-white p-3 text-sm text-slate-600 shadow-sm" data-testid="baseline-disclaimer">
          זו תמונת פתיחה לצורך השוואה עתידית, לא אבחון קליני.
        </p>
      </header>

      {phase === 'setup' && (
        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
          <div>
            <p className="mb-2 font-bold">בחרו ילד</p>
            <div className="flex gap-2">
              {(['lavi', 'niv'] as ChildId[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChildId(c)}
                  data-testid={`baseline-child-${c}`}
                  aria-pressed={childId === c}
                  className={`flex-1 rounded-2xl p-4 text-lg font-black ${
                    childId === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {c === 'lavi' ? '🦁 לביא' : '🐢 ניב'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold">בחרו צליל</p>
            <div className="grid grid-cols-2 gap-3">
              {sounds.map((s) => (
                <button
                  key={s}
                  onClick={() => begin(s)}
                  data-testid={`baseline-pick-${s}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 p-4 font-black text-emerald-900 hover:bg-emerald-100"
                >
                  <SoundBadge sound={s} size="sm" /> התחלה
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {childId === 'niv'
              ? 'ניב: הצליל לבד (אם רוצה) ועוד 2–3 מילים. בלי קריאה, בלי ציון.'
              : 'לביא: הצליל לבד, 4–5 מילים ומשפט. דירוג והערה לכל פריט.'}
          </p>
        </section>
      )}

      {phase === 'recording' && (
        <RecordingQueue
          items={queue}
          theme={theme}
          saveLabel="שמירה והמשך"
          onSave={save}
          renderAfterSave={(_item, saved) => (
            <BaselineFollowUp
              attemptId={saved as string}
              ratings={ratings}
              theme={theme}
            />
          )}
          onComplete={() => setPhase('done')}
          onExit={() => navigate('/parent/tonight')}
        />
      )}

      {phase === 'done' && (
        <section className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-sm">
          <span className="text-5xl" aria-hidden="true">📸</span>
          <h2 className="text-xl font-black">
            נשמרה תמונת פתיחה — {savedCount} פריטים לצליל <SoundBadge sound={sound} size="sm" />
          </h2>
          <p className="text-sm text-slate-600">לצורך השוואה עתידית בלבד, לא אבחון קליני.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase('setup')}>עוד צליל / ילד</Button>
            <Button variant="primary" onClick={() => navigate('/parent/tonight')}>חזרה להכנה</Button>
          </div>
        </section>
      )}
    </main>
  );
}

function BaselineFollowUp({
  attemptId,
  ratings,
  theme,
}: {
  attemptId: string;
  ratings: { value: AttemptRating; label: string }[];
  theme: 'arena' | 'garden';
}) {
  const [rating, setRating] = useState<AttemptRating | undefined>();
  const [note, setNote] = useState('');
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <RatingPicker
        options={ratings}
        value={rating}
        theme={theme}
        onChange={async (r) => {
          setRating(r);
          await repo.setAttemptRating(attemptId, r);
        }}
      />
      <label className="w-full">
        <span className="sr-only">הערת הורה</span>
        <textarea
          value={note}
          placeholder="הערת הורה (לא חובה)"
          onChange={(e) => setNote(e.target.value)}
          onBlur={async () => {
            if (note.trim()) await repo.setAttemptNote(attemptId, note);
          }}
          className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
          rows={2}
        />
      </label>
    </div>
  );
}
