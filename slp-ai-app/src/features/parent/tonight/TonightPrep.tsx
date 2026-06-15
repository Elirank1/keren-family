import { Link, useNavigate } from 'react-router-dom';
import { useAsync } from '@/lib/useAsync';
import { Spinner } from '@/components/ui';
import { computeReadiness } from './tonight';

function CheckRow({
  ok,
  label,
  detail,
  testid,
}: {
  ok: boolean;
  label: string;
  detail?: string;
  testid: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2" data-testid={testid} data-ok={ok}>
      <span className={`text-xl ${ok ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true">
        {ok ? '✓' : '○'}
      </span>
      <span className="flex-1 font-bold">{label}</span>
      {detail && <span className="text-sm text-slate-500">{detail}</span>}
    </li>
  );
}

export default function TonightPrep() {
  const navigate = useNavigate();
  const { data, loading } = useAsync(() => computeReadiness(), []);

  if (loading || !data) return <Spinner />;

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>

      <header className="rounded-3xl bg-gradient-to-l from-indigo-600 to-cyan-600 p-6 text-white shadow-md">
        <h1 className="text-3xl font-black">הכנה לתרגול הערב</h1>
        <p className="mt-1 text-indigo-100">
          כמה דקות עכשיו = תרגול חלק עם לביא וניב הערב.
        </p>
      </header>

      {/* Two guided batch actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/parent/tonight/model"
          data-testid="tonight-model"
          className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <span className="text-3xl" aria-hidden="true">🎙️</span>
          <h2 className="text-xl font-black">הקלטת דוגמאות</h2>
          <p className="text-sm text-slate-600">
            הצליל, מילים ומשפט — בתור אחד, רץ אוטומטית. דקות ספורות לחבילת קול.
          </p>
        </Link>
        <Link
          to="/parent/tonight/baseline"
          data-testid="tonight-baseline"
          className="flex flex-col gap-2 rounded-3xl bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <span className="text-3xl" aria-hidden="true">📸</span>
          <h2 className="text-xl font-black">תמונת פתיחה</h2>
          <p className="text-sm text-slate-600">
            הקלטת בסיס להשוואה עתידית — לכל ילד וצליל. אפשר לעצור ולהמשיך.
          </p>
        </Link>
      </div>

      {/* Tonight checklist */}
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-xl font-black">צ׳קליסט מוכנות</h2>
        <ul className="divide-y divide-slate-100">
          <CheckRow
            testid="check-model"
            ok={data.modelAudioReady}
            label="דוגמאות קול מוכנות"
            detail={data.modelAudioCount ? `${data.modelAudioCount} הקלטות` : 'אין עדיין'}
          />
          <CheckRow
            testid="check-baseline"
            ok={data.baselineReady}
            label="תמונת פתיחה מוכנה"
            detail={`לביא ${data.baselineByChild.lavi} · ניב ${data.baselineByChild.niv}`}
          />
          <CheckRow
            testid="check-mission"
            ok={data.firstMissionReady}
            label="משימה ראשונה מוכנה"
            detail="כל ארבעת הצלילים פעילים"
          />
          <CheckRow
            testid="check-mic"
            ok={data.micSupported}
            label="מיקרופון נתמך"
            detail={data.micSupported ? 'תקין' : 'לא נתמך בדפדפן'}
          />
          <CheckRow
            testid="check-storage"
            ok={data.storageOk}
            label="אחסון מקומי תקין"
            detail={data.storageOk ? 'כתיבה/קריאה הצליחו' : 'בעיה באחסון'}
          />
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link to="/parent/diagnostics" data-testid="tonight-diagnostics" className="rounded-2xl bg-slate-100 px-4 py-2 font-bold hover:bg-slate-200">
            🩺 בדיקת מכשיר (אייפון)
          </Link>
          <Link to="/parent/export" className="rounded-2xl bg-slate-100 px-4 py-2 font-bold hover:bg-slate-200">
            📤 תזכורת: ייצוא נתונים
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        כל ההקלטות נשמרות מקומית במכשיר בלבד. אחסון הדפדפן אינו גיבוי — כדאי לייצא מדי פעם.
      </p>
    </main>
  );
}
