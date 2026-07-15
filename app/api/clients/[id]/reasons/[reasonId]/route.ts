import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/clients/[id]/reasons/[reasonId] — מחיקת סיבה.
// לידים שסומנו בסיבה זו יאבדו את השיוך (reason_id → null בזכות on delete set null).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; reasonId: string } },
) {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('lead_reasons')
    .delete()
    .eq('id', params.reasonId)
    .eq('client_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
