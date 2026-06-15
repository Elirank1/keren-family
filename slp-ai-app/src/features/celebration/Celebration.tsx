// Celebration player — lazy-loads Remotion only when a mission completes, so the
// player bundle never touches the critical path. Respects prefers-reduced-motion:
// when motion is reduced (or the player fails to load) it renders a calm static
// frame instead of an animation. Pure visual flourish — never gates navigation.
import { Suspense, lazy, useEffect, useState } from 'react';
import type { CelebrationProps } from './compositions';

type Kind = 'arena' | 'garden';

// Lazy chunk: the Remotion Player + compositions. Split out so it is fetched on
// demand (mission complete) and excluded from the initial app bundle.
const LazyStage = lazy(() => import('./CelebrationStage'));

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Static, motion-free fallback: the climax pose without animation. Used for
// reduced-motion users and while/if the lazy player chunk is unavailable.
function StaticPose({ kind, emoji }: { kind: Kind; emoji: string }) {
  const bg = kind === 'arena' ? '#0f172a' : '#fef9f0';
  const ring = kind === 'arena' ? '#22d3ee' : '#fbbf24';
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        maxWidth: 320,
        margin: '0 auto',
        borderRadius: 24,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `inset 0 0 0 4px ${ring}55`,
      }}
    >
      <span style={{ fontSize: 120, filter: `drop-shadow(0 0 18px ${ring})` }}>{emoji}</span>
    </div>
  );
}

export function Celebration({
  kind,
  emoji,
  soundColor,
}: {
  kind: Kind;
  emoji: string;
  soundColor?: string;
}) {
  const [reduced, setReduced] = useState(true); // default safe until we check
  useEffect(() => setReduced(prefersReducedMotion()), []);

  if (reduced) return <StaticPose kind={kind} emoji={emoji} />;

  const props: CelebrationProps = { emoji, soundColor };
  return (
    <Suspense fallback={<StaticPose kind={kind} emoji={emoji} />}>
      <LazyStage kind={kind} props={props} />
    </Suspense>
  );
}
