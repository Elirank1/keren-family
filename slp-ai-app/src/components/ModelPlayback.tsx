import { useEffect, useState } from 'react';
import { repo } from '@/db/repo';
import type { PromptType, TargetSound } from '@/lib/types';
import { Button } from './ui';

// Plays a parent/clinician-recorded example when one exists. We deliberately do
// NOT fall back to browser TTS — there is no official pronunciation model.
export function ModelPlayback({
  sound,
  promptType,
  wordId,
  sentenceId,
  theme = 'arena',
}: {
  sound: TargetSound;
  promptType: PromptType;
  wordId?: string;
  sentenceId?: string;
  theme?: 'arena' | 'garden';
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    (async () => {
      const model = await repo.findModelAudio(sound, promptType, wordId, sentenceId);
      if (!active) return;
      if (!model) {
        setExists(false);
        return;
      }
      const blobRec = await repo.getAudioBlob(model.blobId);
      if (!active) return;
      if (!blobRec) {
        setExists(false);
        return;
      }
      objectUrl = URL.createObjectURL(blobRec.blob);
      setUrl(objectUrl);
      setExists(true);
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sound, promptType, wordId, sentenceId]);

  if (exists === null) return null;

  if (!exists) {
    return (
      <p
        data-testid="model-audio-missing"
        className="rounded-2xl border border-dashed border-current/30 px-4 py-2 text-center text-sm opacity-70"
      >
        עוד לא הוקלטה דוגמה
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2" data-testid="model-audio-present">
      <Button
        variant={theme}
        onClick={() => {
          if (url) {
            const audio = new Audio(url);
            void audio.play();
          }
        }}
      >
        🔊 האזנה לדוגמה
      </Button>
    </div>
  );
}
