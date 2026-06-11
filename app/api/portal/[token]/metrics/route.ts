import { NextResponse } from 'next/server';
import { queryMetrics, type GroupBy } from '@/lib/metrics';
import { resolvePortalAccess } from '@/lib/portal';

export const dynamic = 'force-dynamic';

const GROUP_BYS: GroupBy[] = ['day', 'week', 'creative', 'campaign'];

// GET /api/portal/[token]/metrics — מטריקות של הלקוח של הטוקן, רק אם can_view_metrics
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const access = await resolvePortalAccess(params.token);
  if (!access) return NextResponse.json({ error: 'גישה לא חוקית' }, { status: 403 });
  if (!access.can_view_metrics) return NextResponse.json({ error: 'אין הרשאת צפייה במטריקות' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const groupBy = (searchParams.get('group_by') ?? 'day') as GroupBy;
  if (!GROUP_BYS.includes(groupBy)) return NextResponse.json({ error: 'group_by לא תקין' }, { status: 400 });
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  if (!since || !until) return NextResponse.json({ error: 'since ו-until חובה' }, { status: 400 });

  try {
    const result = await queryMetrics(
      {
        client_id: access.client_id,
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
