'use client';

import { useState } from 'react';
import type { Client, ClientBrain } from '@/lib/types';
import type { Formula } from '@/lib/profit';
import type { EnrichedLead } from '@/lib/leads';
import ClientEditor from './ClientEditor';
import ProfitConfigEditor from './ProfitConfigEditor';
import SyncButton from './SyncButton';
import LeadsManager from './leads/LeadsManager';

type TabId = 'overview' | 'brain' | 'profit' | 'leads' | 'sync';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'סקירה' },
  { id: 'brain', label: 'Brain' },
  { id: 'profit', label: 'מנוע רווח' },
  { id: 'leads', label: 'לידים' },
  { id: 'sync', label: 'סנכרון' },
];

type Props = {
  client: Client;
  brain: ClientBrain | null;
  profitConfig: { variables: Record<string, unknown>; formulas: Formula[] } | null;
  leads: EnrichedLead[];
};

export default function ClientTabs({ client, brain, profitConfig, leads }: Props) {
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
      {tab === 'sync' && <SyncButton clientId={client.id} />}
    </>
  );
}
