import { test, expect } from '@playwright/test';
import { freshHome, recordAndSave, readStore } from './helpers';

test.describe('SLP-AI critical flows', () => {
  test('1. Lavi /s/ mission completes with a real recording', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-lavi').click();
    await page.getByTestId('lavi-sound-s').click();
    await expect(page.getByTestId('briefing-start')).toBeVisible();
    await page.getByTestId('briefing-start').click();

    // Warm-up: record a real isolated attempt, then rate and continue.
    await recordAndSave(page);
    await page.getByTestId('rating-independent').click();
    await page.getByTestId('continue-step').click();

    // Skip the remaining word rounds + boss to reach completion. Wait for the
    // step to settle between clicks so we never click a re-rendering button.
    for (let i = 0; i < 10; i++) {
      if (await page.getByTestId('real-world-mission').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('skip-step');
      if (!(await skip.isVisible().catch(() => false))) break;
      await skip.click();
      await page.waitForTimeout(250);
    }
    await expect(page.getByTestId('real-world-mission')).toBeVisible();

    const attempts = await readStore<{ childId: string }>(page, 'attempts');
    expect(attempts.filter((a) => a.childId === 'lavi').length).toBeGreaterThanOrEqual(1);
    const sessions = await readStore<{ childId: string }>(page, 'sessions');
    expect(sessions.some((s) => s.childId === 'lavi')).toBe(true);
  });

  test('2. Niv simplified mission completes with no negative feedback', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-niv').click();
    await page.getByTestId('niv-sound-s').click();
    await page.getByTestId('niv-greeting-start').click();

    // Auditory bombardment (passive listening) precedes producing.
    await page.getByTestId('bombard-continue').click();

    // Choose the correct word (its testid is the target word id from the title).
    const choice = page.locator('[data-testid^="niv-choice-"][data-correct="true"]');
    await choice.click();

    // say_three → skip to completion.
    await page.getByTestId('skip-step').click();
    await expect(page.getByTestId('niv-star')).toBeVisible();

    // No banned negative words anywhere in the Niv flow.
    const body = await page.locator('body').innerText();
    for (const banned of ['טעית', 'לא נכון', 'נכשלת']) {
      expect(body).not.toContain(banned);
    }
  });

  test('3. Parent model audio persists across reload', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('open-parent').click();
    await page.getByTestId('pin-input').fill('2468');
    await page.getByTestId('pin-submit').click();
    await expect(page.getByTestId('parent-disclaimer')).toBeVisible();

    await page.getByTestId('nav-model-audio').click();
    await expect(page.getByTestId('model-sound-s')).toBeVisible();
    // Record a model for the isolated sound row.
    await recordAndSave(page, page.getByTestId('model-row-iso'));
    await expect(page.getByTestId('model-status-iso')).toBeVisible();

    const before = await readStore(page, 'modelAudio');
    expect(before.length).toBeGreaterThanOrEqual(1);

    await page.reload();
    await expect(page.getByTestId('model-status-iso')).toBeVisible();
    const after = await readStore(page, 'modelAudio');
    expect(after.length).toBe(before.length);
  });

  test('4. Baseline saves and persists across reload', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('open-parent').click();
    await page.getByTestId('pin-input').fill('2468');
    await page.getByTestId('pin-submit').click();
    await page.getByTestId('nav-niv').click(); // baseline — ניב

    const firstPrompt = page.locator('[data-testid^="baseline-prompt-"]').first();
    await expect(firstPrompt).toBeVisible();
    await firstPrompt.getByTestId('record-start').click();
    await expect(firstPrompt.getByTestId('recording-indicator')).toBeVisible();
    await firstPrompt.getByTestId('record-stop').click();
    await expect(firstPrompt.getByTestId('recording-playback')).toBeVisible();
    await firstPrompt.getByTestId('record-save').click();
    // The rating picker only appears once the attempt has been persisted.
    await expect(firstPrompt.getByTestId('rating-picker')).toBeVisible();

    const baselineAttempts = await readStore<{ baseline?: boolean }>(page, 'attempts');
    expect(baselineAttempts.some((a) => a.baseline === true)).toBe(true);

    await page.reload();
    const after = await readStore<{ baseline?: boolean }>(page, 'attempts');
    expect(after.some((a) => a.baseline === true)).toBe(true);
  });

  test('5. Sibling mission stores separate attempts and one shared session', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-siblings').click();
    await page.getByTestId('siblings-start').click();

    // Niv turn — record.
    await recordAndSave(page);
    // Lavi turn — record.
    await recordAndSave(page);
    await expect(page.getByTestId('siblings-home')).toBeVisible();

    const attempts = await readStore<{ childId: string; sessionId?: string }>(page, 'attempts');
    expect(attempts.some((a) => a.childId === 'niv')).toBe(true);
    expect(attempts.some((a) => a.childId === 'lavi')).toBe(true);

    const sessions = await readStore<{ childId: string; participantChildIds?: string[] }>(
      page,
      'sessions',
    );
    const shared = sessions.filter((s) => s.childId === 'siblings');
    expect(shared.length).toBe(1);
    expect(shared[0].participantChildIds?.sort()).toEqual(['lavi', 'niv']);

    // No leaderboard / comparison text.
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('מנצח');
  });

  test('6. Export JSON contains the expected top-level keys', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('open-parent').click();
    await page.getByTestId('pin-input').fill('2468');
    await page.getByTestId('pin-submit').click();
    await page.getByTestId('nav-export').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-json').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    for (const key of ['app', 'children', 'sessions', 'attempts', 'words', 'clinicianConfigs']) {
      expect(json).toHaveProperty(key);
    }
    expect(json.app).toBe('SLP-AI');
  });

  test('7. All four sounds are active and a /ʃ/ (sh) mission completes for Lavi', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-lavi').click();

    // Every target sound is unlocked (enabled), not just /s/.
    for (const sound of ['s', 'sh', 'ts', 'ch']) {
      await expect(page.getByTestId(`lavi-sound-${sound}`)).toBeEnabled();
    }

    // Drive a non-/s/ sound end to end to prove activation is real.
    await page.getByTestId('lavi-sound-sh').click();
    await expect(page.getByTestId('briefing-start')).toBeVisible();
    await page.getByTestId('briefing-start').click();
    await recordAndSave(page);
    await page.getByTestId('rating-independent').click();
    await page.getByTestId('continue-step').click();
    for (let i = 0; i < 10; i++) {
      if (await page.getByTestId('real-world-mission').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('skip-step');
      if (!(await skip.isVisible().catch(() => false))) break;
      await skip.click();
      await page.waitForTimeout(250);
    }
    await expect(page.getByTestId('real-world-mission')).toBeVisible();

    const sessions = await readStore<{ childId: string; sound: string }>(page, 'sessions');
    expect(sessions.some((s) => s.childId === 'lavi' && s.sound === 'sh')).toBe(true);
  });

  test('8. All four sounds are active for Niv', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-niv').click();
    for (const sound of ['s', 'sh', 'ts', 'ch']) {
      await expect(page.getByTestId(`niv-sound-${sound}`)).toBeEnabled();
    }
  });

  async function openParent(page: import('@playwright/test').Page) {
    await page.getByTestId('open-parent').click();
    await page.getByTestId('pin-input').fill('2468');
    await page.getByTestId('pin-submit').click();
  }

  test('9. Tonight prep: model-audio queue records provisional model audio and auto-advances', async ({ page }) => {
    await freshHome(page);
    await openParent(page);
    await page.getByTestId('open-tonight').click();

    // Checklist starts empty for model audio.
    await expect(page.getByTestId('check-model')).toHaveAttribute('data-ok', 'false');

    await page.getByTestId('tonight-model').click();
    await expect(page.getByTestId('model-provisional-note')).toBeVisible();
    await page.getByTestId('model-pick-sh').click();

    // First queue item (isolated sound), record → auto-advance to item 2.
    await expect(page.getByTestId('queue-progress')).toContainText('פריט 1');
    await recordAndSave(page);
    await expect(page.getByTestId('queue-progress')).toContainText('פריט 2', { timeout: 5000 });

    // Model audio is stored provisional (clinicianApproved=false).
    const models = await readStore<{ clinicianApproved: boolean; sound: string }>(page, 'modelAudio');
    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(models.every((m) => m.clinicianApproved === false)).toBe(true);

    // Back on the hub the checklist now shows model audio ready.
    await page.getByTestId('queue-pause').click();
    await expect(page.getByTestId('check-model')).toHaveAttribute('data-ok', 'true');
  });

  test('10. Tonight prep: baseline queue stores a baseline attempt with a rating', async ({ page }) => {
    await freshHome(page);
    await openParent(page);
    await page.getByTestId('open-tonight').click();
    await page.getByTestId('tonight-baseline').click();
    await expect(page.getByTestId('baseline-disclaimer')).toContainText('לא אבחון קליני');

    await page.getByTestId('baseline-child-lavi').click();
    await page.getByTestId('baseline-pick-ts').click();
    await recordAndSave(page);
    // Baseline waits for a rating before continuing.
    await page.getByTestId('rating-independent').click();
    await page.getByTestId('queue-continue').click();

    const attempts = await readStore<{ baseline?: boolean; rating?: string; sound: string }>(page, 'attempts');
    const baseline = attempts.filter((a) => a.baseline && a.sound === 'ts');
    expect(baseline.length).toBeGreaterThanOrEqual(1);
    expect(baseline.some((a) => a.rating === 'independent')).toBe(true);
  });

  test('11. Diagnostics screen runs preflight checks in plain Hebrew', async ({ page }) => {
    await freshHome(page);
    await openParent(page);
    await page.getByTestId('open-tonight').click();
    await page.getByTestId('tonight-diagnostics').click();

    // Core checks render with a status.
    for (const key of ['mediarecorder', 'indexeddb', 'audio', 'serviceworker', 'export', 'version']) {
      await expect(page.getByTestId(`diag-${key}`)).toBeVisible();
    }
    // IndexedDB write/read should pass in a normal browser context.
    await expect(page.getByTestId('diag-indexeddb')).toHaveAttribute('data-status', 'ok');
    // The audio write+read roundtrip (the iOS-bug catcher) should also pass.
    await expect(page.getByTestId('diag-audio-storage')).toHaveAttribute('data-status', 'ok');
  });

  test('12. A recorded practice attempt persists mid-session and is reviewable + playable', async ({ page }) => {
    await freshHome(page);
    // Record one attempt inside a Lavi mission (do NOT finish the mission).
    await page.getByTestId('select-lavi').click();
    await page.getByTestId('lavi-sound-s').click();
    await page.getByTestId('briefing-start').click();
    await recordAndSave(page); // warmup isolated sound
    await expect(page.getByTestId('rating-legend')).toBeVisible(); // plain-language ratings shown

    // Leave mid-mission and open the recordings review.
    await page.goto('/');
    await openParent(page);
    await page.getByTestId('nav-recordings').click();
    await expect(page.getByTestId('recordings-list')).toBeVisible();
    const rows = page.locator('[data-testid^="recording-play-"]');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);

    // The attempt + its (incomplete) session are both persisted.
    const attempts = await readStore<{ childId: string }>(page, 'attempts');
    expect(attempts.filter((a) => a.childId === 'lavi').length).toBeGreaterThanOrEqual(1);
    const sessions = await readStore<{ childId: string }>(page, 'sessions');
    expect(sessions.some((s) => s.childId === 'lavi')).toBe(true);
  });

  test('13. A recording can be deleted from the review screen', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-niv').click();
    await page.getByTestId('niv-sound-s').click();
    await page.getByTestId('niv-greeting-start').click();
    await page.getByTestId('bombard-continue').click();
    await page.locator('[data-testid^="niv-choice-"][data-correct="true"]').click();
    await recordAndSave(page); // say_three attempt
    await expect(page.getByTestId('rating-legend')).toBeVisible(); // wait for save to land

    await page.goto('/');
    await openParent(page);
    await page.getByTestId('nav-recordings').click();
    await page.getByTestId('recordings-child-niv').click();
    const firstDelete = page.locator('[data-testid^="recording-delete-"]').first();
    await expect(firstDelete).toBeVisible();
    await firstDelete.click();
    // After delete the niv list is empty (only one recording existed).
    await expect(page.getByTestId('recordings-empty')).toBeVisible();
  });

  test('14. Clinician area: set weekly focus, edit a sound config, view the report', async ({ page }) => {
    await freshHome(page);
    await openParent(page);
    await page.getByTestId('nav-clinician').click();

    // Weekly focus persists.
    await expect(page.getByTestId('weekly-focus')).toBeVisible();
    await page.getByTestId('focus-sound').selectOption('sh');
    await page.getByTestId('focus-note').fill('להתמקד ב-שׁ בתחילת מילה');
    await page.getByTestId('focus-save').click();

    // Per-sound clinical config (full hierarchy incl. syllable) is editable.
    await page.getByTestId('clinician-sound-sh').click();
    await page.getByTestId('clinician-stage').selectOption('syllable');
    await page.getByTestId('clinician-save').click();

    // Report opens and reflects per-child data.
    await page.getByTestId('clinician-report-link').click();
    await expect(page.getByTestId('report-total')).toBeVisible();
    await expect(page.getByTestId('report-sound-sh')).toBeVisible();

    // Weekly focus survived a reload (persisted to IndexedDB).
    await page.goto('/');
    await openParent(page);
    await page.getByTestId('nav-clinician').click();
    await expect(page.getByTestId('focus-note')).toHaveValue('להתמקד ב-שׁ בתחילת מילה');
  });

  test('15. Niv auditory bombardment shows words and advances to the choice', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-niv').click();
    await page.getByTestId('niv-sound-s').click();
    await page.getByTestId('niv-greeting-start').click();

    // Passive listening step: the listen button and at least one word are shown.
    await expect(page.getByTestId('bombard-play')).toBeVisible();
    await expect(page.locator('[data-testid^="bombard-word-"]').first()).toBeVisible();

    // Continuing reaches the listen-and-choose step.
    await page.getByTestId('bombard-continue').click();
    await expect(
      page.locator('[data-testid^="niv-choice-"][data-correct="true"]'),
    ).toBeVisible();
  });

  test('16. Lavi can listen back to himself next to the model before rating', async ({ page }) => {
    await freshHome(page);
    await page.getByTestId('select-lavi').click();
    await page.getByTestId('lavi-sound-s').click();
    await page.getByTestId('briefing-start').click();

    await recordAndSave(page); // warm-up attempt
    // Self-monitoring compare panel appears with a play-your-recording button.
    await expect(page.getByTestId('self-compare')).toBeVisible();
    await expect(page.getByTestId('self-compare-play')).toBeVisible();
    // Rating still works afterwards.
    await page.getByTestId('rating-independent').click();
    await page.getByTestId('continue-step').click();
  });

  test('17. Clinician weekly focus highlights the sound on the child screen', async ({ page }) => {
    await freshHome(page);
    await openParent(page);
    await page.getByTestId('nav-clinician').click();
    await page.getByTestId('focus-sound').selectOption('sh');
    await page.getByTestId('focus-save').click();
    // Wait for the focus to actually commit to IndexedDB before navigating away.
    await expect
      .poll(async () => {
        const rows = await readStore<{ weeklyFocus?: { lavi?: { sound?: string } } }>(page, 'settings');
        return rows[0]?.weeklyFocus?.lavi?.sound;
      })
      .toBe('sh');

    // The highlight shows for Lavi's sound picker.
    await page.goto('/');
    await page.getByTestId('select-lavi').click();
    await expect(page.getByTestId('lavi-sound-sh')).toHaveAttribute('data-focus', 'true');
  });
});
