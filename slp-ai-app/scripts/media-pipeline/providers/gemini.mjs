// Gemini provider — original image generation (Nano Banana Pro).
// Build-time only. Key from env, never logged or bundled.
const MODEL = 'gemini-3-pro-image-preview';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const GEMINI_IMAGE_MODEL = MODEL;

// Returns a PNG Buffer for the prompt, or throws.
export async function generateImage({ apiKey, prompt }) {
  const res = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini image ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    throw new Error(`Gemini image: no inline image in response: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return Buffer.from(img.inlineData.data, 'base64');
}
