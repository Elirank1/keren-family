import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { repo, makeDefaultClinicalTarget } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { nowIso } from '@/lib/ids';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type {
  ChildId,
  ClinicalStage,
  ClinicalTargetProfile,
  ClinicianSoundConfig,
  ContrastItem,
  ContrastKind,
  InterventionMode,
  PerceptionStatus,
  PracticeLevel,
  Stimulability,
  SuspectedErrorType,
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

const MODE_LABEL: Record<InterventionMode, string> = {
  unset: 'לא נבחר (תרגול ניטרלי)',
  motor_articulation: 'מוטורי-ארטיקולטורי',
  speech_perception: 'תפיסה שמיעתית',
  minimal_pairs: 'זוגות מינימליים',
  cycles: 'Cycles (מחזורים)',
  integrated: 'משולב',
  custom: 'מותאם אישית',
};
const ERROR_LABEL: Record<SuspectedErrorType, string> = {
  unset: 'לא נבחר',
  distortion: 'עיוות (distortion)',
  substitution: 'החלפה (substitution)',
  omission: 'השמטה (omission)',
  phoneme_collapse: 'קריסת פונמות',
  inconsistent: 'לא עקבי',
  mixed: 'מעורב',
};
const STIM_LABEL: Record<Stimulability, string> = {
  not_checked: 'לא נבדק',
  independent: 'עצמאי',
  after_model: 'אחרי דוגמה',
  not_currently_stimulable: 'לא ניתן לעורר כרגע',
};
const PERCEPTION_LABEL: Record<PerceptionStatus, string> = {
  not_checked: 'לא נבדק',
  discriminates: 'מבחין',
  inconsistent: 'לא עקבי',
  does_not_discriminate: 'לא מבחין',
};
const LEVEL_LABEL: Record<PracticeLevel, string> = {
  unset: 'לא נבחר',
  listening: 'האזנה',
  isolated_sound: 'צליל בודד',
  syllable: 'הברה',
  word: 'מילה',
  phrase: 'צירוף',
  sentence: 'משפט',
  conversation: 'שיחה',
};
const CONTRAST_KIND_LABEL: Record<ContrastKind, string> = {
  true_minimal_pair: 'זוג מינימלי אמיתי',
  near_minimal_pair: 'כמעט-מינימלי (לא זוג אמיתי)',
  listening_contrast: 'ניגוד להאזנה (לא זוג)',
  nonword_contrast: 'ניגוד עם מילת-תפל (לא זוג)',
};
const MODES: InterventionMode[] = [
  'unset',
  'motor_articulation',
  'speech_perception',
  'minimal_pairs',
  'cycles',
  'integrated',
  'custom',
];
const ERROR_TYPES: SuspectedErrorType[] = [
  'unset',
  'distortion',
  'substitution',
  'omission',
  'phoneme_collapse',
  'inconsistent',
  'mixed',
];
const STIMS: Stimulability[] = ['not_checked', 'independent', 'after_model', 'not_currently_stimulable'];
const PERCEPTIONS: PerceptionStatus[] = ['not_checked', 'discriminates', 'inconsistent', 'does_not_discriminate'];
const LEVELS: PracticeLevel[] = ['unset', 'listening', 'isolated_sound', 'syllable', 'word', 'phrase', 'sentence', 'conversation'];

export default function ClinicianArea() {
  const navigate = useNavigate();
  const [childId, setChildId] = useState<ChildId>('lavi');
  const [sound, setSound] = useState<TargetSound>('s');

  const { data, loading, reload } = useAsync(
    async () => {
      const [config, focus, target, contrasts] = await Promise.all([
        repo.getClinicianConfig(childId, sound),
        repo.getWeeklyFocus(childId),
        repo.getClinicalTarget(childId, sound),
        repo.getContrastItems(sound),
      ]);
      return { config, focus, target, contrasts };
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
            <ClinicalTargetCard
              key={`target-${childId}-${sound}`}
              childId={childId}
              sound={sound}
              target={data.target}
              onSaved={reload}
            />
            <ContrastLibraryCard
              key={`contrast-${sound}`}
              sound={sound}
              items={data.contrasts}
            />
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
          <span className="font-bold">מיקום במילה</span>
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

function ClinicalTargetCard({
  childId,
  sound,
  target,
  onSaved,
}: {
  childId: ChildId;
  sound: TargetSound;
  target: ClinicalTargetProfile | undefined;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ClinicalTargetProfile>(
    target ?? makeDefaultClinicalTarget(childId, sound),
  );
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ClinicalTargetProfile>(key: K, value: ClinicalTargetProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };
  const togglePosition = (pos: WordPosition) => {
    setDraft((d) => ({
      ...d,
      targetWordPositions: d.targetWordPositions.includes(pos)
        ? d.targetWordPositions.filter((p) => p !== pos)
        : [...d.targetWordPositions, pos],
    }));
    setSaved(false);
  };
  const save = async () => {
    await repo.setClinicalTarget(draft);
    setSaved(true);
    onSaved();
  };

  const needsContrast = draft.interventionMode === 'minimal_pairs' || draft.interventionMode === 'integrated';
  const isCycles = draft.interventionMode === 'cycles';

  return (
    <section data-testid="clinical-target-card" className="flex flex-col gap-4 rounded-3xl border-2 border-teal-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-black">תכנית התערבות — אופי הקושי והגישה</h3>
        <p className="text-sm text-slate-500">
          האפליקציה לא בוחרת שיטה. עד שתבחרי מצב, התרגול נשאר ניטרלי. אף ערך כאן אינו מוסק אוטומטית.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">מצב התערבות</span>
        <select
          value={draft.interventionMode}
          data-testid="target-mode"
          onChange={(e) => update('interventionMode', e.target.value as InterventionMode)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
      </label>

      {(needsContrast || isCycles) && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status" data-testid="target-gate-note">
          {needsContrast
            ? 'מצב זה ישתמש בפריטי ניגוד רק לאחר שתסמני „פעיל” + „מאושר” לפריטים למטה. אחרת התרגול נשאר ניטרלי.'
            : 'מצב Cycles אינו מופעל לפי גיל. הקשבה ממוקדת ותרגול קצר יופיעו לפי בחירתך בלבד.'}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-bold">אופי השגיאה המשוער</span>
        <select
          value={draft.suspectedErrorType}
          data-testid="target-error"
          onChange={(e) => update('suspectedErrorType', e.target.value as SuspectedErrorType)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          {ERROR_TYPES.map((t) => <option key={t} value={t}>{ERROR_LABEL[t]}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-bold">מה הילד הפיק</span>
          <input
            value={draft.childProduction ?? ''}
            data-testid="target-production"
            onChange={(e) => update('childProduction', e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-bold">המטרה</span>
          <input
            value={draft.intendedTarget ?? ''}
            data-testid="target-intended"
            onChange={(e) => update('intendedTarget', e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-bold">יכולת עירור (stimulability)</span>
          <select
            value={draft.stimulability}
            data-testid="target-stimulability"
            onChange={(e) => update('stimulability', e.target.value as Stimulability)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            {STIMS.map((s) => <option key={s} value={s}>{STIM_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-bold">תפיסה שמיעתית</span>
          <select
            value={draft.perceptionStatus}
            data-testid="target-perception"
            onChange={(e) => update('perceptionStatus', e.target.value as PerceptionStatus)}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            {PERCEPTIONS.map((p) => <option key={p} value={p}>{PERCEPTION_LABEL[p]}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">רמת תרגול נוכחית</span>
        <select
          value={draft.currentPracticeLevel}
          data-testid="target-level"
          onChange={(e) => update('currentPracticeLevel', e.target.value as PracticeLevel)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        >
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-bold">מיקומים למיקוד (במילה)</span>
        <div className="flex gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePosition(p)}
              data-testid={`target-position-${p}`}
              aria-pressed={draft.targetWordPositions.includes(p)}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                draft.targetWordPositions.includes(p) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {POSITION_LABEL[p]}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          מיקום אחד = ריכוז עליו. כמה מיקומים = מעורב (ללא ריכוז). ריק = ברירת מחדל.
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">שיעור ריכוז על המיקוד: {Math.round(draft.weeklyFocusRatio * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={draft.weeklyFocusRatio}
          data-testid="target-ratio"
          onChange={(e) => update('weeklyFocusRatio', Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">ניסוח רמז</span>
        <input
          value={draft.cueText}
          data-testid="target-cue"
          onChange={(e) => update('cueText', e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">הערות</span>
        <textarea
          value={draft.notes}
          data-testid="target-notes"
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.clinicianApproved}
            data-testid="target-approve"
            onChange={(e) => update('clinicianApproved', e.target.checked)}
          />
          מאושר קלינאית
        </label>
        <Button variant="primary" onClick={save} data-testid="target-save">שמירת תכנית</Button>
        {saved && <span className="text-emerald-600" role="status">נשמר ✓</span>}
      </div>
    </section>
  );
}

function ContrastLibraryCard({
  sound,
  items,
}: {
  sound: TargetSound;
  items: ContrastItem[];
}) {
  // Local copy so each toggle is optimistic and does NOT flash a full-page
  // reload spinner (which would also unmount the control mid-interaction).
  const [rows, setRows] = useState<ContrastItem[]>(items);
  const forSound = rows.filter((i) => i.targetSound === sound);

  const toggle = async (item: ContrastItem, patch: Partial<ContrastItem>) => {
    const next = { ...item, ...patch };
    setRows((rs) => rs.map((r) => (r.id === item.id ? next : r)));
    await repo.setContrastItem(next);
  };

  return (
    <section data-testid="contrast-library" className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
      <h3 className="font-black">ספריית ניגודים (זוגות מינימליים)</h3>
      <p className="text-sm text-slate-500">
        מופיע בתרגול רק במצב „זוגות מינימליים” / „משולב”, ורק לפריטים שסומנו „פעיל” + „מאושר”.
        סוג הפריט מצוין במדויק — מה שאינו זוג מינימלי אמיתי לא יוצג ככזה.
      </p>
      {forSound.length === 0 ? (
        <p className="text-sm text-slate-400">אין פריטי ניגוד לצליל זה.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {forSound.map((item) => (
            <li key={item.id} data-testid={`contrast-item-${item.id}`} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-black" lang="he">
                  {item.targetWithNikud ?? item.targetWord} ↔ {item.contrastWithNikud ?? item.contrastWord}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    item.kind === 'true_minimal_pair' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {CONTRAST_KIND_LABEL[item.kind]}
                </span>
              </div>
              {!item.clinicallyReviewed && (
                <p className="mt-1 text-xs text-amber-700">לא נבדק קלינית</p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.clinicallyReviewed}
                    data-testid={`contrast-reviewed-${item.id}`}
                    onChange={(e) => toggle(item, { clinicallyReviewed: e.target.checked })}
                  />
                  נבדק קלינית
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.clinicianApproved}
                    data-testid={`contrast-approve-${item.id}`}
                    onChange={(e) => toggle(item, { clinicianApproved: e.target.checked })}
                  />
                  מאושר
                </label>
                <label className="flex items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    data-testid={`contrast-enable-${item.id}`}
                    onChange={(e) => toggle(item, { enabled: e.target.checked })}
                  />
                  פעיל בתרגול
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
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
