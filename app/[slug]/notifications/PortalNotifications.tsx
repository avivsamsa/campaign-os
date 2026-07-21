import Link from 'next/link';

type Item =
  | { kind: 'message'; at: number; id: string; title: string; body: string; created_at: string }
  | { kind: 'lead'; at: number; id: string; name: string | null; category_name: string | null; created_at: string };

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'הרגע';
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} י׳`;
  return `לפני ${Math.floor(d / 7)} שב׳`;
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

export default function PortalNotifications({
  slug,
  items,
  now,
}: {
  slug: string;
  items: Item[];
  now: number;
}) {
  return (
    <div className="pnotif">
      <style>{`
        .pnotif { max-width: 640px; margin: 0 auto; }
        .pnotif-head { color: var(--text); font-size: 20px; font-weight: 800; text-align: right; margin: 4px 2px 10px; }
        .pnotif-row { display: flex; align-items: center; gap: 12px; padding: 13px 4px; border-bottom: 1px solid var(--border); text-decoration: none; }
        .pnotif-row.unread { background: var(--primary-soft); border-bottom-color: transparent; border-radius: var(--radius); padding-inline: 12px; }
        a.pnotif-row:hover { background: var(--surface-2); }
        .pnotif-avatar { width: 52px; height: 52px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; position: relative; background: var(--surface-2); border: 1px solid var(--border); }
        .pnotif-avatar.msg { background: var(--primary-soft); border: none; }
        .pnotif-avatar-txt { color: var(--text-2); font-size: 18px; font-weight: 800; }
        .pnotif-badge { position: absolute; bottom: -1px; inset-inline-start: -1px; width: 21px; height: 21px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg); }
        .pnotif-body { flex: 1; min-width: 0; }
        .pnotif-title { color: var(--text); font-size: 15.5px; font-weight: 800; text-align: right; }
        .pnotif-sub { color: var(--text-2); font-size: 14px; text-align: right; margin-top: 3px; line-height: 1.4; }
        .pnotif-lead-sub { color: var(--text-2); font-size: 15px; text-align: right; line-height: 1.4; }
        .pnotif-lead-sub b { color: var(--text); font-weight: 800; }
        .pnotif-meta { color: var(--muted); font-size: 13px; text-align: right; margin-top: 3px; }
        .pnotif-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--primary); flex: none; }
        .pnotif-empty { text-align: center; color: var(--muted); padding: 80px 0; }
        .pnotif-empty-icon { width: 68px; height: 68px; border-radius: 50%; background: var(--surface); display: inline-flex; align-items: center; justify-content: center; color: var(--muted); margin-bottom: 12px; }
      `}</style>

      {items.length === 0 ? (
        <div className="pnotif-empty">
          <div className="pnotif-empty-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>אין התראות חדשות</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>כאן יופיעו עדכונים מהסוכנות ולידים חדשים</div>
        </div>
      ) : (
        <>
          <div className="pnotif-head">חדש</div>
          {items.map((it) =>
            it.kind === 'message' ? (
              <div className="pnotif-row" key={`m_${it.id}`}>
                <span className="pnotif-avatar msg">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8A3 3 0 0 1 6 15.5"/></svg>
                </span>
                <span className="pnotif-body">
                  <span className="pnotif-title">{it.title}</span>
                  <span className="pnotif-sub">{it.body}</span>
                  <span className="pnotif-meta">{timeAgo(it.created_at, now)}</span>
                </span>
              </div>
            ) : (
              <Link className="pnotif-row unread" key={`l_${it.id}`} href={`/${slug}/leads`}>
                <span className="pnotif-avatar">
                  <span className="pnotif-avatar-txt">{initials(it.name)}</span>
                  <span className="pnotif-badge">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  </span>
                </span>
                <span className="pnotif-body">
                  <span className="pnotif-lead-sub"><b>{it.name || 'ליד חדש'}</b> - ליד חדש ממתין לטיפול</span>
                  <span className="pnotif-meta">{it.category_name ? `${it.category_name} · ` : ''}{timeAgo(it.created_at, now)}</span>
                </span>
                <span className="pnotif-dot" />
              </Link>
            ),
          )}
        </>
      )}
    </div>
  );
}
