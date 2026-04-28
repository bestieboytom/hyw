import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, statusBadgeClass } from '@/lib/format';
import type { SyncRun } from '@/lib/supabase/types';
import { CreateRunButton } from './_components/create-run-button';

export const dynamic = 'force-dynamic';

export default async function SyncRunsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sync_runs')
    .select('*')
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(100);

  const runs = (data ?? []) as SyncRun[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sync běhy</h1>
          <p className="text-sm text-slate-500">
            Posledních 100 spuštění synchronizace.
          </p>
        </div>
        <CreateRunButton />
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Chyba načítání: {error.message}
        </div>
      )}

      {runs.length === 0 && !error && (
        <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Zatím žádný běh. Klikni na &bdquo;Nový manuální běh&ldquo; výše.
        </div>
      )}

      {runs.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="hidden w-full text-sm sm:table">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">OK / fail / skip</th>
                <th className="px-3 py-2">Začátek</th>
                <th className="px-3 py-2">Konec</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-sky-700 hover:underline"
                    >
                      #{run.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{run.trigger}</td>
                  <td className="px-3 py-2">
                    <span className={statusBadgeClass(run.status)}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {run.invoices_succeeded} / {run.invoices_failed} /{' '}
                    {run.invoices_skipped}
                    <span className="text-slate-400">
                      {' '}
                      ({run.invoices_total})
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatDateTime(run.started_at)}</td>
                  <td className="px-3 py-2">
                    {formatDateTime(run.finished_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 sm:hidden">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/runs/${run.id}`}
                  className="flex flex-col gap-1 p-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-sky-700">
                      #{run.id}
                    </span>
                    <span className={statusBadgeClass(run.status)}>
                      {run.status}
                    </span>
                  </div>
                  <div className="text-sm">
                    {run.trigger} · {run.invoices_succeeded} OK /{' '}
                    {run.invoices_failed} fail / {run.invoices_skipped} skip
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(run.started_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
