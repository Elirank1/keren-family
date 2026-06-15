import { Link } from 'react-router-dom';

export function BackHome({ theme = 'arena' }: { theme?: 'arena' | 'garden' }) {
  const cls =
    theme === 'arena'
      ? 'text-slate-300 hover:bg-white/10'
      : 'text-slate-600 hover:bg-black/5';
  return (
    <Link
      to="/"
      data-testid="back-home"
      aria-label="חזרה לבחירת פרופיל"
      className={`inline-flex w-fit items-center gap-1 rounded-2xl px-3 py-2 text-base font-bold ${cls}`}
    >
      → בית
    </Link>
  );
}
