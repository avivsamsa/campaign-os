import Link from 'next/link';
import type { PortalDashboard as DashData } from '@/lib/portal-dashboard';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

const ICONS: Record<string, string> = {
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  chevron: '<polyline points="15 18 9 12 15 6"/>',
};

function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export default function PortalDashboard({
  slug,
  data,
}: {
  slug: string;
  data: DashData;
}) {
  const t = data.totals;
  const kpis = [
    { key: 'leads', label: 'סה״כ לידים', icon: 'users', value: nf.format(t.leads) },
    { key: 'new', label: 'חדשים לטיפול', icon: 'inbox', value: nf.format(t.new), accent: t.new > 0 },
    { key: 'revenue', label: 'מכירות', icon: 'bag', value: `₪${nf.format(t.revenue)}` },
    { key: 'profit', label: 'רווח', icon: 'trend', value: `₪${nf.format(t.profit)}` },
  ];

  return (
    <div className="pdash">
      <style>{`
        .pdash { max-width: 760px; margin: 0 auto; }
        .pdash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .pdash-grid { grid-template-columns: repeat(4, 1fr); } }
        .pdash-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .pdash-card-top { display: flex; align-items: center; justify-content: space-between; }
        .pdash-card-label { color: var(--muted); font-size: 13px; font-weight: 500; }
        .pdash-card-top svg { color: var(--muted-2); }
        .pdash-card-value { color: var(--text); font-size: 27px; font-weight: 800; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
        .pdash-card-value.accent { color: var(--primary); }
        .pdash-cta { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; height: 52px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); color: var(--text-2); font-size: 15px; font-weight: 700; text-decoration: none; transition: background .15s, border-color .15s; }
        .pdash-cta:hover { background: var(--surface-2); border-color: var(--border-strong); }
        .pdash-section { color: var(--text-2); font-size: 15px; font-weight: 700; text-align: center; margin: 28px 0 14px; }
        .pdash-cats { display: flex; flex-direction: column; gap: 12px; }
        .pdash-cat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 15px 16px; display: flex; flex-direction: column; gap: 13px; text-decoration: none; transition: border-color .15s, transform .1s; }
        .pdash-cat:hover { border-color: var(--border-strong); transform: translateY(-1px); }
        .pdash-cat-top { display: flex; align-items: center; justify-content: space-between; }
        .pdash-cat-lead { display: flex; align-items: center; gap: 12px; }
        .pdash-cat-icon { width: 42px; height: 42px; border-radius: 12px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; flex: none; }
        .pdash-cat-name { color: var(--text); font-size: 16px; font-weight: 800; }
        .pdash-cat-count { color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
        .pdash-cat-trail { display: flex; align-items: center; gap: 10px; }
        .pdash-cat-trail > svg { color: var(--muted-2); }
        .pdash-pill { background: var(--primary); color: #fff; border-radius: 999px; padding: 4px 11px; font-size: 12.5px; font-weight: 800; white-space: nowrap; }
        .pdash-track { height: 5px; border-radius: 3px; background: var(--surface-2); overflow: hidden; }
        .pdash-track-fill { height: 100%; border-radius: 3px; background: var(--primary); }
      `}</style>

      <div className="pdash-grid">
        {kpis.map((k) => (
          <div className="pdash-card" key={k.key}>
            <div className="pdash-card-top">
              <span className="pdash-card-label">{k.label}</span>
              <Icon name={k.icon} size={15} />
            </div>
            <span className={`pdash-card-value${k.accent ? ' accent' : ''}`}>{k.value}</span>
          </div>
        ))}
      </div>

      <Link className="pdash-cta" href={`/${slug}/leads`}>
        <Icon name="chevron" size={19} />
        כל הלידים
      </Link>

      {data.categories.length > 1 ? (
        <>
          <div className="pdash-section">קמפיינים פעילים</div>
          <div className="pdash-cats">
            {data.categories.map((cat) => {
              const pct = cat.count > 0 ? Math.max(4, Math.min(100, Math.round((cat.new_count / cat.count) * 100))) : 0;
              return (
                <Link className="pdash-cat" key={cat.key} href={`/${slug}/leads?category=${encodeURIComponent(cat.key)}`}>
                  <div className="pdash-cat-top">
                    <div className="pdash-cat-lead">
                      <span className="pdash-cat-icon"><Icon name="layers" size={19} /></span>
                      <span>
                        <span className="pdash-cat-name">{cat.name}</span>
                        <br />
                        <span className="pdash-cat-count">{nf.format(cat.count)} לידים</span>
                      </span>
                    </div>
                    <div className="pdash-cat-trail">
                      {cat.new_count > 0 ? <span className="pdash-pill">{nf.format(cat.new_count)} חדשים</span> : null}
                      <Icon name="chevron" size={18} />
                    </div>
                  </div>
                  <div className="pdash-track"><div className="pdash-track-fill" style={{ width: `${pct}%` }} /></div>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
