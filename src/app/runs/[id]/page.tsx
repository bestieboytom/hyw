import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, statusBadgeClass } from '@/lib/format';
import type { InvoiceImport, SyncRun } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runId = Number(id);
  if (!Number.isFinite(runId)) notFound();

  const supabase = await createClient();
  const { data: run } = await supabase
    .from('sync_runs')
    .select('*')
    .eq('id', runId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!run) notFound();

  const { data: imports } = await supabase
    .from('invoice_imports')
    .select('*')
    .eq('sync_run_id', runId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const r = run as SyncRun;
  const items = (imports ?? []) as InvoiceImport[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← zpět na sync běhy
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Běh #{r.id}</h1>
          <span className={statusBadgeClass(r.status)}>{r.status}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
            {r.trigger}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Total" value={r.invoices_total} />
          <Stat label="Success" value={r.invoices_succeeded} />
          <Stat label="Failed" value={r.invoices_failed} />
          <Stat label="Skipped" value={r.invoices_skipped} />
        </div>
        <div className="text-sm text-slate-500">
          Začátek: {formatDateTime(r.started_at)} · Konec:{' '}
          {formatDateTime(r.finished_at)}
        </div>
        {r.error_summary && (
          <pre className="overflow-auto rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            {r.error_summary}
          </pre>
        )}
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">
          Faktury v tomto běhu ({items.length})
        </h2>
        {items.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Žádné faktury v tomto běhu.
          </div>
        ) : (
          <ImportList items={items} />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function ImportList({ items }: { items: InvoiceImport[] }) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/imports/${item.id}`}
            className="flex flex-col gap-1 p-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-sky-700">
                #{item.id}
              </span>
              <span className="text-sm font-medium">
                {item.fakturoid_number}
              </span>
              <span className={statusBadgeClass(item.status)}>
                {item.status}
              </span>
              {item.attempt_count > 1 && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  pokus {item.attempt_count}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {item.error_message ?? formatDateTime(item.created_at)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
