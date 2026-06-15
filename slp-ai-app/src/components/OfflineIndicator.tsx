import { useEffect, useState } from 'react';

// Small offline-ready indicator — shown only in parent mode per the spec.
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <span
      data-testid="offline-indicator"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
      title="האפליקציה עובדת גם ללא חיבור לאחר טעינה ראשונה"
    >
      {online ? '🟢 מחובר · זמין אופליין' : '🟡 לא מחובר · עובד אופליין'}
    </span>
  );
}
