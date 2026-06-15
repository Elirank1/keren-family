import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { uid, nowIso } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { BackHome } from '@/components/BackHome';
import { WordCard } from '@/components/WordCard';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ModelPlayback } from '@/components/ModelPlayback';
import { SoundBadge } from '@/components/SoundBadge';
import type { PracticeSentence, PracticeWord, TargetSound } from '@/lib/types';
import type { RecordingResult } from '@/lib/recorder';

type Phase = 'intro' | 'niv' | 'lavi' | 'done';

interface SiblingData {
  sound: TargetSound;
  nivWord: PracticeWord;
  laviSentence: PracticeSentence;
}

export default function SiblingsToday() {
  const navigate = useNavigate();
  const sessionIdRef = useRef(uid('session'));
  const attemptIdsRef = useRef<string[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [meter, setMeter] = useState(0); // 0..2 shared turns

  const { data, loading } = useAsync(async (): Promise<SiblingData | null> => {
    const enabled = await repo.getEnabledSounds('niv');
    const sound: TargetSound = enabled[0] ?? 's';
    const words = await repo.getWordsBySound(sound);
    // A concrete word both can use; prefer one in the 3-4 band.
    const nivWord =
      words.find((w) => w.ageBands.includes('3-4') && (w.enabled ?? true)) ?? words[0];
    const sentences = await repo.getSentencesBySound(sound);
    const laviSentence = sentences[0];
    if (!nivWord || !laviSentence) return null;
    return { sound, nivWord, laviSentence };
  }, []);

  if (loading) return <Spinner />;
  if (!data) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-white">
        <div>
          <p className="mb-4">אין כרגע צליל פעיל למצב אחים.</p>
          <Button onClick={() => navigate('/')}>חזרה לבית</Button>
        </div>
      </main>
    );
  }

  const { sound, nivWord, laviSentence } = data;

  const saveAttempt = async (
    childId: 'lavi' | 'niv',
    result: RecordingResult,
    refs: { wordId?: string; sentenceId?: string; promptType: 'word' | 'sentence' },
  ) => {
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'attempt');
    const attempt = await repo.saveAttempt({
      childId,
      sound,
      wordId: refs.wordId,
      sentenceId: refs.sentenceId,
      promptType: refs.promptType,
      recordingBlobId: blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      sessionId: sessionIdRef.current,
    });
    attemptIdsRef.current.push(attempt.id);
  };

  const finishSession = async () => {
    await repo.saveSession({
      id: sessionIdRef.current,
      childId: 'siblings',
      sound,
      missionId: `siblings_${sound}`,
      startedAt: nowIso(),
      completedAt: nowIso(),
      attemptIds: attemptIdsRef.current,
      participantChildIds: ['niv', 'lavi'],
    });
  };

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-gradient-to-b from-fuchsia-900 to-slate-900 px-5 py-6 text-white"
    >
      <BackHome theme="arena" />
      <header className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">🤝</span>
        <div>
          <h1 className="text-2xl font-black">מצב אחים</h1>
          <p className="text-white/80">משחקים יחד — בלי תחרות</p>
        </div>
      </header>

      {/* Shared family meter — fills from both turns, never a comparison. */}
      <div data-testid="shared-meter" className="flex items-center gap-2">
        <span className="text-sm font-bold">מד משפחתי</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${(meter / 2) * 100}%` }}
          />
        </div>
      </div>

      {phase === 'intro' && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <SoundBadge sound={sound} size="lg" showName />
          <p className="max-w-md text-lg">
            ניב יבחר ויגיד <strong>{nivWord.text}</strong>, ולביא יגיד משפט עם אותו צליל.
          </p>
          <Button variant="primary" onClick={() => setPhase('niv')} data-testid="siblings-start">
            מתחילים יחד 🚀
          </Button>
        </section>
      )}

      {phase === 'niv' && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl font-black text-emerald-300">תור של ניב 🐢</p>
          <WordCard word={nivWord} theme="garden" />
          <ModelPlayback sound={sound} promptType="word" wordId={nivWord.id} theme="garden" />
          <AudioRecorder
            promptType="word"
            theme="garden"
            onSave={async (r) => {
              await saveAttempt('niv', r, { wordId: nivWord.id, promptType: 'word' });
              setMeter(1);
              setPhase('lavi');
            }}
          />
          <button
            onClick={() => {
              setMeter(1);
              setPhase('lavi');
            }}
            className="text-sm underline opacity-70"
          >
            אפשר לדלג היום
          </button>
        </section>
      )}

      {phase === 'lavi' && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl font-black text-cyan-300">תור של לביא 🦁</p>
          <p className="rounded-3xl bg-white/10 p-5 text-2xl font-black leading-relaxed" lang="he">
            {laviSentence.textWithNikud ?? laviSentence.text}
          </p>
          <ModelPlayback sound={sound} promptType="sentence" sentenceId={laviSentence.id} theme="arena" />
          <AudioRecorder
            promptType="sentence"
            theme="arena"
            onSave={async (r) => {
              await saveAttempt('lavi', r, { sentenceId: laviSentence.id, promptType: 'sentence' });
              setMeter(2);
              await finishSession();
              setPhase('done');
            }}
          />
          <button
            onClick={async () => {
              setMeter(2);
              await finishSession();
              setPhase('done');
            }}
            className="text-sm underline opacity-70"
          >
            אפשר לדלג היום
          </button>
        </section>
      )}

      {phase === 'done' && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <div className="text-7xl" aria-hidden="true">🎉</div>
          <h2 className="text-2xl font-black">סיימתם יחד!</h2>
          <p className="text-white/80">המד המשפחתי מלא. כל הכבוד לשניכם.</p>
          <Button variant="primary" onClick={() => navigate('/')} data-testid="siblings-home">
            סיום 🏠
          </Button>
        </section>
      )}
    </main>
  );
}
