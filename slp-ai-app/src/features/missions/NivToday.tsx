import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { buildAndSaveMission } from '@/lib/mission-service';
import { getMissionMeta } from '@/content';
import { Spinner } from '@/components/ui';
import { BackHome } from '@/components/BackHome';
import type { TargetSound } from '@/lib/types';

export default function NivToday() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data, loading } = useAsync(() => repo.getEnabledSounds('niv'), []);

  if (loading || !data) return <Spinner />;
  // Niv plays only enabled sounds; for V0 that's /s/. Default to the first.
  const sound: TargetSound = data[0] ?? 's';
  const meta = getMissionMeta('niv', sound);

  const start = async () => {
    setBusy(true);
    const mission = await buildAndSaveMission('niv', sound);
    navigate(`/practice/niv/${mission.id}`);
  };

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 bg-garden-bg px-5 py-8 text-slate-900"
    >
      <div className="w-full">
        <BackHome theme="garden" />
      </div>
      <div className="text-center">
        <div className="text-[7rem] leading-none" aria-hidden="true">
          {meta.animal}
        </div>
        <h1 className="mt-2 text-3xl font-black">הגן של ניב</h1>
      </div>
      <button
        onClick={start}
        disabled={busy || data.length === 0}
        data-testid="niv-start"
        className="rounded-full bg-garden-accent px-12 py-8 text-3xl font-black text-white shadow-xl transition hover:brightness-105 disabled:opacity-50"
      >
        ▶️ בוא נשחק
      </button>
      {data.length === 0 && (
        <p className="text-center text-slate-500">אפשר להפעיל צליל באזור ההורים.</p>
      )}
    </main>
  );
}
