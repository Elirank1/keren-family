import { Outlet } from 'react-router-dom';
import { ensureSeeded } from '@/db/seed';

// Root loader runs once before any route renders: seed the local DB and
// (best-effort) request persistent storage. Failures here are non-fatal — the
// app should still load with whatever data exists.
export async function rootLoader() {
  await ensureSeeded();
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // Persistent storage denied — continue anyway.
    }
  }
  return null;
}

export function RootLayout() {
  return (
    <div className="min-h-full" dir="rtl" lang="he">
      <Outlet />
    </div>
  );
}
