import { type Page, type Locator, expect } from '@playwright/test';

// Start a clean run: clear IndexedDB + sessionStorage so each test seeds fresh.
export async function freshHome(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    sessionStorage.clear();
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise<void>((resolve) => {
            if (!d.name) return resolve();
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }),
      ),
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('select-lavi')).toBeVisible();
}

// Record → stop → save using the fake media device. Pass a scope locator when
// the page has more than one recorder.
export async function recordAndSave(page: Page, scope?: Locator) {
  const root = scope ?? page.locator('body');
  await root.getByTestId('record-start').click();
  await expect(root.getByTestId('recording-indicator')).toBeVisible({ timeout: 5000 });
  await root.getByTestId('record-stop').click();
  await expect(root.getByTestId('recording-playback')).toBeVisible({ timeout: 5000 });
  await root.getByTestId('record-save').click();
}

// Read raw rows from an object store in the app's IndexedDB.
export async function readStore<T = unknown>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(async (storeName) => {
    return new Promise<T[]>((resolve, reject) => {
      const open = indexedDB.open('slp-ai');
      open.onsuccess = () => {
        const db = open.result;
        try {
          const tx = db.transaction(storeName, 'readonly');
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result as T[]);
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      };
      open.onerror = () => reject(open.error);
    });
  }, store);
}
