import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { uid, nowIso } from '@/lib/ids';
import type {
  AttemptRating,
  ChildId,
  GeneratedMission,
  MissionStep,
  PracticeSentence,
  PracticeWord,
  PromptType,
  RecordingAttempt,
} from '@/lib/types';
import type { RecordingResult } from '@/lib/recorder';
import { Button, Spinner } from '@/components/ui';
import { WordCard, wordEmoji } from '@/components/WordCard';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ModelPlayback } from '@/components/ModelPlayback';
import {
  LAVI_RATINGS,
  NIV_RATINGS,
  RatingPicker,
} from '@/components/RatingPicker';
import { SoundBadge, soundDisplayName } from '@/components/SoundBadge';
import { MuteToggle } from '@/components/MuteToggle';
import { playClip } from '@/lib/media';
import { getMissionMeta } from '@/content';

interface MissionData {
  mission: GeneratedMission;
  words: Record<string, PracticeWord>;
  sentences: Record<string, PracticeSentence>;
}

export default function PracticeScreen() {
  const { childId, missionId } = useParams<{ childId: ChildId; missionId: string }>();
  const navigate = useNavigate();

  const { data, loading } = useAsync(async (): Promise<MissionData | null> => {
    if (!missionId) return null;
    const mission = await repo.getMission(missionId);
    if (!mission) return null;
    const allWords = await repo.getWords();
    const words: Record<string, PracticeWord> = {};
    for (const w of allWords) words[w.id] = w;
    const sentenceIds = mission.steps.map((s) => s.sentenceId).filter(Boolean) as string[];
    const sentences: Record<string, PracticeSentence> = {};
    for (const id of sentenceIds) {
      const s = await repo.getSentence(id);
      if (s) sentences[id] = s;
    }
    return { mission, words, sentences };
  }, [missionId]);

  // One session id per practice run; attempts reference it.
  const sessionIdRef = useRef<string>(uid('session'));
  const attemptIdsRef = useRef<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const finish = useCallback(
    async (mission: GeneratedMission) => {
      await repo.saveSession({
        id: sessionIdRef.current,
        childId: mission.childId,
        sound: mission.sound,
        missionId: mission.id,
        startedAt: nowIso(),
        completedAt: nowIso(),
        attemptIds: attemptIdsRef.current,
        rewardId: mission.rewardId,
      });
      navigate(`/complete/${mission.childId}/${sessionIdRef.current}`);
    },
    [navigate],
  );

  const advance = useCallback(
    (mission: GeneratedMission) => {
      setStepIndex((idx) => {
        const next = idx + 1;
        const nextStep = mission.steps[next];
        if (!nextStep || nextStep.kind === 'completion') {
          void finish(mission);
          return idx;
        }
        return next;
      });
    },
    [finish],
  );

  if (loading) return <Spinner />;
  if (!data || !childId) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-white">
        <div>
          <p className="mb-4 text-xl">לא נמצאה משימה.</p>
          <Button onClick={() => navigate('/')}>חזרה לבית</Button>
        </div>
      </div>
    );
  }

  const { mission, words, sentences } = data;
  const step = mission.steps[stepIndex];
  const theme = childId === 'lavi' ? 'arena' : 'garden';

  const recordAttempt = async (
    result: RecordingResult,
    promptType: PromptType,
    refs: { wordId?: string; sentenceId?: string },
  ): Promise<RecordingAttempt> => {
    const blobId = await repo.saveAudioBlob(result.blob, result.mimeType, 'attempt');
    const attempt = await repo.saveAttempt({
      childId,
      sound: mission.sound,
      wordId: refs.wordId,
      sentenceId: refs.sentenceId,
      promptType,
      recordingBlobId: blobId,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      sessionId: sessionIdRef.current,
    });
    attemptIdsRef.current.push(attempt.id);
    return attempt;
  };

  return (
    <main
      dir="rtl"
      className={`mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-5 py-6 ${
        theme === 'arena' ? 'bg-arena-bg text-white' : 'bg-garden-bg text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar steps={mission.steps} index={stepIndex} theme={theme} />
        </div>
        <MuteToggle theme={theme} />
      </div>
      <StepView
        key={step.id}
        step={step}
        childId={childId}
        mission={mission}
        words={words}
        sentences={sentences}
        theme={theme}
        onRecord={recordAttempt}
        onAdvance={() => advance(mission)}
      />
    </main>
  );
}

function ProgressBar({
  steps,
  index,
  theme,
}: {
  steps: MissionStep[];
  index: number;
  theme: 'arena' | 'garden';
}) {
  // Progress shown as discrete steps — never an accuracy percentage.
  const visible = steps.filter((s) => s.kind !== 'completion');
  const done = Math.min(index, visible.length);
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={visible.length}
      aria-valuenow={done}
      aria-label="התקדמות במשימה"
      data-testid="mission-progress"
    >
      {visible.map((s, i) => (
        <span
          key={s.id}
          className={`h-2.5 flex-1 rounded-full ${
            i < index
              ? theme === 'arena'
                ? 'bg-arena-glow'
                : 'bg-garden-accent'
              : theme === 'arena'
                ? 'bg-slate-700'
                : 'bg-amber-200'
          }`}
        />
      ))}
    </div>
  );
}

interface StepViewProps {
  step: MissionStep;
  childId: ChildId;
  mission: GeneratedMission;
  words: Record<string, PracticeWord>;
  sentences: Record<string, PracticeSentence>;
  theme: 'arena' | 'garden';
  onRecord: (
    result: RecordingResult,
    promptType: PromptType,
    refs: { wordId?: string; sentenceId?: string },
  ) => Promise<RecordingAttempt>;
  onAdvance: () => void;
}

function StepView(props: StepViewProps) {
  const { step, childId } = props;
  switch (step.kind) {
    case 'briefing':
      return childId === 'lavi' ? <LaviBriefing {...props} /> : <NivGreeting {...props} />;
    case 'warmup':
      return <WarmupStep {...props} />;
    case 'word':
      return <WordStep {...props} />;
    case 'sentence':
      return <SentenceStep {...props} />;
    case 'listen_choose':
      return <ListenChooseStep {...props} />;
    case 'say_three':
      return <SayThreeStep {...props} />;
    default:
      return null;
  }
}

function LaviBriefing({ mission, words, onAdvance }: StepViewProps) {
  const meta = getMissionMeta('lavi', mission.sound);
  const missionWords = mission.steps
    .filter((s) => s.kind === 'word' && s.wordId)
    .map((s) => words[s.wordId!])
    .filter(Boolean);
  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3">
        <SoundBadge sound={mission.sound} size="lg" />
        <h1 className="text-3xl font-black">{meta.title}</h1>
      </div>
      <p className="text-slate-300">
        נתרגל {missionWords.length} מילים, חימום קצר ואתגר סיום.
      </p>
      <div className="flex flex-wrap gap-2">
        {missionWords.map((w) => (
          <span key={w.id} className="rounded-2xl bg-arena-surface px-3 py-2 text-lg font-bold">
            {w.text}
          </span>
        ))}
      </div>
      <div className="mt-auto">
        <Button
          variant="arena"
          onClick={() => {
            playClip('lavi_mission_start');
            onAdvance();
          }}
          data-testid="briefing-start"
        >
          מתחילים 🚀
        </Button>
      </div>
    </section>
  );
}

function NivGreeting({ mission, onAdvance }: StepViewProps) {
  const meta = getMissionMeta('niv', mission.sound);
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="text-[7rem] leading-none" aria-hidden="true">
        {meta.animal}
      </div>
      <h1 className="text-3xl font-black">הצליל שלנו: {soundDisplayName(mission.sound)}</h1>
      <button
        onClick={() => {
          playClip('niv_find_animal');
          onAdvance();
        }}
        data-testid="niv-greeting-start"
        className="rounded-full bg-garden-accent px-12 py-8 text-3xl font-black text-white shadow-xl"
      >
        ▶️ קדימה
      </button>
    </section>
  );
}

// A reusable "record → rate → continue" block for Lavi steps.
function RecordRateBlock({
  promptType,
  refs,
  sound,
  onRecord,
  onAdvance,
  ratingTheme,
  ratingOptions,
}: {
  promptType: PromptType;
  refs: { wordId?: string; sentenceId?: string };
  sound: GeneratedMission['sound'];
  onRecord: StepViewProps['onRecord'];
  onAdvance: () => void;
  ratingTheme: 'arena' | 'garden';
  ratingOptions: { value: AttemptRating; label: string }[];
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [rating, setRating] = useState<AttemptRating | undefined>(undefined);

  const handleSave = async (result: RecordingResult) => {
    const attempt = await onRecord(result, promptType, refs);
    setAttemptId(attempt.id);
  };

  const handleRating = async (r: AttemptRating) => {
    setRating(r);
    if (attemptId) await repo.setAttemptRating(attemptId, r);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <ModelPlayback
        sound={sound}
        promptType={promptType}
        wordId={refs.wordId}
        sentenceId={refs.sentenceId}
        theme={ratingTheme}
      />
      {!attemptId ? (
        <>
          <AudioRecorder promptType={promptType} onSave={handleSave} theme={ratingTheme} />
          <button
            onClick={onAdvance}
            data-testid="skip-step"
            className="text-sm font-bold underline opacity-70"
          >
            אפשר לדלג היום
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="font-bold">{ratingTheme === 'arena' ? 'בחר איך זה הרגיש לך' : 'איך היה?'}</p>
          <RatingPicker
            options={ratingOptions}
            value={rating}
            onChange={handleRating}
            theme={ratingTheme}
          />
          <Button variant={ratingTheme} onClick={onAdvance} data-testid="continue-step">
            {ratingTheme === 'arena' ? 'עוברים לאתגר הבא' : 'הלאה'}
          </Button>
        </div>
      )}
    </div>
  );
}

function WarmupStep({ mission, onRecord, onAdvance }: StepViewProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <h2 className="text-2xl font-black">חימום כוח</h2>
      <p className="text-slate-300">נפיק את הצליל לבד, ארוך וברור.</p>
      <SoundBadge sound={mission.sound} size="lg" showName />
      <RecordRateBlock
        promptType="isolated_sound"
        refs={{}}
        sound={mission.sound}
        onRecord={onRecord}
        onAdvance={onAdvance}
        ratingTheme="arena"
        ratingOptions={LAVI_RATINGS}
      />
    </section>
  );
}

function WordStep({ step, words, mission, onRecord, onAdvance }: StepViewProps) {
  const word = step.wordId ? words[step.wordId] : undefined;
  if (!word) {
    onAdvance();
    return null;
  }
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5">
      <WordCard word={word} theme="arena" />
      <RecordRateBlock
        promptType="word"
        refs={{ wordId: word.id }}
        sound={mission.sound}
        onRecord={onRecord}
        onAdvance={onAdvance}
        ratingTheme="arena"
        ratingOptions={LAVI_RATINGS}
      />
    </section>
  );
}

function SentenceStep({ step, sentences, mission, onRecord, onAdvance }: StepViewProps) {
  const sentence = step.sentenceId ? sentences[step.sentenceId] : undefined;
  // Boss arrival cue (game audio only).
  useEffect(() => {
    if (sentence) playClip('lavi_boss');
  }, [sentence]);
  if (!sentence) {
    onAdvance();
    return null;
  }
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div className="flex items-center gap-2 text-amber-400">
        <span className="text-2xl">👑</span>
        <h2 className="text-2xl font-black">אתגר הבוס</h2>
      </div>
      <p className="rounded-3xl bg-arena-surface p-6 text-3xl font-black leading-relaxed" lang="he">
        {sentence.textWithNikud ?? sentence.text}
      </p>
      <RecordRateBlock
        promptType="sentence"
        refs={{ sentenceId: sentence.id }}
        sound={mission.sound}
        onRecord={onRecord}
        onAdvance={onAdvance}
        ratingTheme="arena"
        ratingOptions={LAVI_RATINGS}
      />
    </section>
  );
}

// ---- Niv steps ----

function ListenChooseStep({ step, words, mission, onAdvance }: StepViewProps) {
  const target = step.wordId ? words[step.wordId] : undefined;
  const [chosen, setChosen] = useState<string | null>(null);
  const choices = (step.choiceWordIds ?? [])
    .map((id) => words[id])
    .filter(Boolean) as PracticeWord[];

  if (!target) {
    onAdvance();
    return null;
  }

  const onPick = (id: string) => {
    setChosen(id);
    if (id === target.id) {
      // Positive-only: correct choice celebrates and advances.
      playClip('sfx_spark');
      setTimeout(onAdvance, 900);
    }
  };

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <h2 className="text-2xl font-black">איפה {target.text}?</h2>
      <ModelPlayback sound={mission.sound} promptType="word" wordId={target.id} theme="garden" />
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {choices.map((w) => {
          const isTarget = w.id === target.id;
          const picked = chosen === w.id;
          return (
            <button
              key={w.id}
              onClick={() => onPick(w.id)}
              data-testid={`niv-choice-${w.id}`}
              data-correct={isTarget}
              className={`flex flex-col items-center gap-2 rounded-3xl border-4 bg-white p-5 text-slate-900 transition ${
                picked && isTarget
                  ? 'border-emerald-400 scale-105'
                  : picked
                    ? 'border-amber-300'
                    : 'border-transparent'
              }`}
            >
              <span className="text-6xl" aria-hidden="true">
                {wordEmoji(w)}
              </span>
              <span className="text-2xl font-black">{w.text}</span>
            </button>
          );
        })}
      </div>
      {chosen && chosen !== target.id && (
        <p className="text-lg font-bold text-emerald-700" data-testid="niv-try-again">
          בוא ננסה יחד 💚
        </p>
      )}
    </section>
  );
}

function SayThreeStep({ step, words, mission, onRecord, onAdvance }: StepViewProps) {
  const word = step.wordId ? words[step.wordId] : undefined;
  // "say it together" cue (game audio only).
  useEffect(() => {
    if (word) playClip('niv_say_together');
  }, [word]);
  if (!word) {
    onAdvance();
    return null;
  }
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <h2 className="text-2xl font-black">נגיד שלוש פעמים: {word.text}</h2>
      <div className="flex items-center justify-center gap-4 text-5xl font-black" aria-hidden="true">
        <span>1️⃣</span>
        <span>2️⃣</span>
        <span>3️⃣</span>
      </div>
      <WordCard word={word} theme="garden" />
      <RecordRateBlock
        promptType="word"
        refs={{ wordId: word.id }}
        sound={mission.sound}
        onRecord={onRecord}
        onAdvance={onAdvance}
        ratingTheme="garden"
        ratingOptions={NIV_RATINGS}
      />
    </section>
  );
}

