import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsync } from '@/lib/useAsync';
import { computeClinicalReport } from '@/lib/clinical-report';
import { buildExportZip, downloadBlob } from '@/lib/export';
import { Button, Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type { AttemptRating, ChildId } from '@/lib/types';

const RATING_LABEL: Record<AttemptRating, string> = {
  independent: 'עצמאי',
  after_model: 'אחרי דוגמה',
  not_yet: 'עוד לא',
  participated: 'השתתף',
  imitated: 'חיקה',
  skipped: 'דילגנו',
};

export default function ClinicianReport() {
  const { childId } = useParams<{ childId: ChildId }>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const { data, loading } = useAsync(async () => {
    if (!childId) return null;
    return computeClinicalReport(childId);
  }, [childId]);

  if (loading) return <Spinner />;
  if (!data || !childId) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-center">
        <Button onClick={() => navigate('/parent/clinician')}>חזרה</Button>
      </main>
    );
  }

  const exportZip = async () => {
    setExporting(true);
    try {
      const blob = await buildExportZip();
      downloadBlob(blob, `slp-ai-report-${childId}.zip`);
    } finally {
      setExporting(false);
    }
  };

  const name = childId === 'lavi' ? 'לביא' : 'ניב';

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent/clinician')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור קלינאי.ת
      </button>
      <header>
        <h1 className="text-2xl font-black">דוח התקדמות — {name}</h1>
        <p className="text-sm text-slate-600">
          סיכום לקלינאית. כל המספרים הם הפקות שתועדו בבית, לפי-ילד בלבד. אינם אבחון.
        </p>
      </header>

      {/* headline numbers */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="סה״כ הפקות" value={data.totalProductions} testid="report-total" />
        <Stat label="סשנים שהושלמו" value={data.sessionsCompleted} />
        <Stat label="פריטי תמונת פתיחה" value={data.baselineCount} />
      </div>
      {data.lastPracticeDate && (
        <p className="text-sm text-slate-500">
          תרגול אחרון: {new Date(data.lastPracticeDate).toLocaleDateString('he-IL')}
        </p>
      )}

      {/* per-sound breakdown */}
      <section className="flex flex-col gap-3">
        <h2 className="font-black">לפי צליל ומיקום בהברה</h2>
        {data.bySound.map((s) => (
          <div key={s.sound} className="rounded-3xl bg-white p-4 shadow-sm" data-testid={`report-sound-${s.sound}`}>
            <div className="mb-2 flex items-center gap-2">
              <SoundBadge sound={s.sound} size="sm" />
              <span className="text-lg font-black">{s.total} הפקות</span>
              {s.baseline > 0 && <span className="text-xs text-slate-400">({s.baseline} בסיס)</span>}
            </div>
            {s.total > 0 ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Pill label="תחילית" value={s.byPosition.initial} />
                <Pill label="אמצעית" value={s.byPosition.medial} />
                <Pill label="סופית" value={s.byPosition.final} />
                <span className="mx-1 text-slate-300">|</span>
                <Pill label="צליל" value={s.byPromptType.isolated_sound} />
                <Pill label="מילה" value={s.byPromptType.word} />
                <Pill label="משפט" value={s.byPromptType.sentence} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">עדיין אין הפקות</p>
            )}
          </div>
        ))}
      </section>

      {/* rating trend */}
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-black">דירוגי הורה</h2>
        {Object.keys(data.byRating).length ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.entries(data.byRating) as [AttemptRating, number][]).map(([r, c]) => (
              <Pill key={r} label={RATING_LABEL[r]} value={c} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">עדיין אין דירוגים</p>
        )}
      </section>

      {/* parent notes */}
      {data.recentNotes.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-black">הערות הורה אחרונות</h2>
          <ul className="flex flex-col gap-2">
            {data.recentNotes.map((n, i) => (
              <li key={i} className="border-r-2 border-teal-300 pr-3 text-sm">
                <span className="font-bold">{n.label}</span> ({n.sound}) — {n.note}
                <span className="block text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString('he-IL')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button variant="primary" onClick={exportZip} disabled={exporting} data-testid="report-export">
        {exporting ? 'מכין…' : '📤 ייצוא דוח מלא (כולל הקלטות) להראות לקלינאית'}
      </Button>
    </main>
  );
}

function Stat({ label, value, testid }: { label: string; value: number; testid?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <div className="text-3xl font-black" data-testid={testid}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 font-bold">
      {label}: {value}
    </span>
  );
}
