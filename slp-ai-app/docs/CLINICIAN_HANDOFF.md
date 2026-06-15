# Clinician handoff

SLP-AI is currently a **local parent tool**. Every clinical value ships as
*provisional* and is marked "ממתין לאישור קלינאית" until approved. This document
describes what a clinician can configure today and what a future clinician
integration would build on.

## What a clinician can set per child × sound
Editable in the app under **אזור הורים → הגדרות קלינאית** (`ClinicianSoundConfig`):

| Field | Meaning |
|-------|---------|
| `enabled` | Whether this sound is an active practice target. |
| `currentStage` | listening → isolated_sound → syllable → word → phrase → sentence → conversation. **Never auto-advances.** |
| `targetPositions` | initial / medial / final positions to emphasize. |
| `verbalCue` | The spoken cue shown to the parent. |
| `visualCue` | A short visual hint. |
| `maxRepetitions` | Suggested repetitions per item. |
| `advancementRule` | Free text — describes when to move stage (manual). |
| `avoidWords` | Words to exclude from missions (by id or text). |
| `notes` | Free clinician notes. |
| `clinicianApproved` | Marks the config as reviewed. |

## Content approval
- Words and model recordings carry a `clinicianApproved` flag (default `false`).
- Words can be enabled/disabled and edited (text, nikud, difficulty, age bands).
- Model recordings can be marked approved once reviewed.

## Recommended baseline
Use **תמונת פתיחה** per child to capture a dated snapshot (isolated sound +
words, plus a sentence for Lavi) with manual ratings and a parent note. It is a
comparison snapshot, explicitly **not** an assessment.

## Reviewing data offline
Export a ZIP (**ייצוא נתונים**). It contains `manifest.json` (recording index +
MIME), `progress.json` (profiles, sessions, attempts, configs), and `recordings/`.
Attempts reference words/sentences by id and are tagged with `baseline: true`
for snapshot recordings.

## Out of scope today
Automatic speech assessment, a hosted clinician account, and remote sync are not
implemented and are intentionally excluded from V0.1.
