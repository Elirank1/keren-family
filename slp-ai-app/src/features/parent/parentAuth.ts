// Parent gate state. This is a *child gate*, not real security — it only keeps
// the parent area out of casual reach. Unlock lives in sessionStorage so it
// clears when the tab closes.
const KEY = 'slp-parent-unlocked';

export function isParentUnlocked(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setParentUnlocked(value: boolean): void {
  try {
    if (value) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    // ignore storage errors
  }
}
