# SLP-AI

תרגול דיבור ביתי לליווי משפחתי — אפליקציית PWA פרטית בעברית עם RTL מלא.
מנוע תוכן משותף, שתי חוויות שונות לפי גיל (לביא — זירת צלילים, ניב — גן צלילים),
מצב אחים, הקלטות, וכלי הורה.

> **גבול מוצרי:** זהו כלי תרגול ביתי. הוא אינו מאבחן, אינו קובע אם ההגייה נכונה,
> ואינו מחליף קלינאית תקשורת. ראו [docs/PRODUCT_BOUNDARY.md](docs/PRODUCT_BOUNDARY.md).

## Stack
React 18 · TypeScript (strict) · Vite 6 · Tailwind · React Router · Dexie/IndexedDB ·
MediaRecorder · vite-plugin-pwa · Vitest + Testing Library · Playwright.
No backend, no auth, no cloud, no analytics, no automatic speech scoring.

## Commands
```bash
npm install
npm run dev        # dev server
npm run typecheck  # tsc strict
npm run lint       # eslint, 0 warnings
npm test           # vitest unit + component
npm run e2e        # playwright critical flows (run `npm run e2e:install` once)
npm run build      # type-check + production build (+ PWA service worker)
npm run preview    # serve the production build
```

## PWA notes
- Installable (manifest + generated service worker, `autoUpdate`).
- App shell + static assets are precached → usable offline after first load.
- No network writes. A small "זמין אופליין" indicator shows only in parent mode.
- The app requests persistent storage when supported and continues if denied.
- **Browser storage is not a backup.** Export regularly (parent → ייצוא נתונים).

## Replacing / editing seed content
- All content lives in `src/content/*.json` (`children`, `sounds`, `words`,
  `sentences`, `missions`, `rewards`). Nothing is hard-coded in components.
- Edit words at runtime in **אזור הורים → עריכת תוכן** (enable/disable, difficulty,
  text + nikud, age bands, add a word). Parent edits are never overwritten on
  later launches.
- `seed_words_he.json` at the repo root is the source the JSON was generated from.

## Recording model audio
- **אזור הורים → הקלטות דוגמה.** Choose a sound tab, then record an example for
  the isolated sound, a word, or a sentence. Actions: record / play / replace /
  delete / mark approved.
- The child app plays an example only when one exists; otherwise it shows
  "עוד לא הוקלטה דוגמה". Browser TTS is never used as a pronunciation model.

## Exporting data
- **אזור הורים → ייצוא נתונים.**
  - **JSON** — profiles, sessions, attempts, configs (no audio).
  - **ZIP** — `slp-ai-export/` with `manifest.json`, `progress.json`,
    `clinician-config.json`, and `recordings/` (one file per attempt, safe ASCII
    filenames, MIME recorded in the manifest).

## Sounds
Only `/s/` is enabled by default. Enable `sh` / `ts` / `ch` per child in
**אזור הורים → הגדרות קלינאית** (the values are provisional until a clinician approves).

| ID | IPA | כתיב | דוגמה |
|----|-----|------|-------|
| `s` | /s/ | ס, שׂ | סוס, עשית |
| `sh` | /ʃ/ | שׁ | שמש |
| `ts` | /ts/ | צ | צנון |
| `ch` | /tʃ/ | צ׳ | צ׳יפס |

## First manual iPhone test
1. Open the served URL in iPhone Safari; add to Home Screen to install the PWA.
2. Choose **לביא → משימת כוח האוויר**; at the warm-up tap **הקלטה**, allow the
   mic, record, **עצירה**, play it back, then **שמירה**.
3. Force-quit and reopen from the Home Screen; open **אזור הורים** (PIN 2468) and
   confirm the session and recording are still there (tests offline persistence
   + Safari's mp4/m4a MediaRecorder path).

## Docs
- [docs/PRODUCT_BOUNDARY.md](docs/PRODUCT_BOUNDARY.md)
- [docs/CLINICIAN_HANDOFF.md](docs/CLINICIAN_HANDOFF.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [BUILD_LOG.md](BUILD_LOG.md)

## Known limitations
- `sh`/`ts`/`ch` ship disabled and have not been walked end-to-end on device.
- Real iPhone Safari mic capture needs the manual pass above (CI uses Chromium + fake media).
- No import (out of scope for V0.1).
