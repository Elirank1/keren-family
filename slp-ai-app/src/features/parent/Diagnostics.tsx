import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/components/ui';
import { detectRecorderSupport, pickMimeType, startRecording } from '@/lib/recorder';
import { probeStorage, probeAudioRoundtrip } from './tonight/tonight';
import { APP_VERSION } from '@/lib/version';

type Status = 'ok' | 'warn' | 'fail' | 'unknown';

interface Check {
  key: string;
  label: string;
  status: Status;
  detail: string;
}

const STATUS_ICON: Record<Status, string> = { ok: '✅', warn: '⚠️', fail: '❌', unknown: '❔' };
const STATUS_HE: Record<Status, string> = { ok: 'תקין', warn: 'שים לב', fail: 'בעיה', unknown: 'לא נבדק' };

// Parent-only preflight. Plain Hebrew, no developer tools needed. Helps diagnose
// real iPhone Safari issues (recording, storage, standalone, service worker).
export default function Diagnostics() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [micResult, setMicResult] = useState<string | null>(null);
  const [playResult, setPlayResult] = useState<string | null>(null);

  useEffect(() => {
    void runChecks().then(setChecks);
  }, []);

  if (!checks) return <Spinner label="בודק מכשיר…" />;

  // Interactive mic test: actively requests permission and records a moment.
  const testMic = async () => {
    setMicResult('מבקש הרשאה…');
    try {
      const rec = await startRecording();
      await new Promise((r) => setTimeout(r, 400));
      const out = await rec.stop();
      setMicResult(`הקלטה הצליחה · ${(out.blob.size / 1024).toFixed(1)}KB · ${out.mimeType}`);
    } catch (e) {
      setMicResult(`נכשל: ${(e as Error).message}`);
    }
  };

  // Interactive playback test: play a short silent clip to confirm audio output
  // is permitted (iOS requires a user gesture — this button is that gesture).
  const testPlayback = async () => {
    setPlayResult('מנגן…');
    try {
      const silent =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
      const audio = new Audio(silent);
      await audio.play();
      setPlayResult('השמעה הצליחה');
    } catch (e) {
      setPlayResult(`נכשל: ${(e as Error).message}`);
    }
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent/tonight')} className="w-fit text-base font-bold text-slate-600">
        → חזרה להכנה
      </button>
      <header>
        <h1 className="text-2xl font-black">בדיקת מכשיר 🩺</h1>
        <p className="text-sm text-slate-600">
          בדיקה מהירה שהכל עובד במכשיר הזה — בעיקר באייפון. אין צורך בכלים טכניים.
        </p>
      </header>

      <ul className="divide-y divide-slate-100 rounded-3xl bg-white p-4 shadow-sm">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-3 py-3" data-testid={`diag-${c.key}`} data-status={c.status}>
            <span className="text-xl" aria-hidden="true">{STATUS_ICON[c.status]}</span>
            <div className="flex-1">
              <p className="font-bold">{c.label}</p>
              <p className="text-sm text-slate-500">{c.detail}</p>
            </div>
            <span className="text-sm font-bold text-slate-400">{STATUS_HE[c.status]}</span>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">בדיקות פעילות</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={testMic} data-testid="diag-test-mic">🎙️ בדיקת מיקרופון</Button>
          {micResult && <span className="text-sm font-bold text-slate-700" data-testid="diag-mic-result">{micResult}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={testPlayback} data-testid="diag-test-playback">🔊 בדיקת השמעה</Button>
          {playResult && <span className="text-sm font-bold text-slate-700" data-testid="diag-playback-result">{playResult}</span>}
        </div>
        <p className="text-xs text-slate-400">
          באייפון יש ללחוץ על הכפתורים — הרשאת מיקרופון והשמעה דורשות מגע יזום.
        </p>
      </section>
    </main>
  );
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // MediaRecorder availability
  const support = detectRecorderSupport();
  checks.push({
    key: 'mediarecorder',
    label: 'הקלטת קול (MediaRecorder)',
    status: support.supported ? 'ok' : 'fail',
    detail: support.supported ? 'נתמך' : 'לא נתמך בדפדפן הזה',
  });

  // Chosen MIME type
  const mime = pickMimeType();
  checks.push({
    key: 'mime',
    label: 'פורמט הקלטה',
    status: mime ? 'ok' : 'warn',
    detail: mime ?? 'ברירת מחדל של הדפדפן',
  });

  // Microphone permission (passive query; Safari often returns unknown)
  let micPerm: Status = 'unknown';
  let micDetail = 'יש ללחוץ "בדיקת מיקרופון" כדי לבדוק';
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (perms?.query) {
      const res = await perms.query({ name: 'microphone' as PermissionName });
      micPerm = res.state === 'granted' ? 'ok' : res.state === 'denied' ? 'fail' : 'unknown';
      micDetail = res.state === 'granted' ? 'יש הרשאה' : res.state === 'denied' ? 'ההרשאה נדחתה' : 'טרם אושרה';
    }
  } catch {
    /* permissions API unavailable on iOS Safari — leave unknown */
  }
  checks.push({ key: 'mic-permission', label: 'הרשאת מיקרופון', status: micPerm, detail: micDetail });

  // IndexedDB write/read
  const storageOk = await probeStorage();
  checks.push({
    key: 'indexeddb',
    label: 'אחסון מקומי (IndexedDB)',
    status: storageOk ? 'ok' : 'fail',
    detail: storageOk ? 'כתיבה וקריאה הצליחו' : 'כתיבה נכשלה — ייתכן מצב פרטי',
  });

  // Audio bytes roundtrip — the check that catches the iOS "saved but empty"
  // recording bug end to end (same path child recordings use).
  const audioOk = await probeAudioRoundtrip();
  checks.push({
    key: 'audio-storage',
    label: 'שמירת הקלטות (כתיבה+קריאה של קול)',
    status: audioOk ? 'ok' : 'fail',
    detail: audioOk ? 'הקלטה נשמרה ונקראה בהצלחה' : 'הקלטות עלולות לא להישמר במכשיר זה',
  });

  // Persistent storage
  try {
    const storage = (navigator as Navigator & { storage?: StorageManager }).storage;
    if (storage?.persisted) {
      const already = await storage.persisted();
      const granted = already || (storage.persist ? await storage.persist() : false);
      checks.push({
        key: 'persistent',
        label: 'אחסון מתמיד',
        status: granted ? 'ok' : 'warn',
        detail: granted ? 'הנתונים פחות חשופים למחיקה אוטומטית' : 'הדפדפן עלול לפנות אחסון — כדאי לייצא',
      });
    } else {
      checks.push({ key: 'persistent', label: 'אחסון מתמיד', status: 'warn', detail: 'לא נתמך — כדאי לייצא נתונים' });
    }
  } catch {
    checks.push({ key: 'persistent', label: 'אחסון מתמיד', status: 'warn', detail: 'לא ניתן לבדוק' });
  }

  // Audio playback element
  checks.push({
    key: 'audio',
    label: 'השמעת קול',
    status: typeof Audio !== 'undefined' ? 'ok' : 'fail',
    detail: typeof Audio !== 'undefined' ? 'נתמך · יש לאשר עם "בדיקת השמעה"' : 'לא נתמך',
  });

  // PWA standalone mode
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  checks.push({
    key: 'standalone',
    label: 'מצב אפליקציה (הוספה למסך הבית)',
    status: standalone ? 'ok' : 'warn',
    detail: standalone ? 'פועל כאפליקציה' : 'פועל בדפדפן — אפשר "הוסף למסך הבית"',
  });

  // Service worker
  let swStatus: Status = 'warn';
  let swDetail = 'לא רשום';
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        swStatus = 'ok';
        swDetail = navigator.serviceWorker.controller ? 'פעיל ושולט' : 'רשום';
      } else {
        swDetail = 'אין רישום (ייתכן בטעינה ראשונה)';
      }
    } else {
      swDetail = 'לא נתמך';
    }
  } catch {
    swDetail = 'שגיאה בבדיקה';
  }
  checks.push({ key: 'serviceworker', label: 'עבודה לא מקוונת (Service Worker)', status: swStatus, detail: swDetail });

  // Export availability
  const exportOk = typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function';
  checks.push({
    key: 'export',
    label: 'ייצוא נתונים',
    status: exportOk ? 'ok' : 'fail',
    detail: exportOk ? 'זמין' : 'לא נתמך',
  });

  // App version
  checks.push({ key: 'version', label: 'גרסת אפליקציה', status: 'ok', detail: `v${APP_VERSION}` });

  return checks;
}
