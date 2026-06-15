// MediaRecorder wrapper with feature detection and graceful fallbacks.
// Never holds an open microphone between recordings — tracks are stopped on
// every stop()/cancel().

const MIME_PREFERENCE = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
];

export type RecorderSupport =
  | { supported: true }
  | { supported: false; reason: 'no_getusermedia' | 'no_mediarecorder' };

export function detectRecorderSupport(): RecorderSupport {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { supported: false, reason: 'no_getusermedia' };
  }
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return { supported: false, reason: 'no_mediarecorder' };
  }
  return { supported: true };
}

export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  for (const mime of MIME_PREFERENCE) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined; // let the browser choose
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export type RecorderErrorCode =
  | 'permission_denied'
  | 'no_getusermedia'
  | 'no_mediarecorder'
  | 'not_found'
  | 'unknown';

export class RecorderError extends Error {
  code: RecorderErrorCode;
  constructor(code: RecorderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'RecorderError';
  }
}

export const RECORDER_ERROR_HE: Record<RecorderErrorCode, string> = {
  permission_denied: 'אין הרשאה למיקרופון. אפשר להפעיל אותה בהגדרות הדפדפן ולנסות שוב.',
  no_getusermedia: 'הדפדפן הזה לא תומך בהקלטה. אפשר לנסות בספארי או כרום מעודכנים.',
  no_mediarecorder: 'הדפדפן הזה לא תומך בהקלטת קול. אפשר לנסות בדפדפן אחר.',
  not_found: 'לא נמצא מיקרופון במכשיר.',
  unknown: 'משהו השתבש בהקלטה. אפשר לנסות שוב.',
};

// A live recording session. Call stop() to finish, cancel() to discard.
export class ActiveRecording {
  private recorder: MediaRecorder;
  private stream: MediaStream;
  private chunks: Blob[] = [];
  private startedAt: number;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private mimeType: string;
  private settled = false;

  constructor(recorder: MediaRecorder, stream: MediaStream, mimeType: string) {
    this.recorder = recorder;
    this.stream = stream;
    this.mimeType = mimeType;
    this.startedAt = Date.now();
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
  }

  private releaseTracks() {
    for (const track of this.stream.getTracks()) track.stop();
    if (this.maxTimer) {
      clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
  }

  /** Auto-stop callback fires on duration limit; resolves the same promise. */
  armAutoStop(maxMs: number, onAutoStop: () => void) {
    this.maxTimer = setTimeout(() => {
      onAutoStop();
    }, maxMs);
  }

  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (this.settled) {
        reject(new RecorderError('unknown', 'recording already finished'));
        return;
      }
      this.recorder.onstop = () => {
        this.settled = true;
        this.releaseTracks();
        const blob = new Blob(this.chunks, { type: this.mimeType });
        resolve({
          blob,
          mimeType: this.mimeType || blob.type || 'audio/webm',
          durationMs: Date.now() - this.startedAt,
        });
      };
      try {
        if (this.recorder.state !== 'inactive') this.recorder.stop();
        else {
          this.settled = true;
          this.releaseTracks();
          const blob = new Blob(this.chunks, { type: this.mimeType });
          resolve({ blob, mimeType: this.mimeType, durationMs: Date.now() - this.startedAt });
        }
      } catch {
        this.releaseTracks();
        reject(new RecorderError('unknown', 'failed to stop recorder'));
      }
    });
  }

  cancel(): void {
    this.settled = true;
    try {
      if (this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      // ignore
    }
    this.releaseTracks();
  }
}

export async function startRecording(): Promise<ActiveRecording> {
  const support = detectRecorderSupport();
  if (!support.supported) {
    throw new RecorderError(support.reason, RECORDER_ERROR_HE[support.reason]);
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new RecorderError('permission_denied', RECORDER_ERROR_HE.permission_denied);
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new RecorderError('not_found', RECORDER_ERROR_HE.not_found);
    }
    throw new RecorderError('unknown', RECORDER_ERROR_HE.unknown);
  }

  const mime = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch {
    // Fall back to default constructor if the chosen mime fails at runtime.
    recorder = new MediaRecorder(stream);
  }
  const effectiveMime = recorder.mimeType || mime || 'audio/webm';
  recorder.start();
  return new ActiveRecording(recorder, stream, effectiveMime);
}

export const MAX_DURATION_MS: Record<'isolated_sound' | 'word' | 'sentence', number> = {
  isolated_sound: 10_000,
  word: 10_000,
  sentence: 20_000,
};
