import { NextResponse } from 'next/server';
import { queryMetrics, type GroupBy } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

const GROUP_BYS: GroupBy[] = ['day', 'week', 'creative', 'campaign'];

// GET /api/metrics?client_id&campaign_id?&creative_id?&group_by&since&until
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const clientId = searchParams.get('client_id');
  if (!clientId) return NextResponse.json({ error: 'client_id חובה' }, { status: 400 });

  const groupBy = (searchParams.get('group_by') ?? 'day') as GroupBy;
  if (!GROUP_BYS.includes(groupBy)) {
    return NextResponse.json({ error: 'group_by לא תקין' }, { status: 400 });
  }

  const since = searchParams.get('since');
  const until = searchParams.get('until');
  if (!since || !until) {
    return NextResponse.json({ error: 'since ו-until חובה' }, { status: 400 });
  }

  try {
    const result = await queryMetrics(
      {
        client_id: clientId,
        campaign_id: searchParams.get('campaign_id') || undefined,
        creative_id: searchParams.get('creative_id') || undefined,
      },
      groupBy,
      { since, until },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
