import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Stub webhook endpoint pro Fakturoid.
// Skutečná akvizice (OAuth, GET detail, mapping) je v backlog.
// Teď: přijmi payload, založ pending invoice_imports záznam, vrať 200.
// Při duplicitě řeš sporné modifikace (S4) — flipni na needs_review.
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

  // 1. Zjisti, jestli už pro tento fakturoid_id máme živý záznam.
  const { data: existing } = await supabase
    .from('invoice_imports')
    .select('id, status, deleted_at')
    .eq('fakturoid_id', fakturoidId)
    .is('deleted_at', null)
    .maybeSingle();

  // 2. Pokud existuje → větvíme podle status.
  if (existing) {
    const status = existing.status as string;

    // success / pending → sporná modifikace, flipni na needs_review.
    // Pozn.: dva souběžné webhooky si můžou navzájem přepsat fakturoid_snapshot
    // (last-write-wins). Pro workshop MVP akceptováno; v produkci by se řešilo
    // přes compare-and-swap (updated_at) nebo serializační queue.
    if (status === 'success' || status === 'pending') {
      const { error: updateError } = await supabase
        .from('invoice_imports')
        .update({
          status: 'needs_review',
          error_code: 'manual_review_required',
          error_message:
            'Faktura byla aktualizována ve Fakturoidu po importu — vyžaduje manuální kontrolu.',
          fakturoid_snapshot: payload,
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, flagged_for_review: true, id: existing.id },
        { status: 200 },
      );
    }

    // failed → nech být, retry flow
    // needs_review / resolved → už víme, neřešíme
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  // 3. Neexistuje → INSERT nový pending záznam.
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
    // 4. Race condition: mezi SELECTem a INSERTem někdo stihl založit záznam.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id }, { status: 200 });
}
