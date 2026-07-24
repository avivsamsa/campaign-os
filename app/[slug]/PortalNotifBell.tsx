'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

type Item =
  | { kind: 'message'; at: number; id: string; title: string; body: string; created_at: string }
  | { kind: 'lead'; at: number; id: string; name: string | null; category: string | null; created_at: string };

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

export default function PortalNotifBell({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [msgSeen, setMsgSeen] = useState(0);
  const [now, setNow] = useState(0);
  // הווילון מרונדר ב-portal ל-body: ההאדר משתמש ב-backdrop-filter, שהופך אותו
  // ל-containing block ל-position:fixed — בלי ה-portal הווילון נכלא לגובה ההאדר.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setNow(Date.now());
    const v = Number(localStorage.getItem('portal_msg_seen') || '0');
    setMsgSeen(v);
  }, []);

  const load = useCallback(async () => {
    try {
      // endpoint אחד קל במקום שתי בקשות כבדות
      const res = (await fetch('/api/portal/notifs')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))) as any;
      const leads = res.leads ?? [];
      const msgs = res.messages ?? [];
      const merged: Item[] = [
        ...msgs.map((m: { id: string; title: string; body: string; created_at: string }) => ({
          kind: 'message' as const, at: new Date(m.created_at).getTime(), id: m.id, title: m.title, body: m.body, created_at: m.created_at,
        })),
        ...leads.map((l: { id: string; name: string | null; category_name: string | null; created_at: string }) => ({
          kind: 'lead' as const, at: new Date(l.created_at).getTime(), id: l.id, name: l.name, category: l.category_name, created_at: l.created_at,
        })),
      ].sort((a, b) => b.at - a.at);
      setItems(merged);
      setNow(Date.now());
    } catch {
      /* שקט */
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60000);
    return () => clearInterval(iv);
  }, [load]);

  function openDrawer() {
    setOpen(true);
    const stamp = Date.now();
    setMsgSeen(stamp);
    try { localStorage.setItem('portal_msg_seen', String(stamp)); } catch { /* ignore */ }
  }

  const newLeadCount = items.filter((i) => i.kind === 'lead').length;
  const unreadMsg = items.filter((i) => i.kind === 'message' && i.at > msgSeen).length;
  const unread = newLeadCount + unreadMsg;

  return (
    <>
      <style>{`
        .pnbell-hbtn {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--border); background: var(--surface); color: var(--text);
          transition: border-color .15s, background .15s;
        }
        .pnbell-hbtn:hover { border-color: var(--border-strong); background: var(--surface-2); }
        .pnbell-badge {
          position: absolute; top: -5px; inset-inline-end: -5px; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 999px; background: var(--primary); color: #fff; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg);
        }
        .pnbell-overlay {
          position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,0.5);
          opacity: 0; pointer-events: none; transition: opacity .25s var(--ease);
        }
        .pnbell-overlay.open { opacity: 1; pointer-events: auto; }
        .pnbell-drawer {
          position: fixed; left: 0; top: 0; bottom: 0; z-index: 61; width: min(380px, 88vw);
          background: var(--surface); border-inline-end: 1px solid var(--border);
          transform: translateX(-100%); transition: transform .28s var(--ease-out);
          display: flex; flex-direction: column; box-shadow: var(--shadow-lg);
        }
        .pnbell-drawer.open { transform: translateX(0); }
        .pnbell-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 12px; }
        .pnbell-head h2 { margin: 0; font-size: 1.2rem; }
        .pnbell-close { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }
        .pnbell-list { flex: 1; overflow-y: auto; padding-bottom: 20px; }
        .pnbell-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-top: 1px solid var(--border); text-decoration: none; }
        .pnbell-row.lead { background: var(--primary-soft); }
        a.pnbell-row:hover { background: var(--surface-2); }
        .pnbell-av { width: 46px; height: 46px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; background: var(--surface-2); border: 1px solid var(--border); position: relative; }
        .pnbell-av.msg { background: var(--primary-soft); border: none; color: var(--primary); }
        .pnbell-av-txt { color: var(--text-2); font-size: 16px; font-weight: 800; }
        .pnbell-av-badge { position: absolute; bottom: -2px; inset-inline-start: -2px; width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
        .pnbell-body { flex: 1; min-width: 0; }
        .pnbell-title { color: var(--text); font-weight: 800; font-size: 14.5px; text-align: right; }
        .pnbell-sub { color: var(--text-2); font-size: 13px; text-align: right; margin-top: 2px; line-height: 1.35; }
        .pnbell-meta { color: var(--muted); font-size: 12px; text-align: right; margin-top: 2px; }
        .pnbell-empty { text-align: center; color: var(--muted); padding: 60px 20px; }
      `}</style>

      <button className="pnbell-hbtn" onClick={openDrawer} aria-label="התראות">
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="pnbell-badge">{unread}</span>}
      </button>

      {mounted && createPortal(
      <div className={`pnbell-overlay ${open ? 'open' : ''}`.trim()} onClick={() => setOpen(false)} aria-hidden={!open}>
        <aside className={`pnbell-drawer ${open ? 'open' : ''}`.trim()} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="התראות">
          <div className="pnbell-head">
            <h2>התראות</h2>
            <button className="pnbell-close" onClick={() => setOpen(false)} aria-label="סגירה">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="pnbell-list">
            {items.length === 0 ? (
              <div className="pnbell-empty">אין התראות חדשות</div>
            ) : (
              items.map((it) =>
                it.kind === 'message' ? (
                  <div className="pnbell-row" key={`m_${it.id}`}>
                    <span className="pnbell-av msg">
                      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8A3 3 0 0 1 6 15.5" /></svg>
                    </span>
                    <span className="pnbell-body">
                      <span className="pnbell-title">{it.title}</span>
                      <span className="pnbell-sub">{it.body}</span>
                      <span className="pnbell-meta">{timeAgo(it.created_at, now)}</span>
                    </span>
                  </div>
                ) : (
                  <Link className="pnbell-row lead" key={`l_${it.id}`} href={`/${slug}/leads`} onClick={() => setOpen(false)}>
                    <span className="pnbell-av">
                      <span className="pnbell-av-txt">{initials(it.name)}</span>
                      <span className="pnbell-av-badge">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
                      </span>
                    </span>
                    <span className="pnbell-body">
                      <span className="pnbell-title">{it.name || 'ליד חדש'}</span>
                      <span className="pnbell-sub">ליד חדש ממתין לטיפול</span>
                      <span className="pnbell-meta">{it.category ? `${it.category} · ` : ''}{timeAgo(it.created_at, now)}</span>
                    </span>
                  </Link>
                ),
              )
            )}
          </div>
        </aside>
      </div>,
      document.body,
      )}
    </>
  );
}
