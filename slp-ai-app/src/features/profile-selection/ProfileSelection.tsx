import { useNavigate, Link } from 'react-router-dom';

// Profile selection — the app entry. Three large, distinct choices plus a
// discreet parent entrance. RTL throughout.
export default function ProfileSelection() {
  const navigate = useNavigate();

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-slate-900 px-5 py-8 text-white"
    >
      <header className="text-center">
        <h1 className="text-4xl font-black tracking-tight">SLP-AI</h1>
        <p className="mt-1 text-slate-300">בוחרים מי מתרגל היום</p>
      </header>

      <div className="grid gap-4">
        <button
          onClick={() => navigate('/lavi/today')}
          data-testid="select-lavi"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-l from-indigo-600 to-cyan-500 p-6 text-right shadow-lg shadow-indigo-900/40 transition hover:brightness-110"
        >
          <span className="text-5xl" aria-hidden="true">
            🦁
          </span>
          <span className="flex flex-col">
            <span className="text-3xl font-black">לביא</span>
            <span className="text-lg text-white/90">זירת הצלילים — משימות וכוחות</span>
          </span>
        </button>

        <button
          onClick={() => navigate('/niv/today')}
          data-testid="select-niv"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-l from-emerald-400 to-amber-300 p-6 text-right text-slate-900 shadow-lg transition hover:brightness-105"
        >
          <span className="text-5xl" aria-hidden="true">
            🐢
          </span>
          <span className="flex flex-col">
            <span className="text-3xl font-black">ניב</span>
            <span className="text-lg">גן החיות והצלילים</span>
          </span>
        </button>

        <button
          onClick={() => navigate('/siblings/today')}
          data-testid="select-siblings"
          className="flex items-center gap-4 rounded-3xl bg-gradient-to-l from-fuchsia-500 to-rose-400 p-6 text-right shadow-lg transition hover:brightness-110"
        >
          <span className="text-5xl" aria-hidden="true">
            🤝
          </span>
          <span className="flex flex-col">
            <span className="text-3xl font-black">מצב אחים</span>
            <span className="text-lg text-white/90">משחקים יחד — בלי תחרות</span>
          </span>
        </button>
      </div>

      <div className="mt-auto flex justify-center pt-4">
        <Link
          to="/parent/unlock"
          data-testid="open-parent"
          className="rounded-2xl border border-white/20 px-5 py-3 text-base font-bold text-slate-200 hover:bg-white/10"
        >
          🔒 אזור הורים
        </Link>
      </div>
    </main>
  );
}
