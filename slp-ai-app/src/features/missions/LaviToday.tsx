import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { buildAndSaveMission } from '@/lib/mission-service';
import { getMissionMeta } from '@/content';
import { Spinner } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import { BackHome } from '@/components/BackHome';
import type { TargetSound } from '@/lib/types';

export default function LaviToday() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data, loading } = useAsync(async () => {
    const [enabled, focus] = await Promise.all([
      repo.getEnabledSounds('lavi'),
      repo.getWeeklyFocus('lavi'),
    ]);
    return { enabled, focus };
  }, []);

  if (loading || !data) return <Spinner />;
  const enabledSounds = data.enabled;
  const focusSound = data.focus?.sound;

  const startSound = async (sound: TargetSound) => {
    setBusy(true);
    const mission = await buildAndSaveMission('lavi', sound);
    navigate(`/practice/lavi/${mission.id}`);
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-arena-bg px-5 py-6 text-white">
      <BackHome theme="arena" />
      <header className="flex items-center gap-3">
        <span className="text-5xl" aria-hidden="true">🦁</span>
        <div>
          <h1 className="text-3xl font-black">זירת הצלילים</h1>
          <p className="text-slate-300">המשימה של לביא להיום</p>
        </div>
      </header>

      <section className="rounded-3xl bg-arena-surface p-5">
        <h2 className="mb-3 text-xl font-bold">בחר כוח</h2>
        <div className="grid gap-3">
          {(['s', 'sh', 'ts', 'ch'] as TargetSound[]).map((sound) => {
            const unlocked = enabledSounds.includes(sound);
            const meta = getMissionMeta('lavi', sound);
            const isFocus = unlocked && focusSound === sound;
            return (
              <button
                key={sound}
                disabled={!unlocked || busy}
                onClick={() => startSound(sound)}
                data-testid={`lavi-sound-${sound}`}
                data-focus={isFocus || undefined}
                className={`flex items-center justify-between rounded-2xl p-4 text-right transition ${
                  unlocked
                    ? 'bg-gradient-to-l from-indigo-600 to-cyan-600 hover:brightness-110'
                    : 'cursor-not-allowed bg-slate-700/60 opacity-60'
                } ${isFocus ? 'ring-2 ring-amber-400' : ''}`}
              >
                <span className="flex items-center gap-3">
                  <SoundBadge sound={sound} />
                  <span className="text-lg font-bold">{meta.title}</span>
                  {isFocus && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-900">
                      ⭐ מיקוד השבוע
                    </span>
                  )}
                </span>
                <span className="text-2xl" aria-hidden="true">
                  {unlocked ? '▶️' : '🔒'}
                </span>
              </button>
            );
          })}
        </div>
        {enabledSounds.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            אין כרגע צליל פעיל. אפשר להפעיל צליל באזור ההורים.
          </p>
        )}
      </section>
    </main>
  );
}
