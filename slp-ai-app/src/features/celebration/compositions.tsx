// Remotion celebration compositions — frame-driven, self-contained (no external
// assets, since generated art is optional/deferred). Each composition is a pure
// function of the current frame, so it is deterministic and reduced-motion safe
// (the wrapper renders a static frame instead of playing when motion is reduced).
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const ARENA = { bg: '#0f172a', accent: '#6366f1', glow: '#22d3ee', energy: '#f59e0b' };
const GARDEN = { bg: '#fef9f0', accent: '#34d399', sun: '#fbbf24', petal: '#fb7185' };

// Deterministic pseudo-random in [0,1) from an integer seed — no Math.random
// so renders are reproducible frame-to-frame.
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface CelebrationProps {
  /** Color identity of the practiced sound (s / sh / ts / ch). */
  soundColor?: string;
  /** Big emoji shown at the climax (reward emoji from the app). */
  emoji?: string;
}

// ---- Lavi · Arena Power Unlock ----------------------------------------------
// A power core charges, then bursts into an energy ring. Cool/tactical.
export const ArenaPowerUnlock: React.FC<CelebrationProps> = ({ soundColor = ARENA.glow, emoji = '⚡' }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;

  const charge = spring({ frame, fps, config: { damping: 14, mass: 0.6 }, durationInFrames: 30 });
  const coreR = interpolate(charge, [0, 1], [8, 46]);
  const burst = spring({ frame: frame - 30, fps, config: { damping: 12 }, durationInFrames: 40 });
  const ringR = interpolate(burst, [0, 1], [40, Math.min(width, height) * 0.46]);
  const ringOpacity = interpolate(burst, [0, 0.15, 1], [0, 0.9, 0]);
  const emojiScale = spring({ frame: frame - 34, fps, config: { damping: 9 }, durationInFrames: 30 });
  const glowPulse = 0.5 + 0.5 * Math.sin(frame / 4);

  const sparks = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + rand(i) * 0.4;
    const dist = ringR * (0.6 + rand(i + 99) * 0.5);
    const p = interpolate(burst, [0, 1], [0, 1]);
    return {
      x: cx + Math.cos(angle) * dist * p,
      y: cy + Math.sin(angle) * dist * p,
      r: 3 + rand(i + 7) * 4,
      o: interpolate(burst, [0, 0.3, 1], [0, 1, 0]),
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: ARENA.bg, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="55%" stopColor={soundColor} />
            <stop offset="100%" stopColor={ARENA.accent} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={soundColor} strokeWidth={6} opacity={ringOpacity} />
        <circle
          cx={cx}
          cy={cy}
          r={coreR}
          fill="url(#core)"
          opacity={interpolate(emojiScale, [0, 1], [1, 0.35])}
          style={{ filter: `drop-shadow(0 0 ${12 + glowPulse * 16}px ${soundColor})` }}
        />
        {sparks.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={ARENA.energy} opacity={s.o} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          fontSize: Math.min(width, height) * 0.34,
          transform: `scale(${Math.max(0, emojiScale)})`,
          filter: `drop-shadow(0 0 24px ${soundColor})`,
        }}
      >
        {emoji}
      </div>
    </AbsoluteFill>
  );
};

// ---- Niv · Animal Star Celebration ------------------------------------------
// Warm garden: a star drifts down and lands while petals float up. Soft/playful.
export const AnimalStarCelebration: React.FC<CelebrationProps> = ({ emoji = '⭐' }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cx = width / 2;

  const drop = spring({ frame, fps, config: { damping: 11, mass: 0.8 }, durationInFrames: 45 });
  const starY = interpolate(drop, [0, 1], [-height * 0.2, height * 0.42]);
  const starScale = spring({ frame: frame - 6, fps, config: { damping: 8 }, durationInFrames: 35 });
  const bounce = 1 + 0.08 * Math.sin(Math.max(0, frame - 45) / 5) * interpolate(frame, [45, 80], [1, 0], { extrapolateRight: 'clamp' });

  const petals = Array.from({ length: 14 }, (_, i) => {
    const seed = i + 3;
    const sway = Math.sin((frame + i * 12) / 18) * 26;
    const rise = ((frame * (1.4 + rand(seed)) + i * 40) % (height + 80));
    return {
      x: rand(seed) * width + sway,
      y: height - rise,
      size: 14 + rand(seed + 5) * 16,
      rot: (frame * (1 + rand(seed))) % 360,
      char: rand(seed + 1) > 0.5 ? '🌸' : '🌼',
      o: 0.55 + rand(seed + 2) * 0.4,
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: GARDEN.bg, alignItems: 'center', justifyContent: 'center' }}>
      {petals.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            fontSize: p.size,
            opacity: p.o,
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          {p.char}
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          left: cx,
          top: starY,
          fontSize: Math.min(width, height) * 0.3,
          transform: `translate(-50%, -50%) scale(${Math.max(0, starScale) * bounce})`,
          filter: `drop-shadow(0 6px 16px ${GARDEN.sun}aa)`,
        }}
      >
        {emoji}
      </div>
    </AbsoluteFill>
  );
};
