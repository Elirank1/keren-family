# Data model

All data is local (Dexie over IndexedDB, database `slp-ai`, schema v1). Binary
audio is stored once in `audioBlobs` and referenced by id from attempts and model
audio. The UI never queries Dexie directly — it goes through `src/db/repo.ts`.

## Tables (schema v1)
| Table | Key | Notes |
|-------|-----|-------|
| `children` | `id` | `lavi` / `niv` profiles. |
| `sounds` | `id` | `s` / `sh` / `ts` / `ch` definitions. |
| `words` | `id`, idx `sound`, `enabled` | Practice words; parent-editable. |
| `sentences` | `id`, idx `sound` | Boss/sentence content. |
| `missions` | `id`, idx `childId`, `sound` | Exact generated missions (persisted). |
| `sessions` | `id`, idx `childId`, `sound`, `completedAt` | One per run; `childId` may be `siblings`. |
| `attempts` | `id`, idx `childId`, `sound`, `wordId`, `sessionId`, `baseline`, `createdAt` | Child recordings + ratings. |
| `audioBlobs` | `id`, idx `kind` | Binary `Blob`s (`model` / `attempt`). |
| `modelAudio` | `id`, idx `sound`, `promptType`, `wordId`, `sentenceId` | Parent/clinician examples. |
| `clinicianConfigs` | `[childId+sound]` | Provisional clinical config. |
| `settings` | `id` (`singleton`) | Parent PIN, seeded version. |
| `rewards` | `id`, idx `childId`, `sound` | Badge/star definitions. |

## Key types (`src/lib/types.ts`)
- `TargetSound = 's' | 'sh' | 'ts' | 'ch'` — never merged; `שׁ` is never `/s/`.
- `AttemptRating` — manual feeling-rating enum. **No correctness/score field exists.**
- `RecordingAttempt` — `{ childId, sound, wordId?, sentenceId?, promptType,
  recordingBlobId, mimeType, durationMs, rating?, parentNote?, createdAt,
  baseline?, sessionId? }`.
- `GeneratedMission` — `{ id, childId, sound, title, estimatedMinutes, steps[],
  rewardId, createdAt }`; step kinds differ by child (Lavi: briefing/warmup/word/
  sentence/completion; Niv: briefing/listen_choose/say_three/completion).
- `ClinicianSoundConfig` — see [CLINICIAN_HANDOFF.md](CLINICIAN_HANDOFF.md).

## Seeding & migrations
- First launch seeds children, sounds, words, sentences, rewards, and one
  `ClinicianSoundConfig` per child × sound (only `/s/` enabled).
- Re-seeding on a version bump is **add-only**: new seed words/sentences are
  added, existing rows (including parent edits and disables) are never overwritten.
- `db.version(1)` is the baseline; add `db.version(n).upgrade(...)` for future migrations.

## Export shape (ZIP)
```
slp-ai-export/
  manifest.json          # counts + recording index (file, ids, mimeType, durationMs, baseline)
  progress.json          # children, words, sentences, sessions, attempts, modelAudio, clinicianConfigs
  clinician-config.json  # clinician configs only
  recordings/<child>_<sound>_<promptType>_<attemptId>.<ext>
```
