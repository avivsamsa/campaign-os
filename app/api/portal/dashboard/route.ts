import { NextResponse } from 'next/server';
import { resolvePortalSession } from '@/lib/portal-session';
import { computePortalDashboard } from '@/lib/portal-dashboard';

export const dynamic = 'force-dynamic';

// GET /api/portal/dashboard — KPIs + קטגוריות ללקוח המאומת
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  try {
    const d = await computePortalDashboard(client.id);
    return NextResponse.json({ client_name: client.name, ...d });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
