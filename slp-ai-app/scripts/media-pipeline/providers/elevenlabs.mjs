// ElevenLabs provider — text-to-speech (Hebrew, multilingual v2) and
// sound-effect generation. Keys come from env; never logged.
const BASE = 'https://api.elevenlabs.io/v1';

export const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

export async function tts({ apiKey, voiceId, text }) {
  const res = await fetch(`${BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function soundEffect({ apiKey, text, durationSeconds }) {
  const res = await fetch(`${BASE}/sound-generation`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: durationSeconds, prompt_influence: 0.45 }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs SFX ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
