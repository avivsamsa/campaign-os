import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/clients/[id]/messages/[messageId] — מחיקת עדכון (לאדמין).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; messageId: string } },
) {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('portal_messages')
    .delete()
    .eq('id', params.messageId)
    .eq('client_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
