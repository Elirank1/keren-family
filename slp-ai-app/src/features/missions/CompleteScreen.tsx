import { useNavigate, useParams } from 'react-router-dom';
import { repo } from '@/db/repo';
import { useAsync } from '@/lib/useAsync';
import { seedRewards, getMissionMeta } from '@/content';
import { Button, Spinner } from '@/components/ui';
import type { ChildId } from '@/lib/types';

export default function CompleteScreen() {
  const { childId, sessionId } = useParams<{ childId: ChildId; sessionId: string }>();
  const navigate = useNavigate();

  const { data, loading } = useAsync(async () => {
    if (!sessionId) return null;
    return repo.getSession(sessionId);
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (!data || !childId) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <Button onClick={() => navigate('/')}>חזרה לבית</Button>
      </div>
    );
  }

  const reward = seedRewards.find((r) => r.id === data.rewardId);
  const sound = data.sound;

  if (childId === 'lavi') {
    const meta = getMissionMeta('lavi', sound);
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 bg-arena-bg px-5 py-8 text-center text-white"
      >
        <div className="text-7xl" aria-hidden="true">
          {reward?.emoji ?? '🏅'}
        </div>
        <h1 className="text-3xl font-black">{reward?.title ?? 'משימה הושלמה'}</h1>
        <p className="text-slate-300">{reward?.description}</p>
        <div className="rounded-3xl bg-arena-surface p-5">
          <p className="mb-1 text-sm font-bold text-amber-400">משימת עולם אמיתי</p>
          <p className="text-xl font-bold" data-testid="real-world-mission">
            {meta.realWorldMission}
          </p>
        </div>
        <Button variant="arena" onClick={() => navigate('/')} data-testid="complete-home">
          סיום 🏠
        </Button>
      </main>
    );
  }

  // Niv — animal takes three steps, collects a star. No score.
  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 bg-garden-bg px-5 py-8 text-center text-slate-900"
    >
      <div className="text-8xl" aria-hidden="true" data-testid="niv-star">
        {reward?.emoji ?? '⭐'}
      </div>
      <h1 className="text-3xl font-black">{getMissionMeta('niv', sound).encourage}</h1>
      <div className="flex items-center gap-2 text-5xl" aria-hidden="true">
        <span>{getMissionMeta('niv', sound).animal}</span>
        <span>👣👣👣</span>
      </div>
      <button
        onClick={() => navigate('/')}
        data-testid="complete-home"
        className="rounded-full bg-garden-accent px-12 py-6 text-2xl font-black text-white shadow-xl"
      >
        כל הכבוד! 🏠
      </button>
    </main>
  );
}
