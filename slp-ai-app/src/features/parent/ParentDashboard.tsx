import { Link, useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { computeChildStats, type ChildStats } from '@/lib/stats';
import { Spinner } from '@/components/ui';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { SoundBadge } from '@/components/SoundBadge';
import { setParentUnlocked } from './parentAuth';
import type { AttemptRating } from '@/lib/types';

const RATING_LABEL: Record<AttemptRating, string> = {
  independent: 'עצמאי',
  after_model: 'אחרי דוגמה',
  not_yet: 'עוד לא',
  participated: 'השתתף',
  imitated: 'חיקה',
  skipped: 'דילגנו',
};

const NAV = [
  { to: '/parent/baseline/lavi', label: 'תמונת פתיחה — לביא', icon: '📸' },
  { to: '/parent/baseline/niv', label: 'תמונת פתיחה — ניב', icon: '📸' },
  { to: '/parent/model-audio', label: 'הקלטות דוגמה', icon: '🎙️' },
  { to: '/parent/content', label: 'עריכת תוכן', icon: '✏️' },
  { to: '/parent/clinician', label: 'הגדרות קלינאית', icon: '🩺' },
  { to: '/parent/export', label: 'ייצוא נתונים', icon: '📤' },
];

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { data, loading } = useAsync(async () => {
    const children = await repo.getChildren();
    const stats: Record<string, ChildStats> = {};
    for (const c of children) stats[c.id] = await computeChildStats(c.id);
    return { children, stats };
  }, []);

  if (loading || !data) return <Spinner />;

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black">אזור הורים</h1>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <button
            onClick={() => {
              setParentUnlocked(false);
              navigate('/');
            }}
            className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-bold"
            data-testid="parent-lock"
          >
            🔒 נעילה
          </button>
        </div>
      </header>

      <p className="rounded-2xl bg-white p-3 text-sm text-slate-600 shadow-sm" data-testid="parent-disclaimer">
        המערכת מיועדת לתרגול ביתי ואינה מחליפה הערכה או הנחיה של קלינאית תקשורת.
      </p>

      <Link
        to="/parent/tonight"
        data-testid="open-tonight"
        className="flex items-center gap-4 rounded-3xl bg-gradient-to-l from-indigo-600 to-cyan-600 p-5 text-white shadow-md transition hover:brightness-110"
      >
        <span className="text-4xl" aria-hidden="true">🌙</span>
        <span className="flex-1">
          <span className="block text-xl font-black">הכנה לתרגול הערב</span>
          <span className="block text-sm text-indigo-100">דוגמאות קול, תמונת פתיחה, ובדיקת מכשיר — בכמה דקות</span>
        </span>
        <span className="text-2xl" aria-hidden="true">←</span>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.children.map((child) => {
          const s = data.stats[child.id];
          return (
            <section
              key={child.id}
              data-testid={`dashboard-${child.id}`}
              className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl" aria-hidden="true">
                  {child.id === 'lavi' ? '🦁' : '🐢'}
                </span>
                <h2 className="text-xl font-black">{child.displayName}</h2>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">סשנים שהושלמו</dt>
                  <dd className="text-lg font-bold" data-testid={`sessions-${child.id}`}>
                    {s.sessionsCompleted}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">תרגול אחרון</dt>
                  <dd className="text-lg font-bold">
                    {s.lastPracticeDate
                      ? new Date(s.lastPracticeDate).toLocaleDateString('he-IL')
                      : '—'}
                  </dd>
                </div>
              </dl>
              <div>
                <p className="mb-1 text-sm text-slate-500">צלילים פעילים</p>
                <div className="flex flex-wrap gap-1">
                  {s.enabledSounds.length ? (
                    s.enabledSounds.map((snd) => <SoundBadge key={snd} sound={snd} size="sm" />)
                  ) : (
                    <span className="text-sm text-slate-400">אין</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-slate-500">ניסיונות לפי דירוג</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  {Object.keys(s.ratingCounts).length ? (
                    (Object.entries(s.ratingCounts) as [AttemptRating, number][]).map(
                      ([r, count]) => (
                        <span key={r} className="rounded-full bg-slate-100 px-2 py-1 font-bold">
                          {RATING_LABEL[r]}: {count}
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-slate-400">עדיין אין</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                ניסיונות אחרונים: {s.latestAttempts.length}
              </p>
            </section>
          );
        })}
      </div>

      <nav className="grid gap-2 sm:grid-cols-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.to.split('/').pop()}`}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 font-bold shadow-sm hover:bg-slate-50"
          >
            <span className="text-2xl" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="text-center text-xs text-slate-400">
        אחסון הדפדפן אינו גיבוי. כדאי לייצא את הנתונים מדי פעם.
      </p>
    </main>
  );
}
