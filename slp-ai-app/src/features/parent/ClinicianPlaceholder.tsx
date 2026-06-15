import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type {
  ChildId,
  ClinicalStage,
  ClinicianSoundConfig,
  TargetSound,
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

export default function ClinicianPlaceholder() {
  const navigate = useNavigate();
  const [childId, setChildId] = useState<ChildId>('lavi');
  const [sound, setSound] = useState<TargetSound>('s');

  const { data, loading, reload } = useAsync(
    () => repo.getClinicianConfig(childId, sound),
    [childId, sound],
  );

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">הגדרות קלינאית</h1>
        <p className="text-sm text-slate-600">
          כלי מקומי להורה. הערכים זמניים עד לאישור קלינאית. השלב לעולם אינו מתקדם אוטומטית.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['lavi', 'niv'] as ChildId[]).map((c) => (
          <button
            key={c}
            onClick={() => setChildId(c)}
            data-testid={`clinician-child-${c}`}
            className={`rounded-2xl px-4 py-2 font-bold ${c === childId ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          >
            {c === 'lavi' ? '🦁 לביא' : '🐢 ניב'}
          </button>
        ))}
        <span className="mx-2" />
        {SOUNDS.map((s) => (
          <button
            key={s}
            onClick={() => setSound(s)}
            data-testid={`clinician-sound-${s}`}
            className={`rounded-2xl px-3 py-2 font-bold ${s === sound ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          >
            <SoundBadge sound={s} size="sm" />
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : <ConfigForm config={data} childId={childId} sound={sound} onSaved={reload} />}

      <PinSettings />
    </main>
  );
}

function ConfigForm({
  config,
  childId,
  sound,
  onSaved,
}: {
  config: ClinicianSoundConfig | undefined;
  childId: ChildId;
  sound: TargetSound;
  onSaved: () => void;
}) {
  if (!config) {
    return <p className="text-slate-500">אין הגדרה לצירוף הזה.</p>;
  }
  return <ConfigFormInner key={`${childId}-${sound}`} config={config} onSaved={onSaved} />;
}

function ConfigFormInner({
  config,
  onSaved,
}: {
  config: ClinicianSoundConfig;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ClinicianSoundConfig>(config);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ClinicianSoundConfig>(key: K, value: ClinicianSoundConfig[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
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
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">רמז מילולי</span>
        <input
          value={draft.verbalCue}
          onChange={(e) => update('verbalCue', e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">רמז חזותי</span>
        <input
          value={draft.visualCue}
          onChange={(e) => update('visualCue', e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">מספר חזרות מרבי</span>
        <input
          type="number"
          min={1}
          max={20}
          value={draft.maxRepetitions}
          onChange={(e) => update('maxRepetitions', Number(e.target.value))}
          className="w-24 rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">כלל התקדמות</span>
        <input
          value={draft.advancementRule}
          onChange={(e) => update('advancementRule', e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">מילים להימנע מהן (מופרדות בפסיק)</span>
        <input
          value={draft.avoidWords.join(', ')}
          data-testid="clinician-avoid"
          onChange={(e) =>
            update(
              'avoidWords',
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">הערות</span>
        <textarea
          value={draft.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
          {draft.clinicianApproved ? 'מאושר קלינאית' : 'ממתין לאישור קלינאית'}
        </span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.clinicianApproved}
            onChange={(e) => update('clinicianApproved', e.target.checked)}
          />
          סמן כמאושר
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={save} data-testid="clinician-save">
          שמירה
        </Button>
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
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin}
          data-testid="change-pin-input"
          onChange={(e) => {
            setDone(false);
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
          }}
          placeholder="קוד חדש"
          className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-center text-xl tracking-widest"
        />
        <Button type="submit" variant="secondary" disabled={pin.length !== 4} data-testid="change-pin-submit">
          עדכון קוד
        </Button>
        {done && <span className="text-emerald-600" role="status">עודכן ✓</span>}
      </div>
    </form>
  );
}
