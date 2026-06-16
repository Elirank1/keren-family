import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { nowIso } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type {
  ChildId,
  ClinicalStage,
  ClinicianSoundConfig,
  TargetSound,
  WeeklyFocus,
  WordPosition,
} from '@/lib/types';

const STAGES: ClinicalStage[] = [
  'listening',
  'isolated_sound',
  'syllable',
  'word',
  'phrase',
  'sentence',
  'conversation',
];
const STAGE_LABEL: Record<ClinicalStage, string> = {
  listening: 'האזנה',
  isolated_sound: 'צליל בודד',
  syllable: 'הברה',
  word: 'מילה',
  phrase: 'צירוף',
  sentence: 'משפט',
  conversation: 'שיחה',
};
const SOUNDS: TargetSound[] = ['s', 'sh', 'ts', 'ch'];
const POSITIONS: WordPosition[] = ['initial', 'medial', 'final'];
const POSITION_LABEL: Record<WordPosition, string> = {
  initial: 'תחילית',
  medial: 'אמצעית',
  final: 'סופית',
};

export default function ClinicianArea() {
  const navigate = useNavigate();
  const [childId, setChildId] = useState<ChildId>('lavi');
  const [sound, setSound] = useState<TargetSound>('s');

  const { data, loading, reload } = useAsync(
    async () => {
      const [config, focus] = await Promise.all([
        repo.getClinicianConfig(childId, sound),
        repo.getWeeklyFocus(childId),
      ]);
      return { config, focus };
    },
    [childId, sound],
  );

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>

      <header className="rounded-3xl bg-gradient-to-l from-teal-700 to-emerald-600 p-5 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">🩺</span>
          <h1 className="text-2xl font-black">אזור קלינאי.ת / מטפל.ת</h1>
        </div>
        <p className="mt-1 text-sm text-teal-50">
          לקלינאית התקשורת המטפלת — או להורה בהנחייתה. כאן נקבעת תכנית התרגול הביתי
          בין הפגישות. הערכים זמניים עד אישור, והשלב לעולם אינו מתקדם אוטומטית.
        </p>
      </header>

      {/* child selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(['lavi', 'niv'] as ChildId[]).map((c) => (
          <button
            key={c}
            onClick={() => setChildId(c)}
            data-testid={`clinician-child-${c}`}
            aria-pressed={c === childId}
            className={`rounded-2xl px-4 py-2 font-bold ${c === childId ? 'bg-teal-700 text-white' : 'bg-white'}`}
          >
            {c === 'lavi' ? '🦁 לביא' : '🐢 ניב'}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <WeeklyFocusCard key={`focus-${childId}`} childId={childId} focus={data.focus} onSaved={reload} />

          <Link
            to={`/parent/clinician/report/${childId}`}
            data-testid="clinician-report-link"
            className="flex items-center gap-3 rounded-3xl bg-white p-4 font-bold shadow-sm hover:bg-slate-50"
          >
            <span className="text-2xl" aria-hidden="true">📊</span>
            <span className="flex-1">דוח התקדמות לקלינאית — {childId === 'lavi' ? 'לביא' : 'ניב'}</span>
            <span aria-hidden="true">←</span>
          </Link>

          {/* per-sound clinical config */}
          <section className="flex flex-col gap-3">
            <h2 className="font-black">הגדרת צלילים</h2>
            <div className="flex flex-wrap gap-2">
              {SOUNDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSound(s)}
                  data-testid={`clinician-sound-${s}`}
                  aria-pressed={s === sound}
                  className={`rounded-2xl px-3 py-2 font-bold ${s === sound ? 'bg-teal-700 text-white' : 'bg-white'}`}
                >
                  <SoundBadge sound={s} size="sm" />
                </button>
              ))}
            </div>
            {data.config ? (
              <ConfigForm key={`${childId}-${sound}`} config={data.config} onSaved={reload} />
            ) : (
              <p className="text-slate-500">אין הגדרה לצירוף הזה.</p>
            )}
          </section>

          <PinSettings />
        </>
      )}
    </main>
  );
}

function WeeklyFocusCard({
  childId,
  focus,
  onSaved,
}: {
  childId: ChildId;
  focus: WeeklyFocus | undefined;
  onSaved: () => void;
}) {
  const [sound, setSound] = useState<TargetSound | ''>(focus?.sound ?? '');
  const [position, setPosition] = useState<WordPosition | ''>(focus?.position ?? '');
  const [note, setNote] = useState(focus?.note ?? '');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await repo.setWeeklyFocus(childId, {
      sound: sound || undefined,
      position: position || undefined,
      note,
      updatedAt: nowIso(),
    });
    setSaved(true);
    onSaved();
  };

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm" data-testid="weekly-focus">
      <h2 className="font-black">מיקוד השבוע</h2>
      <p className="text-sm text-slate-500">מה הקלינאית ביקשה לתרגל השבוע. מוצג כתזכורת.</p>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold">צליל</span>
          <select
            value={sound}
            data-testid="focus-sound"
            onChange={(e) => { setSound(e.target.value as TargetSound | ''); setSaved(false); }}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">—</option>
            {SOUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold">מיקום בהברה</span>
          <select
            value={position}
            data-testid="focus-position"
            onChange={(e) => { setPosition(e.target.value as WordPosition | ''); setSaved(false); }}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="">—</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-bold">הנחיית הקלינאית להשבוע</span>
        <textarea
          value={note}
          data-testid="focus-note"
          onChange={(e) => { setNote(e.target.value); setSaved(false); }}
          rows={2}
          placeholder="לדוגמה: להתמקד ב-/s/ בתחילת מילה, רמז ויזואלי של נחש."
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} data-testid="focus-save">שמירת מיקוד</Button>
        {saved && <span className="text-emerald-600" role="status">נשמר ✓</span>}
        {focus?.updatedAt && (
          <span className="text-xs text-slate-400">עודכן: {new Date(focus.updatedAt).toLocaleDateString('he-IL')}</span>
        )}
      </div>
    </section>
  );
}

function ConfigForm({ config, onSaved }: { config: ClinicianSoundConfig; onSaved: () => void }) {
  const [draft, setDraft] = useState<ClinicianSoundConfig>(config);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ClinicianSoundConfig>(key: K, value: ClinicianSoundConfig[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };
  const togglePosition = (pos: WordPosition) => {
    setDraft((d) => ({
      ...d,
      targetPositions: d.targetPositions.includes(pos)
        ? d.targetPositions.filter((p) => p !== pos)
        : [...d.targetPositions, pos],
    }));
    setSaved(false);
  };

  const save = async () => {
    await repo.updateClinicianConfig(draft);
    setSaved(true);
    onSaved();
  };

  return (
    <section data-testid="clinician-form" className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <label className="flex items-center justify-between">
        <span className="font-bold">צליל פעיל לתרגול</span>
        <input
          type="checkbox"
          checked={draft.enabled}
          data-testid="clinician-enabled"
          onChange={(e) => update('enabled', e.target.checked)}
          className="h-6 w-6"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">שלב נוכחי</span>
        <select
          value={draft.currentStage}
          data-testid="clinician-stage"
          onChange={(e) => update('currentStage', e.target.value as ClinicalStage)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-bold">מיקומים למיקוד</span>
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePosition(p)}
              data-testid={`clinician-position-${p}`}
              aria-pressed={draft.targetPositions.includes(p)}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                draft.targetPositions.includes(p) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {POSITION_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">רמז מילולי</span>
        <input value={draft.verbalCue} onChange={(e) => update('verbalCue', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">רמז חזותי</span>
        <input value={draft.visualCue} onChange={(e) => update('visualCue', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">מילים להימנע מהן (מופרדות בפסיק)</span>
        <input
          value={draft.avoidWords.join(', ')}
          data-testid="clinician-avoid"
          onChange={(e) => update('avoidWords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">הערות</span>
        <textarea value={draft.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-3 py-2" />
      </label>

      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${draft.clinicianApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {draft.clinicianApproved ? 'מאושר קלינאית' : 'ממתין לאישור קלינאית'}
        </span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.clinicianApproved} onChange={(e) => update('clinicianApproved', e.target.checked)} />
          סמן כמאושר
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} data-testid="clinician-save">שמירה</Button>
        {saved && <span className="text-emerald-600" role="status">נשמר ✓</span>}
      </div>
    </section>
  );
}

function PinSettings() {
  const [pin, setPin] = useState('');
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    await repo.updateSettings({ parentPin: pin });
    setDone(true);
    setPin('');
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="font-black">שינוי קוד הורה</h2>
      <p className="text-sm text-slate-500">קוד ברירת המחדל הוא 2468. מומלץ לשנות לקוד אישי.</p>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          data-testid="change-pin-input"
          onChange={(e) => { setDone(false); setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); }}
          placeholder="קוד חדש"
          className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-center text-xl tracking-widest"
        />
        <Button type="submit" variant="secondary" disabled={pin.length !== 4} data-testid="change-pin-submit">עדכון קוד</Button>
        {done && <span className="text-emerald-600" role="status">עודכן ✓</span>}
      </div>
    </form>
  );
}
