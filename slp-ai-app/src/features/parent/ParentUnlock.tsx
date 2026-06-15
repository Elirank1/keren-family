import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repo } from '@/db/repo';
import { setParentUnlocked } from './parentAuth';
import { Button } from '@/components/ui';
import { BackHome } from '@/components/BackHome';

export default function ParentUnlock() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = await repo.getSettings();
    if (settings && pin === settings.parentPin) {
      setParentUnlocked(true);
      navigate('/parent');
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-sm flex-col gap-6 bg-slate-900 px-5 py-8 text-white"
    >
      <BackHome theme="arena" />
      <div className="text-center">
        <div className="text-5xl" aria-hidden="true">🔒</div>
        <h1 className="mt-2 text-2xl font-black">אזור הורים</h1>
        <p className="text-slate-300">יש להזין קוד בן 4 ספרות</p>
      </div>
      <form onSubmit={submit} className="flex flex-col items-center gap-4">
        <label htmlFor="pin" className="sr-only">
          קוד הורה
        </label>
        <input
          id="pin"
          data-testid="pin-input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          value={pin}
          onChange={(e) => {
            setError(false);
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
          }}
          className="w-40 rounded-2xl bg-slate-800 px-4 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:ring-2 focus:ring-amber-400"
        />
        {error && (
          <p role="alert" data-testid="pin-error" className="text-rose-400">
            קוד שגוי. אפשר לנסות שוב.
          </p>
        )}
        <Button type="submit" variant="primary" disabled={pin.length !== 4} data-testid="pin-submit">
          כניסה
        </Button>
      </form>
      <p className="text-center text-xs text-slate-500">
        קוד ברירת מחדל: 2468 — ניתן לשינוי בהגדרות.
      </p>
    </main>
  );
}
