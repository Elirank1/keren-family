import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'arena' | 'garden';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
  ghost: 'bg-transparent text-current hover:bg-black/10 dark:hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  arena: 'bg-arena-accent text-white hover:brightness-110 shadow-lg shadow-indigo-900/40',
  garden: 'bg-garden-accent text-white hover:brightness-105 shadow-md',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl p-5 shadow-sm ${className}`}>{children}</div>
  );
}

export function Spinner({ label = 'טוען…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-300" role="status">
      <span className="animate-pulse text-xl">{label}</span>
    </div>
  );
}
