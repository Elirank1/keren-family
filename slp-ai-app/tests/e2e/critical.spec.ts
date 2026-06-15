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
    await page.getByTestId('niv-start').click();
    await page.getByTestId('niv-greeting-start').click();

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
});
