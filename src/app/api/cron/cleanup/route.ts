import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel Cron: soft-delete api_call_log řádky starší 30 dní.
export async function GET() {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('api_call_log')
    .update({ deleted_at: new Date().toISOString() })
    .lt('created_at', cutoff)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, soft_deleted: data?.length ?? 0 });
}
