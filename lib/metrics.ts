/**
 * מנוע המטריקות — פאזות 3-5. שכבת query אחת מעל daily_metrics + leads.
 *
 * עמודות בסיס (פאזה 3), קיימות לכל קמפיין ללא תלות ב-conversion_type:
 *   Spend · Impressions · Reach · Clicks · CTR · CPM
 *
 * עמודות מחושבות (פאזה 4) — מנוסחאות profit_config של הלקוח.
 *
 * מקור הכנסה לפי conversion_type (פאזה 5):
 *   purchase → revenue = purchase_value מ-daily_metrics.
 *   lead     → revenue = סכום deal_value של לידים status='closed', לפי closed_at בטווח,
 *              משויך לקריאטיב דרך lead → ad → creative.
 * אותו מנוע נוסחאות לשני המודלים — רק מקור ה-revenue מתחלף.
 *
 * כלל ברזל: לעולם לא לממצע יחס/תוצאה. סוכמים כמויות בסיס, ואז מחשבים מחדש
 * את היחסים ומריצים את הנוסחאות על הסכום — הן בשורות והן ברולאפ.
 */

import { getSupabaseClient } from './supabase';
import { runFormulas, type Direction, type Formula } from './profit';

export type GroupBy = 'day' | 'week' | 'creative' | 'campaign' | 'category';

export type Scope = {
  client_id: string;
  campaign_id?: string;
  creative_id?: string;
};

export type DateRange = { since: string; until: string };

export type FormulaColumn = { key: string; label: string; direction: Direction };

export type MetricsRow = {
  key: string;
  label: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number; // אחוז
  cpm: number;
  leads: number; // נתון נטו — ספירת לידים אמיתיים (מטבלת leads) בטווח
  cpc: number | null; // spend / clicks — null כשאין קליקים
  cpl: number | null; // spend / leads — null כשאין לידים (0 היה מטעה במיון)
  hook_rate: number | null; // 3-sec plays / impressions (%) — null לקריאטיב לא-וידאו
  thruplay_rate: number | null; // ThruPlays / impressions (%)
  frequency: number | null; // impressions / reach — סימן שחיקה
  revenue: number; // הכנסה — סכום deal_value של לידים סגורים (מודל lead) / purchase_value
  closes: number; // מספר רכישות/עסקאות סגורות בטווח
  computed: Record<string, number | null>;
};

export type MetricsTotals = Omit<MetricsRow, 'key' | 'label'>;

export type MetricsResult = {
  group_by: GroupBy;
  formula_columns: FormulaColumn[];
  formula_errors: Record<string, string>;
  rows: MetricsRow[];
  rollup: MetricsTotals;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * סך ההוצאה (כל התקופה) לכל מודעה של הלקוח: ad_id → spend.
 * משמש לייחוס הוצאה לקטגוריה דרך הלידים (ad_id של הליד) בטאב אנליטיקה.
 */
export async function spendByAdId(clientId: string): Promise<Map<string, number>> {
  const sb = getSupabaseClient();
  const { data: campaigns } = await sb.from('campaigns').select('id').eq('client_id', clientId);
  const campaignIds = (campaigns ?? []).map((c) => c.id as string);
  if (campaignIds.length === 0) return new Map();
  const { data: ads } = await sb.from('ads').select('id').in('campaign_id', campaignIds);
  const adIds = (ads ?? []).map((a) => a.id as string);
  if (adIds.length === 0) return new Map();

  const spend = new Map<string, number>();
  for (const batch of chunk(adIds, 200)) {
    const { data } = await sb.from('daily_metrics').select('ad_id, spend').in('ad_id', batch);
    for (const r of data ?? []) {
      const id = r.ad_id as string;
      spend.set(id, (spend.get(id) ?? 0) + num(r.spend));
    }
  }
  return spend;
}

/** תחילת השבוע (יום ראשון, UTC) עבור תאריך 'YYYY-MM-DD'. */
function weekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // 0 = ראשון
  return d.toISOString().slice(0, 10);
}

function ratios(s: { spend: number; impressions: number; clicks: number }): {
  ctr: number;
  cpm: number;
} {
  const ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
  const cpm = s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0;
  return { ctr, cpm };
}

/** מדדי עלות נגזרים — null כשהמכנה 0 (0 היה נראה כ"הכי טוב" במיון). */
function costRatios(s: { spend: number; clicks: number; leads: number }): {
  cpc: number | null;
  cpl: number | null;
} {
  return {
    cpc: s.clicks > 0 ? s.spend / s.clicks : null,
    cpl: s.leads > 0 ? s.spend / s.leads : null,
  };
}

/**
 * מדדי מעורבות וידאו.
 * hook_rate = 3-sec plays / impressions · thruplay_rate = ThruPlays / impressions.
 * null כשאין פעילות וידאו (למשל קריאטיב תמונה) — כדי לא להציג 0% מטעה.
 * frequency = impressions / reach (קירוב — reach מסוכם על-פני ימים אינו dedup מלא).
 */
function videoRatios(s: {
  impressions: number;
  reach: number;
  videoPlays: number;
  videoThruplays: number;
}): { hook_rate: number | null; thruplay_rate: number | null; frequency: number | null } {
  const hasVideo = s.videoPlays > 0 || s.videoThruplays > 0;
  return {
    hook_rate: hasVideo && s.impressions > 0 ? (s.videoPlays / s.impressions) * 100 : null,
    thruplay_rate: hasVideo && s.impressions > 0 ? (s.videoThruplays / s.impressions) * 100 : null,
    frequency: s.reach > 0 ? s.impressions / s.reach : null,
  };
}

type Sums = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  revenue: number; // purchase: purchase_value · lead: deal_value סגור
  orders: number; // purchases (מודל purchase)
  leads: number; // ספירת לידים (מודל lead)
  closes: number; // לידים סגורים (מודל lead)
  videoPlays: number; // 3-sec plays (Hook rate)
  videoThruplays: number; // ThruPlay (החזקה)
};

const ZERO_SUMS: Sums = {
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  revenue: 0,
  orders: 0,
  leads: 0,
  closes: 0,
  videoPlays: 0,
  videoThruplays: 0,
};

/** scope של נוסחאות לשורה: כמויות מסוכמות + יחסים + allocated_fee (pro-rata לפי spend). */
function formulaScope(s: Sums, agencyFee: number, totalSpend: number): Record<string, number> {
  const r = ratios(s);
  return {
    spend: s.spend,
    impressions: s.impressions,
    reach: s.reach,
    clicks: s.clicks,
    ctr: r.ctr,
    cpm: r.cpm,
    revenue: s.revenue,
    orders: s.orders,
    purchases: s.orders,
    leads: s.leads,
    closes: s.closes,
    allocated_fee: totalSpend > 0 ? agencyFee * (s.spend / totalSpend) : 0,
  };
}

const EMPTY_TOTALS: MetricsTotals = {
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  ctr: 0,
  cpm: 0,
  leads: 0,
  cpc: null,
  cpl: null,
  hook_rate: null,
  thruplay_rate: null,
  frequency: null,
  revenue: 0,
  closes: 0,
  computed: {},
};

export async function queryMetrics(
  scope: Scope,
  groupBy: GroupBy,
  range: DateRange,
): Promise<MetricsResult> {
  const sb = getSupabaseClient();
  const { since, until } = range;

  // 1. קמפיינים ב-scope (כולל conversion_type — קובע מקור הכנסה)
  let campQ = sb
    .from('campaigns')
    .select('id, name, conversion_type')
    .eq('client_id', scope.client_id);
  if (scope.campaign_id) campQ = campQ.eq('id', scope.campaign_id);
  const { data: campaigns, error: campErr } = await campQ;
  if (campErr) throw new Error(campErr.message);

  const campaignName = new Map<string, string>(
    (campaigns ?? []).map((c) => [c.id as string, (c.name as string) ?? (c.id as string)]),
  );
  const campConv = new Map<string, string>(
    (campaigns ?? []).map((c) => [c.id as string, (c.conversion_type as string) ?? 'lead']),
  );
  const campaignIds = (campaigns ?? []).map((c) => c.id as string);

  // 2. ads ב-scope
  let ads: { id: string; campaign_id: string; creative_id: string | null }[] = [];
  if (campaignIds.length > 0) {
    let adQ = sb.from('ads').select('id, campaign_id, creative_id').in('campaign_id', campaignIds);
    if (scope.creative_id) adQ = adQ.eq('creative_id', scope.creative_id);
    const { data, error: adErr } = await adQ;
    if (adErr) throw new Error(adErr.message);
    ads = (data ?? []) as typeof ads;
  }
  const adMap = new Map(ads.map((a) => [a.id, a]));
  const adIds = [...adMap.keys()];

  // profit_config + נתוני לקוח
  const { data: client } = await sb
    .from('clients')
    .select('gross_margin, agency_fee_monthly')
    .eq('id', scope.client_id)
    .maybeSingle();
  const { data: cfg } = await sb
    .from('profit_config')
    .select('variables, formulas')
    .eq('client_id', scope.client_id)
    .maybeSingle();

  const variables: Record<string, unknown> = { ...((cfg?.variables as object) ?? {}) };
  if (variables.gross_margin === undefined && client?.gross_margin != null) {
    variables.gross_margin = client.gross_margin;
  }
  const formulas = ((cfg?.formulas as Formula[]) ?? []).filter((f) => f && f.key);
  const agencyFee = num(client?.agency_fee_monthly);

  const formula_columns: FormulaColumn[] = formulas.map((f) => ({
    key: f.key,
    label: f.label || f.key,
    direction: f.direction ?? 'higher',
  }));

  if (adIds.length === 0) {
    return { group_by: groupBy, formula_columns, formula_errors: {}, rows: [], rollup: EMPTY_TOTALS };
  }

  // 3. תוויות קריאטיבים
  const creativeLabel = new Map<string, string>();
  if (groupBy === 'creative') {
    const creativeIds = [...new Set(ads.map((a) => a.creative_id).filter(Boolean) as string[])];
    if (creativeIds.length > 0) {
      const { data: creatives } = await sb
        .from('creatives')
        .select('id, concept, meta_creative_id')
        .in('id', creativeIds);
      for (const c of creatives ?? []) {
        creativeLabel.set(
          c.id as string,
          (c.concept as string) || `קריאטיב ${c.meta_creative_id ?? c.id}`,
        );
      }
    }
  }

  // 3ב. מיפוי קריאטיב → קטגוריה (מוצר), לפילוח לפי קטגוריה
  const creativeToProduct = new Map<string, { id: string; label: string }>();
  if (groupBy === 'category') {
    const creativeIds = [...new Set(ads.map((a) => a.creative_id).filter(Boolean) as string[])];
    if (creativeIds.length > 0) {
      const { data: creatives } = await sb
        .from('creatives')
        .select('id, product_id')
        .in('id', creativeIds);
      const productIds = [
        ...new Set((creatives ?? []).map((c) => c.product_id).filter(Boolean) as string[]),
      ];
      const productName = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await sb.from('products').select('id, name').in('id', productIds);
        for (const p of products ?? []) productName.set(p.id as string, (p.name as string) || (p.id as string));
      }
      for (const c of creatives ?? []) {
        const pid = c.product_id as string | null;
        if (pid) {
          creativeToProduct.set(c.id as string, { id: pid, label: productName.get(pid) || pid });
        }
      }
    }
  }

  // ---- אגירת buckets ----
  const buckets = new Map<string, { label: string; sums: Sums }>();

  function keyLabel(adRow: { campaign_id: string; creative_id: string | null }, date: string) {
    if (groupBy === 'day') return { key: date, label: date };
    if (groupBy === 'week') {
      const w = weekStart(date);
      return { key: w, label: `שבוע ${w}` };
    }
    if (groupBy === 'campaign') {
      return { key: adRow.campaign_id, label: campaignName.get(adRow.campaign_id) || adRow.campaign_id };
    }
    if (groupBy === 'category') {
      const p = adRow.creative_id ? creativeToProduct.get(adRow.creative_id) : null;
      return p ? { key: p.id, label: p.label } : { key: '(none)', label: 'ללא קטגוריה' };
    }
    return {
      key: adRow.creative_id ?? '(none)',
      label: adRow.creative_id
        ? creativeLabel.get(adRow.creative_id) || adRow.creative_id
        : '(ללא קריאטיב)',
    };
  }
  function bucket(key: string, label: string) {
    let b = buckets.get(key);
    if (!b) {
      b = { label, sums: { ...ZERO_SUMS } };
      buckets.set(key, b);
    }
    return b;
  }

  // 4. daily_metrics בטווח — בסיס + revenue ל-purchase
  type DM = {
    ad_id: string;
    date: string;
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    purchases: number;
    purchase_value: number;
    video_plays: number;
    video_thruplays: number;
  };
  for (const ids of chunk(adIds, 100)) {
    const { data, error } = await sb
      .from('daily_metrics')
      .select(
        'ad_id, date, spend, impressions, reach, clicks, purchases, purchase_value, video_plays, video_thruplays',
      )
      .in('ad_id', ids)
      .gte('date', since)
      .lte('date', until);
    if (error) throw new Error(error.message);
    for (const r of (data as DM[]) ?? []) {
      const a = adMap.get(r.ad_id);
      if (!a) continue;
      const isPurchase = campConv.get(a.campaign_id) === 'purchase';
      const { key, label } = keyLabel(a, r.date);
      const b = bucket(key, label);
      b.sums.spend += num(r.spend);
      b.sums.impressions += num(r.impressions);
      b.sums.reach += num(r.reach);
      b.sums.clicks += num(r.clicks);
      b.sums.videoPlays += num(r.video_plays);
      b.sums.videoThruplays += num(r.video_thruplays);
      if (isPurchase) {
        b.sums.revenue += num(r.purchase_value);
        b.sums.orders += num(r.purchases);
      }
    }
  }

  // 5. leads — revenue ל-lead: closed לפי closed_at; ספירת leads לפי created_at (שניהם בטווח)
  const hasLeadAds = ads.some((a) => campConv.get(a.campaign_id) === 'lead');
  if (hasLeadAds) {
    type LeadRow = {
      ad_id: string | null;
      created_at: string | null;
      closed_at: string | null;
      status: string | null;
      deal_value: number | null;
    };
    for (const ids of chunk(adIds, 100)) {
      const { data, error } = await sb
        .from('leads')
        .select('ad_id, created_at, closed_at, status, deal_value')
        .in('ad_id', ids);
      if (error) throw new Error(error.message);
      for (const l of (data as LeadRow[]) ?? []) {
        if (!l.ad_id) continue;
        const a = adMap.get(l.ad_id);
        if (!a) continue;

        const created = (l.created_at ?? '').slice(0, 10);
        if (created && created >= since && created <= until) {
          const { key, label } = keyLabel(a, created);
          bucket(key, label).sums.leads += 1;
        }

        if (l.status === 'closed' && l.closed_at) {
          const closed = l.closed_at.slice(0, 10);
          if (closed >= since && closed <= until) {
            const { key, label } = keyLabel(a, closed);
            const b = bucket(key, label);
            b.sums.closes += 1;
            b.sums.revenue += num(l.deal_value);
          }
        }
      }
    }
  }

  // הקצאת agency_fee pro-rata לפי spend
  const totalSpend = [...buckets.values()].reduce((s, b) => s + b.sums.spend, 0);
  const formula_errors: Record<string, string> = {};

  const rows: MetricsRow[] = [...buckets.entries()].map(([key, b]) => {
    const r = ratios(b.sums);
    const cr = costRatios(b.sums);
    const vr = videoRatios(b.sums);
    const run = runFormulas(formulaScope(b.sums, agencyFee, totalSpend), variables, formulas);
    Object.assign(formula_errors, run.errors);
    return {
      key,
      label: b.label,
      spend: b.sums.spend,
      impressions: b.sums.impressions,
      reach: b.sums.reach,
      clicks: b.sums.clicks,
      ctr: r.ctr,
      cpm: r.cpm,
      leads: b.sums.leads,
      cpc: cr.cpc,
      cpl: cr.cpl,
      hook_rate: vr.hook_rate,
      thruplay_rate: vr.thruplay_rate,
      frequency: vr.frequency,
      revenue: b.sums.revenue,
      closes: b.sums.closes,
      computed: run.values,
    };
  });

  if (groupBy === 'day' || groupBy === 'week') {
    rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  } else {
    rows.sort((a, b) => b.spend - a.spend);
  }

  // רולאפ — סכום הכמויות, חישוב מחדש (allocated_fee מלא)
  const totalSums = [...buckets.values()].reduce<Sums>(
    (s, b) => ({
      spend: s.spend + b.sums.spend,
      impressions: s.impressions + b.sums.impressions,
      reach: s.reach + b.sums.reach,
      clicks: s.clicks + b.sums.clicks,
      revenue: s.revenue + b.sums.revenue,
      orders: s.orders + b.sums.orders,
      leads: s.leads + b.sums.leads,
      closes: s.closes + b.sums.closes,
      videoPlays: s.videoPlays + b.sums.videoPlays,
      videoThruplays: s.videoThruplays + b.sums.videoThruplays,
    }),
    { ...ZERO_SUMS },
  );
  const rollupRatios = ratios(totalSums);
  const rollupCost = costRatios(totalSums);
  const rollupVideo = videoRatios(totalSums);
  const rollupRun = runFormulas(formulaScope(totalSums, agencyFee, totalSpend), variables, formulas);
  Object.assign(formula_errors, rollupRun.errors);

  const rollup: MetricsTotals = {
    spend: totalSums.spend,
    impressions: totalSums.impressions,
    reach: totalSums.reach,
    clicks: totalSums.clicks,
    ctr: rollupRatios.ctr,
    cpm: rollupRatios.cpm,
    leads: totalSums.leads,
    cpc: rollupCost.cpc,
    cpl: rollupCost.cpl,
    hook_rate: rollupVideo.hook_rate,
    thruplay_rate: rollupVideo.thruplay_rate,
    frequency: rollupVideo.frequency,
    revenue: totalSums.revenue,
    closes: totalSums.closes,
    computed: rollupRun.values,
  };

  return { group_by: groupBy, formula_columns, formula_errors, rows, rollup };
}
