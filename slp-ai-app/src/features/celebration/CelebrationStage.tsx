// The actual Remotion Player stage. Imported lazily by Celebration.tsx so the
// Remotion runtime is code-split out of the initial bundle. Plays once.
import { Player } from '@remotion/player';
import { ArenaPowerUnlock, AnimalStarCelebration, type CelebrationProps } from './compositions';

const FPS = 30;
const DURATION = 90; // 3s one-shot

export default function CelebrationStage({
  kind,
  props,
}: {
  kind: 'arena' | 'garden';
  props: CelebrationProps;
}) {
  const Composition = kind === 'arena' ? ArenaPowerUnlock : AnimalStarCelebration;
  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', borderRadius: 24, overflow: 'hidden' }}>
      <Player
        component={Composition}
        inputProps={props}
        durationInFrames={DURATION}
        fps={FPS}
        compositionWidth={320}
        compositionHeight={320}
        style={{ width: '100%' }}
        autoPlay
        loop={false}
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        showVolumeControls={false}
      />
    </div>
  );
}
