import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildExportZip, buildProgressJson, downloadBlob } from '@/lib/export';
import { Button } from '@/components/ui';

export default function ExportScreen() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'json' | 'zip' | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const exportJson = async () => {
    setBusy('json');
    try {
      const data = await buildProgressJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'slp-ai-progress.json');
      setStatus('קובץ JSON יוצא בהצלחה.');
    } finally {
      setBusy(null);
    }
  };

  const exportZip = async () => {
    setBusy('zip');
    try {
      const blob = await buildExportZip();
      downloadBlob(blob, 'slp-ai-export.zip');
      setStatus('קובץ ZIP כולל הקלטות יוצא בהצלחה.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main dir="rtl" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-slate-100 px-5 py-6 text-slate-900">
      <button onClick={() => navigate('/parent')} className="w-fit text-base font-bold text-slate-600">
        → חזרה לאזור הורים
      </button>
      <header>
        <h1 className="text-2xl font-black">ייצוא נתונים</h1>
        <p className="text-sm text-slate-600">
          אחסון הדפדפן אינו גיבוי. כדאי לייצא ולשמור עותק חיצוני מדי פעם.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-black">ייצוא התקדמות (JSON)</h2>
        <p className="text-sm text-slate-600">
          כולל פרופילים, סשנים, ניסיונות והגדרות — ללא קבצי הקול.
        </p>
        <Button variant="secondary" onClick={exportJson} disabled={busy !== null} data-testid="export-json">
          {busy === 'json' ? 'מייצא…' : '📄 ייצוא JSON'}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-black">ייצוא מלא (ZIP)</h2>
        <p className="text-sm text-slate-600">
          כולל manifest, progress, הגדרות קלינאית, ותיקיית recordings עם כל ההקלטות.
        </p>
        <Button variant="primary" onClick={exportZip} disabled={busy !== null} data-testid="export-zip">
          {busy === 'zip' ? 'מייצא…' : '📦 ייצוא ZIP מלא'}
        </Button>
      </section>

      {status && (
        <p role="status" data-testid="export-status" className="rounded-2xl bg-emerald-100 p-3 text-center font-bold text-emerald-800">
          {status}
        </p>
      )}
    </main>
  );
}
