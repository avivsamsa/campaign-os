import { NextResponse } from 'next/server';
import { fetchClientLeads } from '@/lib/leads';
import { resolvePortalSession } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

// GET /api/portal/leads — לידים של הלקוח המאומת (session)
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_leads) return NextResponse.json({ error: 'אין גישה ללידים' }, { status: 403 });
  try {
    const leads = await fetchClientLeads(client.id, { heavy: false });
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
