import { NextResponse } from 'next/server';
import { resolvePortalSession } from '@/lib/portal-session';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/notifs — payload קל לפעמון ההתראות.
 * במקום למשוך את כל הלידים דרך fetchClientLeads (הרבה joins) — שולפים רק
 * לידים חדשים בשדות המינימליים + ההודעות, בשאילתות מקבילות.
 */
export async function GET() {
  const client = await resolvePortalSession();
  if (!client) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const sb = getSupabaseClient();
  const [leadsRes, msgsRes] = await Promise.all([
    sb
      .from('leads')
      .select('id, name, created_at, form_id')
      .eq('client_id', client.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(50),
    sb
      .from('portal_messages')
      .select('id, title, body, created_at')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const rawLeads = (leadsRes.data ?? []) as Array<Record<string, unknown>>;

  // שם הקטגוריה לכל טופס שמופיע — רק אם יש לידים חדשים
  const formIds = [...new Set(rawLeads.map((l) => l.form_id as string).filter(Boolean))];
  const formToName = new Map<string, string | null>();
  const hiddenForms = new Set<string>(); // טפסים ששייכים לקטגוריה מוסתרת
  if (formIds.length > 0) {
    const { data: routes } = await sb
      .from('lead_form_routes')
      .select('form_id, product_id')
      .in('form_id', formIds);
    const productIds = [...new Set((routes ?? []).map((r) => r.product_id as string).filter(Boolean))];
    if (productIds.length > 0) {
      const { data: prods } = await sb.from('products').select('id, name, portal_hidden').in('id', productIds);
      const pName = new Map((prods ?? []).map((p) => [p.id as string, p.name as string]));
      const hiddenProd = new Set(
        (prods ?? []).filter((p) => (p as { portal_hidden?: boolean }).portal_hidden).map((p) => p.id as string),
      );
      for (const r of routes ?? []) {
        formToName.set(r.form_id as string, pName.get(r.product_id as string) ?? null);
        if (hiddenProd.has(r.product_id as string)) hiddenForms.add(r.form_id as string);
      }
    }
  }

  // הסתרה מלאה: מדלגים על לידים חדשים ששייכים לקטגוריה מוסתרת (לא בפעמון).
  const visibleLeads = rawLeads.filter((l) => !(l.form_id && hiddenForms.has(l.form_id as string)));

  return NextResponse.json({
    leads: visibleLeads.map((l) => ({
      id: l.id as string,
      name: (l.name as string) ?? null,
      category_name: l.form_id ? formToName.get(l.form_id as string) ?? null : null,
      created_at: l.created_at as string,
    })),
    messages: msgsRes.data ?? [],
  });
}
