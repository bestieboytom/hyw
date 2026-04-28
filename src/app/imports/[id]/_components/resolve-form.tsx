'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ResolveForm({ id }: { id: number }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < 1) {
      setError('Poznámka je povinná.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('invoice_imports')
      .update({
        status: 'resolved',
        resolution_note: trimmed,
        resolved_at: new Date().toISOString(),
        error_code: null,
      })
      .eq('id', id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Necháváme busy=true: router.refresh() doběhne asynchronně.
    // Po refresh page.tsx form skryje (status už je 'resolved'),
    // takže nepotřebujeme řešit reset stavu — zabraňuje to flickeru,
    // kdy by byl form krátce zpátky enabled.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label
        htmlFor={`resolution-note-${id}`}
        className="block text-sm font-medium text-slate-700"
      >
        Poznámka k řešení
      </label>
      <textarea
        id={`resolution-note-${id}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Popiš, co jsi udělal/a (např. ručně upraveno v Pohodě, kontaktován klient…)"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        disabled={busy}
      />
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Pracuji…' : '✓ Označit jako vyřešeno'}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </form>
  );
}
