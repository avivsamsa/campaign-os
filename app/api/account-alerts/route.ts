import { NextResponse } from 'next/server';
import { fetchAccountAlerts } from '@/lib/account-status';

export const dynamic = 'force-dynamic';

// GET /api/account-alerts — סטטוס חשבונות המודעות בזמן אמת (רק אלה עם בעיה)
export async function GET() {
  try {
    const alerts = await fetchAccountAlerts();
    return NextResponse.json({ alerts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
