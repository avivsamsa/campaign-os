import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import DeleteClientButton from './DeleteClientButton';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  const clients = (data ?? []) as Client[];

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/">בית</Link> / לקוחות
      </div>
      <div className="row-between">
        <h1>לקוחות</h1>
        <Link className="btn primary" href="/clients/new">
          + לקוח חדש
        </Link>
      </div>

      {error && <p className="banner-error">שגיאה בטעינה: {error.message}</p>}

      {!error && clients.length === 0 && (
        <div className="card muted">אין לקוחות עדיין. לחץ על "לקוח חדש" כדי להתחיל.</div>
      )}

      {clients.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>שם</th>
              <th>Meta Account</th>
              <th>נישה</th>
              <th>מטבע</th>
              <th>Gross margin</th>
              <th>Agency fee</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/clients/${c.id}`}>{c.name}</Link>
                </td>
                <td>{c.meta_account_id}</td>
                <td>{c.niche ?? '—'}</td>
                <td>{c.currency ?? '—'}</td>
                <td>{c.gross_margin}</td>
                <td>{c.agency_fee_monthly ?? 0}</td>
                <td>
                  <DeleteClientButton id={c.id} name={c.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
