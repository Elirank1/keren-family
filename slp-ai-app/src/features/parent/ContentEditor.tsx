import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { uid } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type { AgeBand, PracticeWord, TargetSound } from '@/lib/types';

const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];
const AGE_BANDS: AgeBand[] = ['3-4', '7-9'];

export default function ContentEditor() {
  const navigate = useNavigate();
  const [sound, setSound] = useState<TargetSound>('s');
  const { data, loading, reload } = useAsync(() => repo.getWordsBySound(sound), [sound]);

  if (loading || !data) return <Spinner />;

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">עריכת תוכן</h1>
        <p className="text-sm text-slate-600">כל מילה היא זמנית וניתנת לעריכה.</p>
      </header>

      <div className="flex gap-2" role="tablist" aria-label="בחירת צליל">
        {SOUNDS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={s === sound}
            onClick={() => setSound(s)}
            data-testid={`content-sound-${s}`}
            className={`rounded-2xl px-4 py-2 font-bold ${s === sound ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'}`}
          >
            <SoundBadge sound={s} size="sm" />
          </button>
        ))}
      </div>

      <AddWordForm sound={sound} onAdded={reload} />

      <div className="flex flex-col gap-3">
        {data.map((w: PracticeWord) => (
          <WordRow key={w.id} word={w} onChanged={reload} />
        ))}
      </div>
    </main>
  );
}

function WordRow({ word, onChanged }: { word: PracticeWord; onChanged: () => void }) {
  const [text, setText] = useState(word.text);
  const [nikud, setNikud] = useState(word.textWithNikud ?? '');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(word.difficulty);
  const [bands, setBands] = useState<AgeBand[]>(word.ageBands);
  const enabled = word.enabled ?? true;

  const persist = async (patch: Partial<PracticeWord>) => {
    await repo.putWord({ ...word, text, textWithNikud: nikud, difficulty, ageBands: bands, ...patch });
    onChanged();
  };

  return (
    <section data-testid={`word-row-${word.id}`} className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => persist({ text })}
          aria-label="טקסט המילה"
          className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-lg font-black"
        />
        <input
          value={nikud}
          onChange={(e) => setNikud(e.target.value)}
          onBlur={() => persist({ textWithNikud: nikud })}
          aria-label="ניקוד"
          placeholder="ניקוד"
          className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-lg"
        />
        <button
          onClick={() => persist({ enabled: !enabled })}
          data-testid={`word-toggle-${word.id}`}
          className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
        >
          {enabled ? 'פעיל' : 'כבוי'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          רמת קושי
          <select
            value={difficulty}
            onChange={(e) => {
              const d = Number(e.target.value) as 1 | 2 | 3;
              setDifficulty(d);
              void persist({ difficulty: d });
            }}
            aria-label="רמת קושי"
            className="rounded-xl border border-slate-200 px-2 py-1"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          קבוצות גיל
          {AGE_BANDS.map((b) => (
            <label key={b} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={bands.includes(b)}
                onChange={(e) => {
                  const next = e.target.checked ? [...bands, b] : bands.filter((x) => x !== b);
                  setBands(next);
                  void persist({ ageBands: next });
                }}
              />
              {b}
            </label>
          ))}
        </div>
        {!word.clinicianApproved && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
            ממתין לאישור קלינאית
          </span>
        )}
      </div>
    </section>
  );
}

function AddWordForm({ sound, onAdded }: { sound: TargetSound; onAdded: () => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const word: PracticeWord = {
      id: uid('word'),
      text: text.trim(),
      sound,
      positions: ['initial'],
      syllables: 1,
      ageBands: ['7-9'],
      difficulty: 2,
      category: 'parent_added',
      imageAsset: null,
      modelAudioAsset: null,
      clinicianApproved: false,
      enabled: true,
    };
    await repo.putWord(word);
    setText('');
    setOpen(false);
    onAdded();
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} data-testid="add-word-open">
        ➕ הוספת מילה
      </Button>
    );
  }

  return (
    <form onSubmit={add} className="flex items-center gap-2 rounded-3xl bg-white p-4 shadow-sm">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="מילה חדשה"
        aria-label="מילה חדשה"
        data-testid="add-word-input"
        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-lg font-black"
      />
      <Button type="submit" variant="primary" data-testid="add-word-submit">
        הוספה
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        ביטול
      </Button>
    </form>
  );
}
