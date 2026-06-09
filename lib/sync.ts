/**
 * מנוע הסנכרון — פאזה 2. משיכה גולמית בלבד מ-Graph API ל-Supabase.
 * אין כאן חישוב מטריקות נגזרות (זו פאזה 3/4), אין breakdowns, אין leadgen.
 *
 * הערה על upsert: לטבלאות campaigns/ads/creatives אין unique constraint על
 * מזהי Meta (הסכמה מסעיף 5), ולכן upsert מבוצע ידנית — select-לפי-מזהה-Meta,
 * ואז update לקיים / insert לחדש. כך הסנכרון אידמפוטנטי בלי לשנות סכמה.
 * daily_metrics כן בעל PK (ad_id,date) ולכן משתמש ב-upsert אמיתי.
 */

import { getSupabaseClient } from './supabase';
import { metaGet, metaGetAll, MetaApiError } from './meta';

type Json = any;

export type SyncResult = {
  account_id: string;
  campaigns: number;
  ads: number;
  creatives: number;
  daily_metrics: number;
  leads: number;
  rows_written: number;
  /** אזהרה אם משיכת הלידים נכשלה (למשל חוסר הרשאת leads_retrieval) — לא מפיל את הסנכרון. */
  lead_warning?: string;
};

export type DateRange = { since: string; until: string };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function int(v: unknown): number {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

/** חילוץ value של action_type מסוים ממערך actions/action_values של Meta. */
function actionValue(arr: Json, type: string): number {
  if (!Array.isArray(arr)) return 0;
  const hit = arr.find((a) => a.action_type === type);
  return hit ? num(hit.value) : 0;
}

/** ממפה את field_data של ליד leadgen לשדות שלנו (שמות שדה משתנים בין טפסים). */
function leadFields(fieldData: Json): { name: string | null; phone: string | null; email: string | null } {
  const map: Record<string, string> = {};
  for (const f of fieldData ?? []) {
    const v = Array.isArray(f.values) ? f.values[0] : f.values;
    if (f.name) map[String(f.name).toLowerCase()] = v ?? '';
  }
  const name =
    map.full_name ||
    [map.first_name, map.last_name].filter(Boolean).join(' ') ||
    null;
  const phone = map.phone_number || map.phone || null;
  const email = map.email || null;
  return { name: name || null, phone, email };
}

/** ברירת מחדל: 30 הימים האחרונים (כולל היום). */
export function defaultRange(): DateRange {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(until) };
}

export async function syncClient(clientId: string, range?: DateRange): Promise<SyncResult> {
  const supabase = getSupabaseClient();
  const now = () => new Date().toISOString();

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, meta_account_id')
    .eq('id', clientId)
    .single();

  if (clientErr || !client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  const accountId = String(client.meta_account_id);
  const actPath = `act_${accountId}`;
  const { since, until } = range ?? defaultRange();

  // ---------- a. campaigns ----------
  const metaCampaigns = await metaGetAll(`${actPath}/campaigns`, {
    fields: 'id,name,objective,status',
  });

  const { data: existingCamps } = await supabase
    .from('campaigns')
    .select('id, meta_campaign_id, conversion_type')
    .eq('client_id', clientId);

  // map: meta_campaign_id -> { our uuid, conversion_type }
  type CampInfo = { id: string; conversion_type: string };
  const campByMeta = new Map<string, CampInfo>(
    (existingCamps ?? []).map((c) => [
      c.meta_campaign_id as string,
      { id: c.id as string, conversion_type: (c.conversion_type as string) ?? 'lead' },
    ]),
  );

  const campInserts: Json[] = [];
  for (const mc of metaCampaigns) {
    const existing = campByMeta.get(mc.id);
    if (existing) {
      // conversion_type נשמר כפי שהוא — לא מגיע מ-Meta
      await supabase
        .from('campaigns')
        .update({
          name: mc.name ?? null,
          objective: mc.objective ?? null,
          status: mc.status ?? null,
          synced_at: now(),
        })
        .eq('id', existing.id);
    } else {
      campInserts.push({
        client_id: clientId,
        meta_campaign_id: mc.id,
        name: mc.name ?? null,
        objective: mc.objective ?? null,
        conversion_type: 'lead', // ברירת מחדל לקמפיין חדש
        status: mc.status ?? null,
        synced_at: now(),
      });
    }
  }
  if (campInserts.length > 0) {
    const { data: inserted, error } = await supabase
      .from('campaigns')
      .insert(campInserts)
      .select('id, meta_campaign_id, conversion_type');
    if (error) throw new Error(`Insert campaigns failed: ${error.message}`);
    for (const row of inserted ?? []) {
      campByMeta.set(row.meta_campaign_id as string, {
        id: row.id as string,
        conversion_type: (row.conversion_type as string) ?? 'lead',
      });
    }
  }

  // ---------- b. ads + creatives ----------
  // כולל שדות ויזואליים: thumbnail (תצוגה מקדימה) + נכס מלא (image_url / source של וידאו).
  const metaAds = await metaGetAll(`${actPath}/ads`, {
    fields:
      'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,video_id,object_story_spec}',
  });

  // מידע ויזואלי פר מזהה קריאטיב: thumbnail + נכס מלא + סוג ('image'|'video').
  type CreativeVisual = {
    asset_url: string | null; // thumbnail לגריד
    name: string | null;
    full_asset_url: string | null; // תמונה מלאה או source של וידאו
    asset_type: 'image' | 'video' | null;
  };
  const creativeInfo = new Map<string, CreativeVisual>();
  for (const a of metaAds) {
    const cr = a.creative;
    if (!cr?.id || creativeInfo.has(cr.id)) continue;

    const thumb = cr.thumbnail_url || cr.image_url || null;
    const videoId = cr.video_id || cr.object_story_spec?.video_data?.video_id || null;

    let full_asset_url: string | null = null;
    let asset_type: 'image' | 'video' | null = null;
    if (videoId) {
      asset_type = 'video';
      try {
        const v = await metaGet(String(videoId), { fields: 'source,permalink_url' });
        full_asset_url = v.source || v.permalink_url || null;
      } catch {
        full_asset_url = null; // נכס מלא לא זמין — ה-UI ייפול ל-thumbnail
      }
    } else {
      asset_type = 'image';
      full_asset_url =
        cr.image_url || cr.object_story_spec?.link_data?.picture || cr.thumbnail_url || null;
    }

    // שם המודעה (ad.name) הוא השם המשמעותי בחשבון — מועדף על שם ה-creative הגולמי של Meta.
    creativeInfo.set(cr.id, {
      asset_url: thumb,
      name: a.name || cr.name || null,
      full_asset_url,
      asset_type,
    });
  }
  const creativeMetaIds = [...creativeInfo.keys()];

  const creativeUuidByMeta = new Map<string, string>();
  const existingByMeta = new Map<string, { id: string; concept: string | null }>();
  if (creativeMetaIds.length > 0) {
    const { data: existingCreatives } = await supabase
      .from('creatives')
      .select('id, meta_creative_id, concept')
      .eq('client_id', clientId)
      .in('meta_creative_id', creativeMetaIds);
    for (const c of existingCreatives ?? []) {
      creativeUuidByMeta.set(c.meta_creative_id as string, c.id as string);
      existingByMeta.set(c.meta_creative_id as string, {
        id: c.id as string,
        concept: (c.concept as string) ?? null,
      });
    }
  }

  // עדכון קריאטיבים קיימים — מאכלס asset_url (וכן concept מ-name אם ריק, בלי לדרוס עריכה ידנית).
  for (const [meta, info] of creativeInfo) {
    const ex = existingByMeta.get(meta);
    if (!ex) continue;
    const update: Json = {};
    if (info.asset_url) update.asset_url = info.asset_url;
    if (info.full_asset_url) update.full_asset_url = info.full_asset_url;
    if (info.asset_type) update.asset_type = info.asset_type;
    // concept תמיד נשמר מסונכרן עם שם המודעה — מודעה=קריאטיב בחשבון.
    if (info.name) update.concept = info.name;
    if (Object.keys(update).length > 0) {
      await supabase.from('creatives').update(update).eq('id', ex.id);
    }
  }

  let creativesCreated = 0;
  const newCreativeIds = creativeMetaIds.filter((id) => !creativeUuidByMeta.has(id));
  if (newCreativeIds.length > 0) {
    const { data: ins, error } = await supabase
      .from('creatives')
      .insert(
        newCreativeIds.map((id) => ({
          client_id: clientId,
          meta_creative_id: id,
          asset_url: creativeInfo.get(id)?.asset_url ?? null,
          full_asset_url: creativeInfo.get(id)?.full_asset_url ?? null,
          asset_type: creativeInfo.get(id)?.asset_type ?? null,
          concept: creativeInfo.get(id)?.name ?? null,
        })),
      )
      .select('id, meta_creative_id');
    if (error) throw new Error(`Insert creatives failed: ${error.message}`);
    for (const r of ins ?? []) {
      creativeUuidByMeta.set(r.meta_creative_id as string, r.id as string);
    }
    creativesCreated = (ins ?? []).length;
  }

  // ads — קיימים תחת הקמפיינים של הלקוח
  const campaignUuids = [...campByMeta.values()].map((c) => c.id);
  const adUuidByMeta = new Map<string, string>();
  if (campaignUuids.length > 0) {
    const { data: existingAds } = await supabase
      .from('ads')
      .select('id, meta_ad_id')
      .in('campaign_id', campaignUuids);
    for (const a of existingAds ?? []) {
      adUuidByMeta.set(a.meta_ad_id as string, a.id as string);
    }
  }

  let adsProcessed = 0;
  const adInserts: Json[] = [];
  for (const ma of metaAds) {
    const campInfo = campByMeta.get(ma.campaign_id);
    if (!campInfo) continue; // קמפיין לא נמשך עבור החשבון — דילוג
    const campUuid = campInfo.id;
    adsProcessed += 1;
    const creativeUuid = ma.creative?.id ? creativeUuidByMeta.get(ma.creative.id) ?? null : null;
    const existingId = adUuidByMeta.get(ma.id);
    if (existingId) {
      await supabase
        .from('ads')
        .update({
          campaign_id: campUuid,
          creative_id: creativeUuid,
          meta_adset_id: ma.adset_id ?? null,
          name: ma.name ?? null,
          status: ma.status ?? null,
          synced_at: now(),
        })
        .eq('id', existingId);
    } else {
      adInserts.push({
        campaign_id: campUuid,
        creative_id: creativeUuid,
        meta_ad_id: ma.id,
        meta_adset_id: ma.adset_id ?? null,
        name: ma.name ?? null,
        status: ma.status ?? null,
        synced_at: now(),
      });
    }
  }
  if (adInserts.length > 0) {
    const { data: ins, error } = await supabase
      .from('ads')
      .insert(adInserts)
      .select('id, meta_ad_id');
    if (error) throw new Error(`Insert ads failed: ${error.message}`);
    for (const r of ins ?? []) {
      adUuidByMeta.set(r.meta_ad_id as string, r.id as string);
    }
  }

  // ---------- c. daily_metrics (insights ברמת ad, time_increment=1) ----------
  const insights = await metaGetAll(`${actPath}/insights`, {
    level: 'ad',
    time_increment: 1,
    time_range: JSON.stringify({ since, until }),
    fields: 'ad_id,spend,impressions,reach,clicks,ctr,cpm,actions,action_values',
  });

  const dmRows: Json[] = [];
  for (const row of insights) {
    const adUuid = adUuidByMeta.get(row.ad_id);
    if (!adUuid) continue; // אין ad תואם ב-DB — דילוג
    dmRows.push({
      ad_id: adUuid,
      date: row.date_start,
      spend: num(row.spend),
      impressions: int(row.impressions),
      reach: int(row.reach),
      clicks: int(row.clicks),
      ctr: num(row.ctr),
      cpm: num(row.cpm),
      purchases: Math.round(actionValue(row.actions, 'omni_purchase')),
      purchase_value: actionValue(row.action_values, 'omni_purchase'),
    });
  }
  let dailyMetricsWritten = 0;
  if (dmRows.length > 0) {
    const { error } = await supabase
      .from('daily_metrics')
      .upsert(dmRows, { onConflict: 'ad_id,date' });
    if (error) throw new Error(`Upsert daily_metrics failed: ${error.message}`);
    dailyMetricsWritten = dmRows.length;
  }

  // ---------- d. leads (קמפייני lead בלבד; best-effort) ----------
  // משיכה מ-leadgen פר ad של קמפיין lead. דורש הרשאת leads_retrieval.
  // אם נכשל (הרשאה חסרה / שגיאת Meta) — מתעדים אזהרה וממשיכים, לא מפילים את הסנכרון.
  let leadsWritten = 0;
  let leadWarning: string | undefined;

  const leadAds = metaAds.filter(
    (ma) => campByMeta.get(ma.campaign_id)?.conversion_type === 'lead',
  );

  if (leadAds.length > 0) {
    try {
      type IncomingLead = {
        meta_lead_id: string;
        ad_uuid: string;
        campaign_uuid: string;
        created_time?: string;
        name: string | null;
        phone: string | null;
        email: string | null;
      };
      const incoming: IncomingLead[] = [];

      for (const ma of leadAds) {
        const adUuid = adUuidByMeta.get(ma.id);
        const campUuid = campByMeta.get(ma.campaign_id)?.id;
        if (!adUuid || !campUuid) continue;
        const metaLeads = await metaGetAll(`${ma.id}/leads`, {
          fields: 'id,created_time,field_data',
        });
        for (const ml of metaLeads) {
          const f = leadFields(ml.field_data);
          incoming.push({
            meta_lead_id: String(ml.id),
            ad_uuid: adUuid,
            campaign_uuid: campUuid,
            created_time: ml.created_time,
            ...f,
          });
        }
      }

      if (incoming.length > 0) {
        // dedupe מול קיימים — לא דורסים status/deal_value שעודכנו ידנית
        const metaLeadIds = incoming.map((l) => l.meta_lead_id);
        const existingMetaIds = new Set<string>();
        for (const ids of chunk(metaLeadIds, 100)) {
          const { data: existing } = await supabase
            .from('leads')
            .select('meta_lead_id')
            .eq('client_id', clientId)
            .in('meta_lead_id', ids);
          for (const e of existing ?? []) existingMetaIds.add(e.meta_lead_id as string);
        }

        const leadInserts = incoming
          .filter((l) => !existingMetaIds.has(l.meta_lead_id))
          .map((l) => ({
            client_id: clientId,
            campaign_id: l.campaign_uuid,
            ad_id: l.ad_uuid,
            meta_lead_id: l.meta_lead_id,
            name: l.name,
            phone: l.phone,
            email: l.email,
            status: 'new',
            source: 'meta',
            created_at: l.created_time ?? now(),
          }));

        if (leadInserts.length > 0) {
          const { error } = await supabase.from('leads').insert(leadInserts);
          if (error) throw new Error(`Insert leads failed: ${error.message}`);
          leadsWritten = leadInserts.length;
        }
      }
    } catch (err) {
      leadWarning =
        err instanceof MetaApiError ? err.toReadable() : err instanceof Error ? err.message : String(err);
    }
  }

  return {
    account_id: accountId,
    campaigns: metaCampaigns.length,
    ads: adsProcessed,
    creatives: creativesCreated,
    daily_metrics: dailyMetricsWritten,
    leads: leadsWritten,
    rows_written:
      metaCampaigns.length + adsProcessed + creativesCreated + dailyMetricsWritten + leadsWritten,
    lead_warning: leadWarning,
  };
}

/** עזר: חלוקת מערך לקטעים (לשאילתות in גדולות). */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
