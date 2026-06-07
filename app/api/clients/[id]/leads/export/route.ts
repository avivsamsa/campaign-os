import { fetchClientLeads } from '@/lib/leads';
import { buildLeadCsv, type LeadSheetRow } from '@/lib/leadsheet';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/leads/export — CSV ממולא מראש להורדה
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const leads = await fetchClientLeads(params.id);

  const rows: LeadSheetRow[] = leads.map((l) => ({
    lead_id: l.id,
    meta_lead_id: l.meta_lead_id ?? '',
    created_at: l.created_at?.slice(0, 10) ?? '',
    name: l.name ?? '',
    phone: l.phone ?? '',
    creative: l.creative_label ?? '',
    status: l.status,
    deal_value: l.deal_value != null ? String(l.deal_value) : '',
  }));

  const csv = buildLeadCsv(rows);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${params.id}.csv"`,
    },
  });
}
