import type { TargetSound } from '@/lib/types';

const SOUND_LABEL: Record<TargetSound, { letter: string; name: string; color: string }> = {
  s: { letter: 'ס', name: 'כוח האוויר', color: 'bg-sound-s text-slate-900' },
  sh: { letter: 'שׁ', name: 'כוח השקט', color: 'bg-sound-sh text-white' },
  ts: { letter: 'צ', name: 'כוח הניצוץ', color: 'bg-sound-ts text-slate-900' },
  ch: { letter: 'צ׳', name: 'כוח הפיצוץ', color: 'bg-sound-ch text-white' },
};

export function SoundBadge({
  sound,
  showName = false,
  size = 'md',
}: {
  sound: TargetSound;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = SOUND_LABEL[sound];
  const sizeClass =
    size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'sm' ? 'h-9 w-9 text-base' : 'h-12 w-12 text-xl';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center rounded-2xl font-black ${meta.color} ${sizeClass}`}
        aria-label={`צליל ${meta.letter}`}
      >
        {meta.letter}
      </span>
      {showName && <span className="font-bold">{meta.name}</span>}
    </span>
  );
}

export function soundDisplayName(sound: TargetSound): string {
  return SOUND_LABEL[sound].name;
}
