import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Stub webhook endpoint pro Fakturoid.
// Skutečná akvizice (OAuth, GET detail, mapping) je v backlog.
// Teď: přijmi payload, založ pending invoice_imports záznam, vrať 200.
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const invoice = (payload.invoice ?? {}) as Record<string, unknown>;
  const fakturoidId =
    Number(invoice.id) || Number(payload.invoice_id) || null;
  const fakturoidNumber =
    (invoice.number as string | undefined) ??
    (payload.number as string | undefined) ??
    'unknown';

  if (!fakturoidId) {
    return NextResponse.json(
      { error: 'missing_invoice_id', hint: 'expected invoice.id v payloadu' },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoice_imports')
    .insert({
      fakturoid_id: fakturoidId,
      fakturoid_number: String(fakturoidNumber),
      status: 'pending',
      attempt_count: 0,
      fakturoid_snapshot: payload,
    })
    .select('id')
    .single();

  if (error) {
    // Idempotence: unique constraint na fakturoid_id → "už máme"
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id }, { status: 200 });
}
