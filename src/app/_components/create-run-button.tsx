'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function CreateRunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sync_runs')
      .insert({ trigger: 'manual', status: 'running' })
      .select('id')
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) router.push(`/runs/${data.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
      >
        {busy ? 'Vytvářím…' : '+ Nový manuální běh'}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
