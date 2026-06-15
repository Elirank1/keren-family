import type { PracticeWord } from '@/lib/types';
import { SoundBadge } from './SoundBadge';

// Emoji fallbacks per category so we never show a broken image. The word text
// remains the primary content; the emoji is decorative.
const CATEGORY_EMOJI: Record<string, string> = {
  animals: '🐾',
  home: '🏠',
  people: '👨‍👩‍👧',
  outside: '🌳',
  objects: '🧩',
  games: '🎯',
  events: '🎉',
  fantasy: '👑',
  actions: '🏃',
  numbers: '🔢',
  vehicles: '🚚',
  nature: '🌿',
  music: '🎵',
  food: '🍽️',
  descriptions: '✨',
  time: '🗓️',
  abstract: '💭',
  toys: '🧸',
  names: '🏷️',
};

export function wordEmoji(word: Pick<PracticeWord, 'category'>): string {
  return CATEGORY_EMOJI[word.category] ?? '🔤';
}

export function WordCard({
  word,
  theme = 'arena',
  showNikud = true,
  big = false,
}: {
  word: PracticeWord;
  theme?: 'arena' | 'garden';
  showNikud?: boolean;
  big?: boolean;
}) {
  const display = showNikud && word.textWithNikud ? word.textWithNikud : word.text;
  const bg =
    theme === 'arena'
      ? 'bg-gradient-to-br from-arena-surface to-slate-800 text-white border border-white/10'
      : 'bg-gradient-to-br from-white to-amber-50 text-slate-900 border border-amber-100';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-3xl p-6 ${bg}`}
      data-testid="word-card"
    >
      <div className={big ? 'text-7xl' : 'text-6xl'} aria-hidden="true">
        {wordEmoji(word)}
      </div>
      <div
        className={`text-center font-black leading-tight ${big ? 'text-5xl' : 'text-4xl'}`}
        lang="he"
        dir="rtl"
      >
        {display}
      </div>
      <SoundBadge sound={word.sound} />
    </div>
  );
}
