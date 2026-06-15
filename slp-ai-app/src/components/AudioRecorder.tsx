import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveRecording,
  detectRecorderSupport,
  MAX_DURATION_MS,
  RecorderError,
  RECORDER_ERROR_HE,
  startRecording,
  type RecordingResult,
} from '@/lib/recorder';
import type { PromptType } from '@/lib/types';
import { Button } from './ui';

type Phase = 'idle' | 'requesting' | 'recording' | 'recorded' | 'error';

export interface AudioRecorderProps {
  promptType: PromptType;
  // Called when the user confirms (saves) a recording.
  onSave: (result: RecordingResult) => void | Promise<void>;
  theme?: 'arena' | 'garden';
  /** Optional label shown above the controls. */
  label?: string;
  saveLabel?: string;
}

export function AudioRecorder({
  promptType,
  onSave,
  theme = 'arena',
  label,
  saveLabel = 'שמירה',
}: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  const activeRef = useRef<ActiveRecording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxMs = MAX_DURATION_MS[promptType];

  const support = detectRecorderSupport();

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const revokeUrl = useCallback(() => {
    setPlayUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  // Clean up on unmount: never leave a microphone open between screens.
  useEffect(() => {
    return () => {
      clearTick();
      activeRef.current?.cancel();
      activeRef.current = null;
      revokeUrl();
    };
  }, [revokeUrl]);

  const finalize = useCallback(
    (rec: RecordingResult) => {
      clearTick();
      activeRef.current = null;
      setResult(rec);
      revokeUrl();
      setPlayUrl(URL.createObjectURL(rec.blob));
      setPhase('recorded');
    },
    [revokeUrl],
  );

  const handleStop = useCallback(async () => {
    const active = activeRef.current;
    if (!active) return;
    try {
      const rec = await active.stop();
      finalize(rec);
    } catch {
      setError(RECORDER_ERROR_HE.unknown);
      setPhase('error');
      clearTick();
    }
  }, [finalize]);

  const handleStart = useCallback(async () => {
    setError(null);
    setPhase('requesting');
    try {
      const active = await startRecording();
      activeRef.current = active;
      setElapsed(0);
      setPhase('recording');
      const startedAt = Date.now();
      tickRef.current = setInterval(() => {
        setElapsed(Date.now() - startedAt);
      }, 100);
      // Auto-stop at the duration limit.
      active.armAutoStop(maxMs, () => {
        void handleStop();
      });
    } catch (err) {
      const code = err instanceof RecorderError ? err.code : 'unknown';
      setError(RECORDER_ERROR_HE[code]);
      setPhase('error');
    }
  }, [maxMs, handleStop]);

  const handleReRecord = useCallback(() => {
    revokeUrl();
    setResult(null);
    setPhase('idle');
    setElapsed(0);
  }, [revokeUrl]);

  const handleSave = useCallback(async () => {
    if (result) await onSave(result);
  }, [result, onSave]);

  if (!support.supported) {
    return (
      <div
        role="alert"
        data-testid="recorder-unsupported"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-slate-900"
      >
        {RECORDER_ERROR_HE[support.reason]}
      </div>
    );
  }

  const seconds = (elapsed / 1000).toFixed(1);
  const maxSeconds = Math.round(maxMs / 1000);

  return (
    <div className="flex flex-col items-center gap-3" data-testid="audio-recorder">
      {label && <p className="text-center text-lg font-bold">{label}</p>}

      {phase === 'idle' && (
        <Button
          variant={theme}
          onClick={handleStart}
          data-testid="record-start"
          aria-label="התחלת הקלטה"
        >
          🎙️ הקלטה
        </Button>
      )}

      {phase === 'requesting' && (
        <p className="text-slate-300" role="status">
          מבקש הרשאת מיקרופון…
        </p>
      )}

      {phase === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center gap-2 text-rose-400"
            role="status"
            aria-live="polite"
            data-testid="recording-indicator"
          >
            <span className="recording-dot inline-block h-4 w-4 rounded-full bg-rose-500" />
            <span className="font-mono text-lg" aria-label="זמן הקלטה">
              {seconds}s / {maxSeconds}s
            </span>
          </div>
          <Button variant="danger" onClick={handleStop} data-testid="record-stop">
            ⏹️ עצירה
          </Button>
        </div>
      )}

      {phase === 'recorded' && playUrl && (
        <div className="flex w-full flex-col items-center gap-3">
          <audio
            controls
            src={playUrl}
            data-testid="recording-playback"
            className="w-full max-w-xs"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" onClick={handleReRecord} data-testid="record-redo">
              🔁 הקלטה מחדש
            </Button>
            <Button variant="ghost" onClick={handleReRecord} data-testid="record-delete">
              🗑️ מחיקה
            </Button>
            <Button variant={theme} onClick={handleSave} data-testid="record-save">
              ✅ {saveLabel}
            </Button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <p
            role="alert"
            data-testid="recorder-error"
            className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-center text-rose-900"
          >
            {error}
          </p>
          <Button variant="secondary" onClick={handleStart} data-testid="record-retry">
            נסה שוב
          </Button>
        </div>
      )}
    </div>
  );
}
