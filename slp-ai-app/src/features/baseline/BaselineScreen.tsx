import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { uid } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { AudioRecorder } from '@/components/AudioRecorder';
import {
  LAVI_BASELINE_RATINGS,
  NIV_BASELINE_RATINGS,
  RatingPicker,
} from '@/components/RatingPicker';
import { SoundBadge } from '@/components/SoundBadge';
import type {
  AttemptRating,
  ChildId,
  PracticeSentence,
  PracticeWord,
  PromptType,
  TargetSound,
} from '@/lib/types';
import type { RecordingResult } from '@/lib/recorder';

interface BaselinePrompt {
  key: string;
  sound: TargetSound;
  promptType: PromptType;
  title: string;
  wordId?: string;
  sentenceId?: string;
}

interface BaselineData {
  childId: ChildId;
  displayName: string;
  prompts: BaselinePrompt[];
}

export default function BaselineScreen() {
  const { childId } = useParams<{ childId: ChildId }>();
  const navigate = useNavigate();

  const { data, loading } = useAsync(async (): Promise<BaselineData | null> => {
    if (!childId) return null;
    const child = await repo.getChild(childId);
    if (!child) return null;
    const enabled = await repo.getEnabledSounds(childId);
    const prompts: BaselinePrompt[] = [];
    for (const sound of enabled) {
      prompts.push({
        key: `${sound}-iso`,
        sound,
        promptType: 'isolated_sound',
        title: 'הצליל לבד',
      });
      const words = (await repo.getWordsBySound(sound))
        .filter((w: PracticeWord) => w.ageBands.includes(child.ageBand) && (w.enabled ?? true))
        .slice(0, childId === 'niv' ? 2 : 3);
      for (const w of words) {
        prompts.push({
          key: `${sound}-w-${w.id}`,
          sound,
          promptType: 'word',
          title: w.text,
          wordId: w.id,
        });
      }
      if (childId === 'lavi') {
        const sentences = await repo.getSentencesBySound(sound);
        const s: PracticeSentence | undefined = sentences[0];
        if (s) {
          prompts.push({
            key: `${sound}-s-${s.id}`,
            sound,
            promptType: 'sentence',
            title: s.text,
            sentenceId: s.id,
          });
        }
      }
    }
    return { childId, displayName: child.displayName, prompts };
  }, [childId]);

  const ratingOptions = useMemo(
    () => (childId === 'lavi' ? LAVI_BASELINE_RATINGS : NIV_BASELINE_RATINGS),
    [childId],
  );

  const [saved, setSaved] = useState<Record<string, boolean>>({});

  if (loading) return <Spinner />;
  if (!data || !childId) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center">
        <div>
          <p className="mb-4">לא נמצא מידע לילד זה.</p>
          <Button onClick={() => navigate('/parent')}>חזרה</Button>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">תמונת פתיחה — {data.displayName}</h1>
        <p className="mt-1 rounded-2xl bg-white p-3 text-sm text-slate-600 shadow-sm">
          אנחנו שומרים תמונת פתיחה כדי להשוות לעצמנו בהמשך. זו אינה בדיקה קלינית.
        </p>
      </header>

      {data.prompts.length === 0 && (
        <p className="text-slate-500">אין צליל פעיל. אפשר להפעיל צליל בהגדרות הקלינאית.</p>
      )}

      <div className="flex flex-col gap-4">
        {data.prompts.map((p) => (
          <BaselinePromptCard
            key={p.key}
            childId={childId}
            prompt={p}
            ratingOptions={ratingOptions}
            done={!!saved[p.key]}
            onSaved={() => setSaved((prev) => ({ ...prev, [p.key]: true }))}
          />
        ))}
      </div>
    </main>
  );
}

function BaselinePromptCard({
  childId,
  prompt,
  ratingOptions,
  done,
  onSaved,
}: {
  childId: ChildId;
  prompt: BaselinePrompt;
  ratingOptions: { value: AttemptRating; label: string }[];
  done: boolean;
  onSaved: () => void;
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [rating, setRating] = useState<AttemptRating | undefined>();
  const [note, setNote] = useState('');

  const handleSave = async (result: RecordingResult) => {
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'attempt');
    const attempt = await repo.saveAttempt({
      id: uid('attempt'),
      childId,
      sound: prompt.sound,
      wordId: prompt.wordId,
      sentenceId: prompt.sentenceId,
      promptType: prompt.promptType,
      recordingBlobId: blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      baseline: true,
    });
    setAttemptId(attempt.id);
    onSaved();
  };

  return (
    <section
      data-testid={`baseline-prompt-${prompt.key}`}
      className={`rounded-3xl border bg-white p-4 shadow-sm ${done ? 'border-emerald-300' : 'border-transparent'}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <SoundBadge sound={prompt.sound} size="sm" />
        <span className="text-xs text-slate-500">
          {prompt.promptType === 'isolated_sound'
            ? 'צליל'
            : prompt.promptType === 'word'
              ? 'מילה'
              : 'משפט'}
        </span>
        <h2 className="text-lg font-black">{prompt.title}</h2>
        {done && <span className="ml-auto text-emerald-600" aria-label="נשמר">✓</span>}
      </div>
      <div className="flex flex-col items-center gap-3">
        <AudioRecorder promptType={prompt.promptType} onSave={handleSave} theme="garden" />
        {attemptId && (
          <div className="flex w-full flex-col items-center gap-3">
            <RatingPicker
              options={ratingOptions}
              value={rating}
              onChange={async (r) => {
                setRating(r);
                await repo.setAttemptRating(attemptId, r);
              }}
              theme="garden"
            />
            <label className="w-full">
              <span className="sr-only">הערת הורה</span>
              <textarea
                value={note}
                placeholder="הערת הורה (לא חובה)"
                onChange={(e) => setNote(e.target.value)}
                onBlur={async () => {
                  if (attemptId) await repo.setAttemptNote(attemptId, note);
                }}
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                rows={2}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
