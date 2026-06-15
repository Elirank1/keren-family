import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type { AttemptRating, ChildId, RecordingAttempt } from '@/lib/types';

const RATING_LABEL: Record<AttemptRating, string> = {
  independent: 'עצמאי',
  after_model: 'אחרי דוגמה',
  not_yet: 'עוד לא',
  participated: 'השתתף',
  imitated: 'חיקה',
  skipped: 'דילגנו',
};

const PROMPT_LABEL = { isolated_sound: 'צליל', word: 'מילה', sentence: 'משפט' } as const;

interface Row extends RecordingAttempt {
  label: string;
}

export default function RecordingsReview() {
  const navigate = useNavigate();
  const [child, setChild] = useState<ChildId>('lavi');
  const [version, setVersion] = useState(0); // bump to refetch after delete

  const { data, loading } = useAsync(async () => {
    const [attempts, words] = await Promise.all([
      repo.getAttemptsByChild(child),
      repo.getWords(),
    ]);
    const wordMap = new Map(words.map((w) => [w.id, w.text]));
    const rows: Row[] = await Promise.all(
      attempts
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(async (a) => {
          let label = '';
          if (a.wordId) label = wordMap.get(a.wordId) ?? a.wordId;
          else if (a.sentenceId) {
            const s = await repo.getSentence(a.sentenceId);
            label = s?.text ?? a.sentenceId;
          } else label = 'הצליל לבד';
          return { ...a, label };
        }),
    );
    return rows;
  }, [child, version]);

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">ההקלטות שלנו 🎧</h1>
        <p className="text-sm text-slate-600">
          כל ההקלטות נשמרות במכשיר בלבד. אפשר להאזין, ולמחוק מה שלא צריך.
        </p>
      </header>

      <div className="flex gap-2">
        {(['lavi', 'niv'] as ChildId[]).map((c) => (
          <button
            key={c}
            onClick={() => setChild(c)}
            data-testid={`recordings-child-${c}`}
            aria-pressed={child === c}
            className={`flex-1 rounded-2xl p-3 text-lg font-black ${
              child === c ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
            }`}
          >
            {c === 'lavi' ? '🦁 לביא' : '🐢 ניב'}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <p className="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm" data-testid="recordings-empty">
          אין עדיין הקלטות עבור {child === 'lavi' ? 'לביא' : 'ניב'}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="recordings-list">
          {data.map((row) => (
            <RecordingRow
              key={row.id}
              row={row}
              onDeleted={() => setVersion((v) => v + 1)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function RecordingRow({ row, onDeleted }: { row: Row; onDeleted: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  const play = async () => {
    const blobRec = await repo.getAudioBlob(row.recordingBlobId);
    if (!blobRec) {
      setMissing(true);
      return;
    }
    const url = URL.createObjectURL(blobRec.blob);
    const audio = new Audio(url);
    setPlaying(true);
    audio.onended = () => {
      setPlaying(false);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      setPlaying(false);
      setMissing(true);
      URL.revokeObjectURL(url);
    };
    void audio.play().catch(() => {
      setPlaying(false);
      URL.revokeObjectURL(url);
    });
  };

  const remove = async () => {
    await repo.deleteAttempt(row.id);
    onDeleted();
  };

  return (
    <li
      data-testid={`recording-${row.id}`}
      className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm"
    >
      <SoundBadge sound={row.sound} size="sm" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black">{row.label}</span>
          {row.baseline && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
              תמונת פתיחה
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          {PROMPT_LABEL[row.promptType]} · {new Date(row.createdAt).toLocaleString('he-IL')}
          {row.rating ? ` · ${RATING_LABEL[row.rating]}` : ''}
        </p>
        {missing && (
          <p className="text-xs font-bold text-rose-600" data-testid={`recording-missing-${row.id}`}>
            לא ניתן לטעון את ההקלטה במכשיר זה.
          </p>
        )}
      </div>
      <Button variant="secondary" onClick={play} data-testid={`recording-play-${row.id}`} aria-label="האזנה">
        {playing ? '⏸️' : '▶️'}
      </Button>
      <Button variant="ghost" onClick={remove} data-testid={`recording-delete-${row.id}`} aria-label="מחיקה">
        🗑️
      </Button>
    </li>
  );
}
