'use client';

import { useState } from 'react';
import type { Client, ClientBrain } from '@/lib/types';
import type { Formula } from '@/lib/profit';
import type { EnrichedLead } from '@/lib/leads';
import ClientEditor from './ClientEditor';
import ProfitConfigEditor from './ProfitConfigEditor';
import SyncButton from './SyncButton';
import LeadsManager from './leads/LeadsManager';
import PortalSettingsEditor from './PortalSettingsEditor';
import CategoriesEditor from './CategoriesEditor';
import MessagesEditor from './MessagesEditor';
import ClientAnalytics from './ClientAnalytics';

type TabId = 'overview' | 'brain' | 'profit' | 'leads' | 'analytics' | 'categories' | 'sync' | 'portal' | 'messages';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'סקירה' },
  { id: 'brain', label: 'Brain' },
  { id: 'profit', label: 'מנוע רווח' },
  { id: 'leads', label: 'לידים' },
  { id: 'analytics', label: 'אנליטיקה' },
  { id: 'categories', label: 'קטגוריות' },
  { id: 'messages', label: 'עדכונים' },
  { id: 'sync', label: 'סנכרון' },
  { id: 'portal', label: 'פורטל' },
];

type Props = {
  client: Client;
  brain: ClientBrain | null;
  profitConfig: { variables: Record<string, unknown>; formulas: Formula[] } | null;
  leads: EnrichedLead[];
  spendByCategory: Record<string, number>;
};

export default function ClientTabs({ client, brain, profitConfig, leads, spendByCategory }: Props) {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <>
      <h1>{client.name}</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* כל טאב מרנדר קומפוננט קיים — אותה לוגיקה, רק ארגון מחדש */}
      {tab === 'overview' && <ClientEditor client={client} brain={brain} section="account" />}
      {tab === 'brain' && <ClientEditor client={client} brain={brain} section="brain" />}
      {tab === 'profit' && (
        <ProfitConfigEditor
          clientId={client.id}
          grossMargin={client.gross_margin}
          initial={profitConfig}
        />
      )}
      {tab === 'leads' && <LeadsManager clientId={client.id} initialLeads={leads} />}
      {tab === 'analytics' && <ClientAnalytics leads={leads} spendByCategory={spendByCategory} currency={client.currency} />}
      {tab === 'sync' && <SyncButton clientId={client.id} />}
      {tab === 'categories' && <CategoriesEditor clientId={client.id} />}
      {tab === 'messages' && <MessagesEditor clientId={client.id} />}
      {tab === 'portal' && <PortalSettingsEditor clientId={client.id} />}
    </>
  );
}
