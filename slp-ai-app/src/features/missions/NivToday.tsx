import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { buildAndSaveMission } from '@/lib/mission-service';
import { getMissionMeta } from '@/content';
import { Spinner } from '@/components/ui';
import { BackHome } from '@/components/BackHome';
import type { TargetSound } from '@/lib/types';

// Soft per-sound tile colors (garden palette). Picture-first so a pre-reader
// chooses by animal, never by text.
const TILE_BG: Record<TargetSound, string> = {
  s: 'bg-emerald-200',
  sh: 'bg-sky-200',
  ts: 'bg-amber-200',
  ch: 'bg-rose-200',
};

export default function NivToday() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data, loading } = useAsync(
    async () => ({
      enabled: await repo.getEnabledSounds('niv'),
      focus: await repo.getWeeklyFocus('niv'),
    }),
    [],
  );

  if (loading || !data) return <Spinner />;
  // Keep a stable, friendly order regardless of how configs come back.
  const order: TargetSound[] = ['s', 'sh', 'ts', 'ch'];
  const sounds = order.filter((s) => data.enabled.includes(s));
  const focusSound = data.focus?.sound;

  const start = async (sound: TargetSound) => {
    setBusy(true);
    const mission = await buildAndSaveMission('niv', sound);
    navigate(`/practice/niv/${mission.id}`);
  };

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center gap-6 bg-garden-bg px-5 py-8 text-slate-900"
    >
      <div className="w-full">
        <BackHome theme="garden" />
      </div>
      <h1 className="text-3xl font-black">הגן של ניב</h1>
      <p className="-mt-3 text-slate-500">בחרו חבר 🐾</p>

      {sounds.length === 0 ? (
        <p className="mt-6 text-center text-slate-500">אפשר להפעיל צליל באזור ההורים.</p>
      ) : (
        <div className="grid w-full grid-cols-2 gap-4">
          {sounds.map((sound) => {
            const meta = getMissionMeta('niv', sound);
            const isFocus = focusSound === sound;
            return (
              <button
                key={sound}
                onClick={() => start(sound)}
                disabled={busy}
                data-testid={`niv-sound-${sound}`}
                data-focus={isFocus || undefined}
                aria-label={meta.animalName}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-[2rem] ${TILE_BG[sound]} p-6 shadow-md transition active:scale-95 disabled:opacity-50 ${
                  isFocus ? 'ring-4 ring-amber-400' : ''
                }`}
              >
                {isFocus && (
                  <span className="absolute -top-2 -right-2 text-3xl" aria-hidden="true">
                    ⭐
                  </span>
                )}
                <span className="text-7xl leading-none" aria-hidden="true">
                  {meta.animal}
                </span>
                <span className="text-xl font-black text-slate-700">{meta.animalName}</span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
