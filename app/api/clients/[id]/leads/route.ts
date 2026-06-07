import { NextResponse } from 'next/server';
import { fetchClientLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/leads — לידים מועשרים (תוויות קמפיין/קריאטיב)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const leads = await fetchClientLeads(params.id);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
