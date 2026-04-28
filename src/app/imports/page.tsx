import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, statusBadgeClass } from '@/lib/format';
import type { InvoiceImport, InvoiceImportStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const STATUSES: (InvoiceImportStatus | 'all')[] = [
  'all',
  'pending',
  'success',
  'failed',
  'needs_review',
  'skipped',
];

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q } = await searchParams;
  const status = (rawStatus ?? 'all') as InvoiceImportStatus | 'all';
  const search = (q ?? '').trim();

  const supabase = await createClient();
  let query = supabase
    .from('invoice_imports')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.ilike('fakturoid_number', `%${search}%`);

  const { data, error } = await query;
  const items = (data ?? []) as InvoiceImport[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Importy faktur</h1>
        <p className="text-sm text-slate-500">
          Faktury z Fakturoidu a stav jejich přenosu do Pohody.
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
      >
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              className={`rounded-full border px-3 py-1 text-xs ${
                status === s
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2 sm:justify-end">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Hledej podle čísla faktury…"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:w-64"
          />
          <input type="hidden" name="status" value={status} />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Hledat
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Chyba: {error.message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Žádné faktury neodpovídají filtru.
        </div>
      ) : (
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
                  <span className="text-xs text-slate-500">
                    Fakturoid ID {item.fakturoid_id}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {item.error_message ?? formatDateTime(item.created_at)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
