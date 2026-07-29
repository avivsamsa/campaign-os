import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client, ClientBrain } from '@/lib/types';
import type { Formula } from '@/lib/profit';
import { fetchClientLeads } from '@/lib/leads';
import { spendByAdId } from '@/lib/metrics';
import ClientTabs from '../ClientTabs';

const NO_CATEGORY = '__none__';

export const dynamic = 'force-dynamic';

export default async function ClientSettingsPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !client) notFound();

  const { data: brain } = await supabase
    .from('client_brain')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle();

  const { data: profitConfig } = await supabase
    .from('profit_config')
    .select('variables, formulas')
    .eq('client_id', params.id)
    .maybeSingle();

  const leads = await fetchClientLeads(params.id);

  // הוצאת פרסום לפי קטגוריה (כל התקופה) — לחישוב עלות לרכישה (CPA) בטאב אנליטיקה,
  // כולל כשמסננים קטגוריות. ייחוס: הוצאת כל מודעה מחולקת לקטגוריות של הלידים שהיא הביאה
  // (ad_id של הליד → category_id), pro-rata לפי כמות הלידים באותה מודעה.
  const spendByCategory: Record<string, number> = {};
  try {
    const adSpend = await spendByAdId(params.id);
    // ad_id → פירוק הלידים לקטגוריות + סך הלידים של אותה מודעה
    const adCatCounts = new Map<string, Map<string, number>>();
    const adTotals = new Map<string, number>();
    for (const l of leads) {
      if (!l.ad_id) continue;
      const cat = l.category_id ?? NO_CATEGORY;
      const counts = adCatCounts.get(l.ad_id) ?? new Map<string, number>();
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
      adCatCounts.set(l.ad_id, counts);
      adTotals.set(l.ad_id, (adTotals.get(l.ad_id) ?? 0) + 1);
    }
    for (const [adId, spend] of adSpend) {
      const counts = adCatCounts.get(adId);
      const total = adTotals.get(adId) ?? 0;
      if (!counts || total === 0) continue; // מודעה עם הוצאה אך בלי לידים — לא ניתן לייחס
      for (const [cat, cnt] of counts) {
        spendByCategory[cat] = (spendByCategory[cat] ?? 0) + spend * (cnt / total);
      }
    }
  } catch {
    /* אין נתוני מדדים — CPA יוצג כלא-זמין */
  }

  const typedClient = client as Client;

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> /{' '}
        <Link href={`/clients/${params.id}`}>{typedClient.name}</Link> / הגדרות
      </div>
      <ClientTabs
        client={typedClient}
        brain={(brain ?? null) as ClientBrain | null}
        profitConfig={
          (profitConfig as { variables: Record<string, unknown>; formulas: Formula[] } | null) ?? null
        }
        leads={leads}
        spendByCategory={spendByCategory}
      />
    </main>
  );
}
