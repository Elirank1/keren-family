// Declarative catalog of generated media for the pipeline.
// Each entry has a stable id, a provider prompt/text, and a target usage that
// the app maps to at runtime via the generated manifest.

export const VOICES = {
  // Energetic male for Lavi's Sound Arena; warm bright female for Niv's Garden.
  lavi: 'IKne3meq5aSn9XLyUdCD', // Charlie — Deep, Confident, Energetic
  niv: 'cgSgspJ2msm6clMCkdW9', // Jessica — Playful, Bright, Warm
  narrator: 'XrExE9yKIg1WjnnlVkGX', // Matilda — upbeat, for neutral lines
};

// Narration lines (ElevenLabs TTS, eleven_multilingual_v2 for Hebrew).
// purpose=game_narration — NEVER a clinical pronunciation model.
export const NARRATION = [
  { id: 'lavi_mission_start', child: 'lavi', voice: 'lavi', text: 'משימת כוח האוויר מתחילה.' },
  { id: 'lavi_power_charging', child: 'lavi', voice: 'lavi', text: 'הכוח נטען.' },
  { id: 'lavi_boss', child: 'lavi', voice: 'lavi', text: 'הגיע אתגר הבוס.' },
  { id: 'lavi_mission_complete', child: 'lavi', voice: 'lavi', text: 'המשימה הושלמה.' },
  { id: 'niv_find_animal', child: 'niv', voice: 'niv', text: 'בוא נמצא את החיה.' },
  { id: 'niv_say_together', child: 'niv', voice: 'niv', text: 'עכשיו אומרים יחד.' },
  { id: 'niv_count', child: 'niv', voice: 'niv', text: 'אחת, שתיים, שלוש.' },
  { id: 'niv_star', child: 'niv', voice: 'niv', text: 'אספנו כוכב צליל.' },
];

// ---- Gemini image generation ----
// Stable per-mode style specs. Original art only — never copy commercial games.
const NO_TEXT = 'No text, no words, no letters, no logos, no watermark.';
const ORIGINAL =
  'Completely original artwork. Do not imitate Brawl Stars or any commercial game characters, maps, icons, or UI.';

const LAVI_STYLE =
  `Energetic, tactical kids game art for a 7-year-old. Bold strong silhouettes, vivid indigo/cyan/amber palette, clean modern vector-illustration with soft glow, nonviolent, friendly. ${ORIGINAL} ${NO_TEXT}`;
const NIV_STYLE =
  `Warm, simple preschool illustration for a 3-year-old. One large central subject, rounded soft shapes, gentle cream/green/amber palette, friendly faces, immediately recognizable. ${ORIGINAL} ${NO_TEXT}`;

export const IMAGES = [
  // Shared — four sound-power icons.
  { id: 'icon_power_s', sound: 's', prompt: `${LAVI_STYLE} A single icon of swirling air / wind power, a coiled friendly air-snake of wind, centered on transparent-like flat background. Square emblem.` },
  { id: 'icon_power_sh', sound: 'sh', prompt: `${LAVI_STYLE} A single icon of a calm quiet wave of energy, a smooth hushed ripple, centered. Square emblem.` },
  { id: 'icon_power_ts', sound: 'ts', prompt: `${LAVI_STYLE} A single icon of a bright sharp spark / sparkle of energy, centered. Square emblem.` },
  { id: 'icon_power_ch', sound: 'ch', prompt: `${LAVI_STYLE} A single icon of a short playful energy burst / pop, centered. Square emblem.` },
  // Lavi arena.
  { id: 'bg_arena', child: 'lavi', prompt: `${LAVI_STYLE} A wide atmospheric Sound Arena background: a futuristic friendly training arena with glowing crystals and energy gates, deep indigo night sky, no characters. Wide 16:9 composition with empty center for UI.` },
  { id: 'hero_lavi', child: 'lavi', prompt: `${LAVI_STYLE} An original abstract sound-powered hero character: a brave friendly figure made of swirling air and light, dynamic confident pose, full body, centered.` },
  { id: 'boss_gate', child: 'lavi', prompt: `${LAVI_STYLE} An original glowing locked portal / sound-gate obstacle, mysterious but not scary, centered.` },
  // Niv garden.
  { id: 'bg_garden', child: 'niv', prompt: `${NIV_STYLE} A wide Animal Sound Garden background: a sunny soft meadow with gentle hills, flowers and a friendly tree, lots of empty sky for UI. Wide 16:9.` },
  { id: 'animal_turtle', child: 'niv', prompt: `${NIV_STYLE} One friendly smiling cartoon turtle, large and centered, waving.` },
  { id: 'animal_bird', child: 'niv', prompt: `${NIV_STYLE} One friendly smiling cartoon little bird, large and centered.` },
  { id: 'sound_star', child: 'niv', prompt: `${NIV_STYLE} One cheerful glowing collectible star with a happy face, centered.` },
];

// Sound effects (ElevenLabs sound-generation). Short, no speech.
export const SFX = [
  { id: 'sfx_air_power', text: 'a short whoosh of swirling air, magical wind power charging up, playful game sound', duration: 1.6 },
  { id: 'sfx_quiet_wave', text: 'a soft gentle calming wave swoosh, soothing, short', duration: 1.6 },
  { id: 'sfx_spark', text: 'a short bright sparkle chime, magical spark, crisp', duration: 1.2 },
  { id: 'sfx_burst', text: 'a short soft pop burst, playful cartoon pop, gentle', duration: 1.0 },
  { id: 'sfx_star_collect', text: 'a cheerful rising star collect chime, kids game reward, twinkle', duration: 1.4 },
  { id: 'sfx_portal_open', text: 'a magical portal opening shimmer, ascending sparkle, short', duration: 2.0 },
  { id: 'sfx_mission_complete', text: 'a triumphant short success fanfare for kids, bright and warm, celebratory', duration: 2.2 },
];
