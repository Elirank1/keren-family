import { useState, type ReactNode } from 'react';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Button } from '@/components/ui';
import { SoundBadge } from '@/components/SoundBadge';
import type { RecordingResult } from '@/lib/recorder';
import type { QueueItem } from './tonight';

const PROMPT_LABEL = { isolated_sound: 'צליל', word: 'מילה', sentence: 'משפט' } as const;

// A guided, auto-advancing recording queue: show item → record → stop →
// playback → keep / redo → continue. After a save it advances automatically
// (model mode) or waits for the per-item extra step (baseline rating/note).
export function RecordingQueue({
  items,
  theme,
  saveLabel,
  // Persist one item's recording. Return value (e.g. an attempt id) is passed
  // to renderAfterSave so callers can attach a rating/note.
  onSave,
  // Optional extra UI shown after a save (e.g. baseline rating + note). When
  // provided, the queue does NOT auto-advance; the parent taps "המשך".
  renderAfterSave,
  onComplete,
  onExit,
}: {
  items: QueueItem[];
  theme: 'arena' | 'garden';
  saveLabel?: string;
  onSave: (item: QueueItem, result: RecordingResult) => Promise<unknown> | unknown;
  renderAfterSave?: (item: QueueItem, saved: unknown) => ReactNode;
  onComplete: () => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [savedFor, setSavedFor] = useState<unknown>(null);
  const [justSaved, setJustSaved] = useState(false);

  const item = items[index];
  const total = items.length;

  const advance = () => {
    setSavedFor(null);
    setJustSaved(false);
    if (index + 1 >= total) onComplete();
    else setIndex(index + 1);
  };

  const handleSave = async (result: RecordingResult) => {
    const saved = await onSave(item, result);
    setSavedFor(saved ?? true);
    setJustSaved(true);
    // Auto-advance only when there is no per-item follow-up step.
    if (!renderAfterSave) {
      // brief "kept" beat, then continue automatically
      setTimeout(advance, 650);
    }
  };

  if (!item) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center text-slate-600 shadow-sm">
        אין פריטים בתור.
        <div className="mt-4">
          <Button variant="secondary" onClick={onExit}>חזרה</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="recording-queue">
      {/* progress */}
      <div className="flex items-center justify-between text-sm font-bold text-slate-500">
        <span data-testid="queue-progress">
          פריט {index + 1} מתוך {total}
        </span>
        <div className="flex items-center gap-1" aria-hidden="true">
          {items.map((it, i) => (
            <span
              key={it.key}
              className={`h-2 w-2 rounded-full ${
                i < index ? 'bg-emerald-500' : i === index ? 'bg-indigo-500' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <SoundBadge sound={item.sound} size="sm" />
          <span className="text-xs text-slate-500">{PROMPT_LABEL[item.promptType]}</span>
          <h2 className="text-2xl font-black" data-testid="queue-item-title">{item.title}</h2>
        </div>

        {/* key forces a fresh recorder per item */}
        <AudioRecorder
          key={item.key}
          promptType={item.promptType}
          onSave={handleSave}
          theme={theme}
          saveLabel={saveLabel ?? 'שמירה והמשך'}
        />

        {justSaved && !renderAfterSave && (
          <p className="mt-3 text-center font-bold text-emerald-600" role="status" data-testid="queue-saved">
            נשמר ✓ ממשיכים…
          </p>
        )}

        {justSaved && renderAfterSave && (
          <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4">
            {renderAfterSave(item, savedFor)}
            <Button variant={theme} onClick={advance} data-testid="queue-continue">
              {index + 1 >= total ? 'סיום' : 'המשך לפריט הבא'}
            </Button>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onExit} data-testid="queue-pause">
          ⏸️ עצירה ושמירה
        </Button>
        {!justSaved && (
          <Button variant="ghost" onClick={advance} data-testid="queue-skip">
            דילוג על הפריט →
          </Button>
        )}
      </div>
    </div>
  );
}
