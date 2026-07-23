/**
 * הכנסת ליד בודד בזמן אמת — משותף לוובהוק של Meta ולוובהוק של Make.
 * ממפה את הליד ללקוח (ad→campaign→client, ובנפילה form→client) ומכניס עם dedup.
 * אם חסרים פרטים (שם/טלפון/מייל) — מושך את הליד המלא ממטא לפי leadgen_id.
 */
import { getSupabaseClient } from './supabase';
import { metaGet } from './meta';
import { leadFields } from './sync';
import { sendLeadPush } from './push';

export type IngestInput = {
  leadgen_id: string;
  ad_id?: string | null;
  form_id?: string | null;
  // אופציונלי — אם המקור כבר סיפק את השדות (למשל Make), לא נמשוך שוב ממטא
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_time?: string | null; // ISO
};

export type IngestResult = 'inserted' | 'exists' | 'unmapped' | 'error';

export async function ingestLead(input: IngestInput): Promise<IngestResult> {
  const sb = getSupabaseClient();
  try {
    let formId = input.form_id ?? null;
    let adId = input.ad_id ?? null;
    let name = input.name ?? null;
    let phone = input.phone ?? null;
    let email = input.email ?? null;
    let createdIso = input.created_time ?? null;

    // אם חסר מידע לזיהוי/הצגה — נמשוך את הליד המלא ממטא
    const needFetch = (!name && !phone && !email) || (!formId && !adId);
    if (needFetch) {
      try {
        const lead = await metaGet(input.leadgen_id, {
          fields: 'id,created_time,field_data,form_id,ad_id',
        });
        formId = formId ?? (lead.form_id ? String(lead.form_id) : null);
        adId = adId ?? (lead.ad_id ? String(lead.ad_id) : null);
        if (!name && !phone && !email) {
          const f = leadFields(lead.field_data);
          name = f.name;
          phone = f.phone;
          email = f.email;
        }
        createdIso =
          createdIso ?? (lead.created_time ? new Date(lead.created_time).toISOString() : null);
      } catch {
        // אם אין לנו כלום מהמקור וגם המשיכה נכשלה — אין מה להכניס
        if (!name && !phone && !email) return 'error';
      }
    }
    createdIso = createdIso ?? new Date().toISOString();

    // פתרון הלקוח + ייחוס
    let clientId: string | null = null;
    let adUuid: string | null = null;
    let campUuid: string | null = null;
    if (adId) {
      const { data: ad } = await sb
        .from('ads')
        .select('id, campaign_id')
        .eq('meta_ad_id', adId)
        .maybeSingle();
      if (ad) {
        adUuid = ad.id as string;
        campUuid = (ad.campaign_id as string) ?? null;
        if (campUuid) {
          const { data: camp } = await sb
            .from('campaigns')
            .select('client_id')
            .eq('id', campUuid)
            .maybeSingle();
          clientId = (camp?.client_id as string) ?? null;
        }
      }
    }
    if (!clientId && formId) {
      const { data: lf } = await sb
        .from('lead_forms')
        .select('client_id')
        .eq('id', formId)
        .maybeSingle();
      clientId = (lf?.client_id as string) ?? null;
    }
    if (!clientId) return 'unmapped';

    // dedup
    const { data: exists } = await sb
      .from('leads')
      .select('id')
      .eq('client_id', clientId)
      .eq('meta_lead_id', input.leadgen_id)
      .maybeSingle();
    if (exists) return 'exists';

    const { data: inserted, error } = await sb
      .from('leads')
      .insert({
        client_id: clientId,
        campaign_id: campUuid,
        ad_id: adUuid,
        meta_lead_id: input.leadgen_id,
        form_id: formId,
        name,
        phone,
        email,
        status: 'new',
        source: 'meta',
        created_at: createdIso,
      })
      .select('id')
      .single();
    if (error) return 'error';
    // הקטגוריה (מוצר) לפי הטופס: form_id → lead_form_routes → products.name
    let category: string | null = null;
    if (formId) {
      try {
        const { data: route } = await sb
          .from('lead_form_routes')
          .select('product_id')
          .eq('form_id', formId)
          .maybeSingle();
        if (route?.product_id) {
          const { data: prod } = await sb
            .from('products')
            .select('name')
            .eq('id', route.product_id as string)
            .maybeSingle();
          category = (prod?.name as string) ?? null;
        }
      } catch {
        /* קטגוריה היא bonus — לא מפילים push בגללה */
      }
    }
    // התראת push ללקוח (לא חוסם/מפיל את הקליטה)
    await sendLeadPush(clientId, { id: inserted.id as string, name, category });
    return 'inserted';
  } catch {
    return 'error';
  }
}
