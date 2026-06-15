# Product boundary

SLP-AI is a **home practice companion**, not an autonomous clinician.

## The app may
- Present parent- or clinician-configurable practice content.
- Record child attempts and parent/clinician model audio.
- Organize daily missions per child.
- Support listening, imitation, repetition, and **manual** self/parent rating.
- Track progress and export recordings + progress for later review.

## The app must not
- Diagnose either child.
- Automatically declare pronunciation correct or incorrect.
- Infer a clinical condition.
- Compare the brothers (no leaderboard, no cross-child stats).
- Present tongue-placement instructions as clinical fact.
- Upload recordings to a server or require a cloud account.
- Claim that practice replaces a speech-language pathologist.

## How the boundary is enforced in code
- `RecordingAttempt` has **no** correctness/score field. Ratings are a manual
  enum describing how an attempt *felt* (`independent`, `after_model`, `not_yet`,
  `participated`, `imitated`, `skipped`). A unit test guards against a score field.
- The mission engine never auto-advances the clinical stage; advancement is a
  manual parent/clinician action (`advancementRule` is descriptive text).
- The parent dashboard renders each child independently; there is no comparison view.
- No browser TTS is used as a pronunciation model — only recorded examples play.

## Parent-facing disclaimer (parent mode only)
> המערכת מיועדת לתרגול ביתי ואינה מחליפה הערכה או הנחיה של קלינאית תקשורת.

This disclaimer is never shown in child mode.
