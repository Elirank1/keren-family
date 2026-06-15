import { useRouteError, Link } from 'react-router-dom';

export function ErrorScreen() {
  const error = useRouteError() as Error | undefined;
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-white"
    >
      <div className="text-5xl">🌧️</div>
      <h1 className="text-2xl font-black">משהו השתבש</h1>
      <p className="max-w-md text-slate-300">
        אפשר לחזור למסך הבית ולנסות שוב.
      </p>
      {import.meta.env.DEV && error?.message && (
        <pre className="max-w-md overflow-auto rounded bg-black/40 p-3 text-right text-xs text-rose-300">
          {error.message}
        </pre>
      )}
      <Link
        to="/"
        className="rounded-2xl bg-indigo-600 px-6 py-3 text-lg font-bold text-white"
      >
        חזרה לבית
      </Link>
    </div>
  );
}
