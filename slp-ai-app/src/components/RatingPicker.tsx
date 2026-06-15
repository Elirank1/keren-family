import type { AttemptRating } from '@/lib/types';

// Plain-language meaning of each rating, for parents. These describe how the
// attempt SOUNDED to you — never an automatic correctness score.
export const RATING_DESCRIPTION: Record<AttemptRating, string> = {
  independent: 'הפיק את הצליל לבד',
  after_model: 'הצליח אחרי שהראיתם דוגמה',
  not_yet: 'עדיין מתאמן — זה בסדר גמור',
  participated: 'השתתף בכיף',
  imitated: 'חיקה אתכם',
  skipped: 'לא התחשק היום — לגיטימי',
};

// A short legend explaining the rating options in plain Hebrew.
export function RatingLegend({
  options,
}: {
  options: { value: AttemptRating; label: string }[];
}) {
  return (
    <div
      className="w-full rounded-2xl bg-black/5 p-3 text-right text-xs leading-relaxed text-slate-600"
      data-testid="rating-legend"
    >
      <p className="mb-1 font-bold">דירוג ידני — איך זה נשמע לכם, לא ציון אוטומטי:</p>
      <ul className="flex flex-col gap-0.5">
        {options.map((o) => (
          <li key={o.value}>
            <span className="font-bold">{o.label}</span> — {RATING_DESCRIPTION[o.value]}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Manual, age-appropriate self/parent ratings. These describe how an attempt
// FELT — they are never an automatic correctness judgment.
export const LAVI_RATINGS: { value: AttemptRating; label: string }[] = [
  { value: 'independent', label: 'עצמאי' },
  { value: 'after_model', label: 'אחרי דוגמה' },
  { value: 'not_yet', label: 'עוד לא' },
];

export const NIV_RATINGS: { value: AttemptRating; label: string }[] = [
  { value: 'participated', label: 'השתתף' },
  { value: 'imitated', label: 'חיקה' },
  { value: 'skipped', label: 'דילגנו היום' },
];

// Baseline uses slightly different wording per the spec.
export const LAVI_BASELINE_RATINGS: { value: AttemptRating; label: string }[] = [
  { value: 'independent', label: 'עצמאי' },
  { value: 'after_model', label: 'אחרי חיקוי' },
  { value: 'not_yet', label: 'לא הופק כרגע' },
];

export const NIV_BASELINE_RATINGS: { value: AttemptRating; label: string }[] = [
  { value: 'participated', label: 'השתתף' },
  { value: 'imitated', label: 'חיקה' },
  { value: 'skipped', label: 'לא רצה כרגע' },
];

export function RatingPicker({
  options,
  value,
  onChange,
  theme = 'arena',
}: {
  options: { value: AttemptRating; label: string }[];
  value?: AttemptRating;
  onChange: (rating: AttemptRating) => void;
  theme?: 'arena' | 'garden';
}) {
  const activeClass =
    theme === 'arena' ? 'bg-arena-accent text-white' : 'bg-garden-accent text-white';
  const idleClass =
    theme === 'arena'
      ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
      : 'bg-amber-100 text-slate-800 hover:bg-amber-200';
  return (
    <div
      className="flex flex-wrap justify-center gap-2"
      role="radiogroup"
      aria-label="דירוג הניסיון"
      data-testid="rating-picker"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            data-testid={`rating-${opt.value}`}
            className={`rounded-2xl px-4 py-3 text-base font-bold transition ${
              selected ? activeClass : idleClass
            } ${selected ? 'ring-2 ring-amber-400' : ''}`}
          >
            {selected ? '✓ ' : ''}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
