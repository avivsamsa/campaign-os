'use client';

import { useEffect, useState } from 'react';
import type { EnrichedLead } from '@/lib/leads';
import LeadsManager from '../clients/[id]/leads/LeadsManager';

type ClientOption = { id: string; name: string };

export default function GlobalLeadsPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [leads, setLeads] = useState<EnrichedLead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // טעינת לקוחות; ברירת מחדל ללקוח הראשון
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        const list: ClientOption[] = d.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId(list[0].id);
      })
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, []);

  // טעינת לידים ללקוח הנבחר — אותו מקור נתונים של עמוד הלקוח
  useEffect(() => {
    if (!clientId) {
      setLeads(null);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`/api/clients/${clientId}/leads`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLeads(d.leads as EnrichedLead[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <main className="container">
      <div className="breadcrumb">לידים</div>
      <h1>לידים</h1>

      <div className="card">
        <div className="field" style={{ marginBottom: 0, maxWidth: 320 }}>
          <label>לקוח</label>
          <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— בחר לקוח —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {!clientId ? (
        <div className="card muted">בחר לקוח כדי להציג את הלידים שלו.</div>
      ) : loading || leads === null ? (
        <div className="card muted">טוען לידים…</div>
      ) : (
        // אותו קומפוננט של עמוד הלקוח — key מאלץ remount בהחלפת לקוח
        <LeadsManager key={clientId} clientId={clientId} initialLeads={leads} />
      )}
    </main>
  );
}
