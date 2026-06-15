# SLP-AI — Build Log

## V0.1 — first vertical slice

### Assumptions
- Single-family, fully local app. No backend, no auth, no cloud (per spec).
- Seed content imported from `seed_words_he.json` (51 words across `s`/`sh`/`ts`/`ch`).
- Only `/s/` is enabled by default for both children (first vertical slice). The
  other three sounds exist in content + engine and can be enabled per child in
  the clinician settings screen.
- Parent PIN defaults to `2468`, editable under clinician settings.
- ZIP export is implemented dependency-free (store-only writer in `src/lib/zip.ts`)
  to avoid adding a compression library outside the approved stack.
- Browser TTS is intentionally NOT used as a pronunciation model. When no model
  recording exists the app shows "עוד לא הוקלטה דוגמה".

### Completed
- Scaffold: Vite + React 18 + TS strict + Tailwind + React Router + Dexie + vite-plugin-pwa.
- Domain model + types (`src/lib/types.ts`), Dexie schema v1 with migration scaffold.
- Repository layer (`src/db/repo.ts`) — UI never queries Dexie directly.
- Seed-on-first-launch with add-only re-seed that never overwrites parent edits.
- Data-driven content (`src/content/*.json`) — no words/sentences hard-coded in components.
- Pure mission engine (`src/lib/mission-engine.ts`) with deterministic seeded RNG:
  age-band filter, avoided-words filter, position mixing, ≤2 duplicates,
  model-audio preference, distinct Lavi vs Niv structures.
- Reusable recorder (`src/lib/recorder.ts` + `AudioRecorder.tsx`): feature
  detection, MIME fallback order, auto-stop at duration limits, track release on
  stop/cancel/unmount, Hebrew error states for denial / unsupported / no-device.
- Profile selection (RTL) with Lavi / Niv / siblings + parent entrance.
- Lavi Sound Arena `/s/` vertical slice: briefing → warm-up → 6 word rounds →
  boss sentence → completion (badge + real-world mission).
- Niv Animal Sound Garden `/s/` slice: greeting → listen&choose → say-it-3-times →
  star completion. No loss states, no negative feedback.
- Sibling mode: Niv word turn + Lavi sentence turn, shared family meter, separate
  attempts stored per child, one shared session referencing both. No leaderboard.
- Baseline flow per child (isolated sound + words + Lavi sentence) with manual
  rating + parent note, tagged `baseline: true`.
- Parent area (PIN-gated): dashboard (per-child stats, no comparison), model-audio
  manager (record/play/replace/delete/approve), content editor (enable/disable,
  difficulty, text/nikud, age bands, add word), clinician placeholder (full
  `ClinicianSoundConfig` editor + PIN change), export (JSON + full ZIP).
- PWA: manifest, generated service worker, app-shell precache, offline-ready.
- Accessibility: 44px targets, visible focus, reduced-motion support, RTL, semantic roles.

### Tests
- Unit/component (Vitest, 23 tests, all pass): taxonomy distinctness, mission
  engine filters/dedup/determinism/structure, attempts stay per-child, no
  auto-correctness field, blob deletion, seeding rules, RTL profile render,
  recorder-unsupported state, model-audio fallback, Niv no-negative-feedback,
  parent PIN gate.
- Playwright (6 critical flows, all pass, fake media device):
  1. Lavi `/s/` mission with a real recording → completion + persisted session.
  2. Niv simplified mission, asserts no banned negative words.
  3. Parent model audio recorded → persists across reload.
  4. Baseline recorded → persists across reload.
  5. Sibling mission → separate attempts + exactly one shared session.
  6. Export JSON has expected top-level keys.

### Validation commands
- `npm run typecheck` — passes (tsc strict, project refs).
- `npm run lint` — passes, 0 warnings.
- `npm test` — 23/23 pass.
- `npm run e2e` — 6/6 pass.
- `npm run build` — passes; PWA SW generated.

### Loop log
- Loop 1: scaffolded + implemented full slice. Fixed: `@types/node` missing;
  vitest 2 pulled a second vite (type clash) → upgraded vitest to v3 to dedupe;
  mission-meta union narrowed via typed overloads; zip Blob typing cast;
  vitest config split into `vitest.config.ts`.
- Loop 2: browser walkthrough at 390×844 — verified profile select, Lavi full
  mission (briefing→warmup→words→boss→completion), Niv full mission, parent
  dashboard, reload persistence. Mic denial in preview Chromium showed the
  graceful Hebrew error (expected).
- Loop 3: wrote tests. Fixed jsdom Blob.arrayBuffer (FileReader), flaky e2e skip
  loop (settle wait), and a baseline read-before-save race (wait for rating picker).
- Loop 4: product-quality pass. Fixed dark-on-dark parent inputs (OS dark
  color-scheme leaking into form controls) → pinned `color-scheme: light`.
  Silenced React Router v7 future-flag console warnings via router/provider
  future flags. Re-verified screens at 360/390/1440 widths (no overflow/clipping).
- Final: full suite (typecheck, lint, 23 unit, build, 6 e2e) green **twice
  consecutively** with no code changes between the two runs.

### Known limitations / risks
- Sounds `sh`/`ts`/`ch` ship disabled; enable per child in clinician settings.
  Their missions/words/sentences exist but have not been walked end-to-end on device.
- Model audio is parent/clinician-recorded only; no TTS by design.
- Browser storage is not a backup — export reminder shown in parent mode.
- Safari MediaRecorder produces mp4/m4a; export maps MIME → extension accordingly.
- Playwright run uses Chromium with fake media; real iPhone Safari mic capture
  still needs a manual pass (see README "First manual iPhone test").

---

## Phase 2 — Integrate & Deploy

### Loop 0 + 1 (live)
- **Live URL:** https://elirank1.github.io/keren-family/slp-ai/
- **Repo:** github.com/Elirank1/keren-family · branch `main` · Pages from `gh-pages`
- **Baseline tag:** `slp-ai-v0.1-stable`
- **main commit:** be072f5 · **gh-pages commit:** 0843320
- Integrated as `slp-ai-app/` (source) + built `slp-ai/` (served). Switched to
  HashRouter + `DEPLOY_BASE=/keren-family/slp-ai/`; service worker scoped to the
  subpath only. Launcher card added (לביא · ניב · מצב אחים).
- Verified on the deployed URL (Playwright, 390×844): profile → Lavi `/s/` →
  briefing, hash routing `#/practice/...`, zero console errors. App assets,
  manifest, sw.js all 200. Existing games (taki, launcher) still 200 — untouched.
- Local suite before deploy: typecheck, lint, 23 unit, build, 6 e2e all green
  (e2e re-verified after the HashRouter switch).
- Enrichment keys available locally: GEMINI_API_KEY, ELEVENLABS_API_KEY (no HeyGen).

## 2026-06-15 — Enrichment loop status

- ✅ ElevenLabs narration (8) + SFX (7) generated, wired (media.ts, MuteToggle,
  playClip in Practice/Complete), committed, deployed to gh-pages, verified live
  (manifest 200, all mp3 200, zero console errors at 390×844).
- ⛔ Gemini image generation BLOCKED: project returns 403 PERMISSION_DENIED on
  image `generateContent` ("Your project has been denied access"). Text models
  list/work fine; the image-output capability is gated on this API project.
  ACTION NEEDED (Eliran): enable image access for the Gemini API key's project
  (AI Studio billing / image-model allowlist), then re-run
  `node scripts/media-pipeline/generate-images.mjs`. App degrades gracefully
  (emoji + CSS) so no live regression — enrichment deferred, not blocking.
- ▶️ Proceeding with Remotion completion moments (no external API) meanwhile.
