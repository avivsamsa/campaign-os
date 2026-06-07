import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Simple connectivity check: count rows in clients (head request, no data).
    const { error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({ db: 'error', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ db: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ db: 'error', error: message }, { status: 500 });
  }
}
