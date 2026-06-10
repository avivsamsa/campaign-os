import { NextResponse } from 'next/server';
import { fetchClientLeads } from '@/lib/leads';
import { resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

// GET /api/portal/[token]/leads — לידים של הלקוח שמשויך לטוקן בלבד
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  try {
    const leads = await fetchClientLeads(access.client_id);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
