import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, statusBadgeClass } from '@/lib/format';
import type { ApiCallLog, InvoiceImport } from '@/lib/supabase/types';
import { RetryButton } from './_components/retry-button';
import { ResolveForm } from './_components/resolve-form';

export const dynamic = 'force-dynamic';

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const importId = Number(id);
  if (!Number.isFinite(importId)) notFound();

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('invoice_imports')
    .select('*')
    .eq('id', importId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!row) notFound();

  const { data: calls } = await supabase
    .from('api_call_log')
    .select('*')
    .eq('invoice_import_id', importId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const item = row as InvoiceImport;
  const apiCalls = (calls ?? []) as ApiCallLog[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/imports" className="text-sm text-sky-700 hover:underline">
          ← zpět na importy
        </Link>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{item.fakturoid_number}</h1>
            <span className={statusBadgeClass(item.status)}>{item.status}</span>
          </div>
          <div className="text-sm text-slate-500">
            Fakturoid ID {item.fakturoid_id} ·{' '}
            {item.sync_run_id !== null ? (
              <Link
                href={`/runs/${item.sync_run_id}`}
                className="text-sky-700 hover:underline"
              >
                běh #{item.sync_run_id}
              </Link>
            ) : (
              'bez běhu'
            )}{' '}
            · pokus #{item.attempt_count}
          </div>
        </div>
        {item.status === 'failed' && <RetryButton id={item.id} />}
      </header>

      {item.status === 'needs_review' && (
        <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <span aria-hidden className="text-xl leading-none">⚠</span>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-900">
                Faktura vyžaduje manuální kontrolu
              </h2>
              {item.error_message && (
                <p className="text-sm text-amber-900">{item.error_message}</p>
              )}
            </div>
          </div>
          <ResolveForm id={item.id} />
        </section>
      )}

      {item.status === 'resolved' && (
        <section className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
          <div className="flex items-start gap-2">
            <span aria-hidden className="text-xl leading-none">✓</span>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-emerald-900">
                Vyřešeno {formatDateTime(item.resolved_at)}
              </h2>
            </div>
          </div>
          {item.resolution_note && (
            <pre className="overflow-auto whitespace-pre-wrap rounded border border-emerald-200 bg-white p-2 text-xs text-emerald-900">
              {item.resolution_note}
            </pre>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Pohoda ID" value={item.pohoda_id} />
        <Field label="Pohoda doc number" value={item.pohoda_doc_number} />
        <Field label="Vytvořeno" value={formatDateTime(item.created_at)} />
        <Field label="Aktualizováno" value={formatDateTime(item.updated_at)} />
        <Field
          label="Fakturoid updated"
          value={formatDateTime(item.fakturoid_updated_at)}
        />
        <Field
          label="Next retry"
          value={formatDateTime(item.next_retry_at)}
        />
      </section>

      {(item.error_code || item.error_message) && (
        <section className="space-y-1">
          <h2 className="text-sm font-medium text-slate-700">Chyba</h2>
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {item.error_code && (
              <div className="font-mono text-xs">{item.error_code}</div>
            )}
            {item.error_message && (
              <pre className="overflow-auto whitespace-pre-wrap text-xs">
                {item.error_message}
              </pre>
            )}
          </div>
        </section>
      )}

      <PayloadBlock title="Fakturoid snapshot" json={item.fakturoid_snapshot} />
      <PayloadBlock title="Pohoda request (XML)" raw={item.pohoda_request} />
      <PayloadBlock title="Pohoda response (XML)" raw={item.pohoda_response} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium">
          API call log ({apiCalls.length})
        </h2>
        {apiCalls.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Žádné API volání zatím nezalogováno.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {apiCalls.map((call) => (
              <li key={call.id} className="space-y-1 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                    {call.service}
                  </span>
                  <span className="font-mono">{call.method}</span>
                  <span className="truncate text-slate-600">{call.url}</span>
                  <span
                    className={`ml-auto font-mono ${
                      (call.response_status ?? 0) >= 400
                        ? 'text-rose-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {call.response_status ?? '—'}
                  </span>
                  <span className="text-slate-500">
                    {call.duration_ms ? `${call.duration_ms} ms` : ''}
                  </span>
                  <span className="text-slate-500">
                    {formatDateTime(call.created_at)}
                  </span>
                </div>
                {call.request_body && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-600">
                      request body
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-slate-50 p-2">
                      {call.request_body}
                    </pre>
                  </details>
                )}
                {call.response_body && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-600">
                      response body
                    </summary>
                    <pre className="mt-1 overflow-auto rounded bg-slate-50 p-2">
                      {call.response_body}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="font-mono text-sm">{value || '—'}</div>
    </div>
  );
}

function PayloadBlock({
  title,
  json,
  raw,
}: {
  title: string;
  json?: unknown;
  raw?: string | null;
}) {
  const content = json !== undefined ? JSON.stringify(json, null, 2) : raw;
  if (!content) return null;
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        {title}
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-slate-200 bg-slate-50 p-3 text-xs">
        {content}
      </pre>
    </details>
  );
}
