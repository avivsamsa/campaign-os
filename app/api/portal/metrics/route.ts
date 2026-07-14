import { NextResponse } from 'next/server';
import { queryMetrics, type GroupBy } from '@/lib/metrics';
import { resolvePortalSession } from '@/lib/portal-session';

export const dynamic = 'force-dynamic';

const GROUP_BYS: GroupBy[] = ['day', 'week', 'creative', 'campaign'];

// GET /api/portal/metrics — מטריקות של הלקוח המאומת, רק אם show_performance
export async function GET(req: Request) {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  if (!client.show_performance) {
    return NextResponse.json({ error: 'אין גישה לביצועים' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const groupBy = (searchParams.get('group_by') ?? 'day') as GroupBy;
  if (!GROUP_BYS.includes(groupBy)) return NextResponse.json({ error: 'group_by לא תקין' }, { status: 400 });
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  if (!since || !until) return NextResponse.json({ error: 'since ו-until חובה' }, { status: 400 });

  try {
    const result = await queryMetrics(
      {
        client_id: client.id,
        campaign_id: searchParams.get('campaign_id') || undefined,
        creative_id: searchParams.get('creative_id') || undefined,
      },
      groupBy,
      { since, until },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
