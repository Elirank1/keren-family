import { useState } from 'react';
import { isMuted, setMuted } from '@/lib/media';

// Small game-audio mute control. Game audio (narration + SFX) is optional and
// always user-controllable; it never affects recordings or model examples.
export function MuteToggle({ theme = 'arena' }: { theme?: 'arena' | 'garden' }) {
  const [muted, setM] = useState(isMuted());
  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setM(next);
  };
  const cls =
    theme === 'arena'
      ? 'text-slate-200 hover:bg-white/10'
      : 'text-slate-600 hover:bg-black/5';
  return (
    <button
      onClick={toggle}
      data-testid="mute-toggle"
      aria-pressed={muted}
      aria-label={muted ? 'הפעלת קול' : 'השתקת קול'}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${cls}`}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
