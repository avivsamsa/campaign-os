'use client';

import { useEffect, useState } from 'react';

type Creative = {
  id: string;
  concept: string | null;
  hook: string | null;
  format: string | null;
  status: string | null;
  asset_url: string | null;
  full_asset_url: string | null;
  asset_type: 'image' | 'video' | null;
  meta_creative_id: string | null;
};

function title(c: Creative): string {
  return c.concept || (c.meta_creative_id ? `קריאטיב ${c.meta_creative_id}` : c.id.slice(0, 8));
}

export default function PortalCreativesGallery({ token }: { token: string }) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Creative | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/${token}/creatives`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setCreatives(d.creatives as Creative[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="card muted">טוען קריאטיבים…</div>;
  if (error) return <div className="banner-error">{error}</div>;
  if (creatives.length === 0) return <div className="card muted">אין עדיין קריאטיבים להצגה.</div>;

  return (
    <>
      <div className="creative-grid">
        {creatives.map((c) => (
          <div key={c.id} className="creative-card">
            <button type="button" className="thumb" onClick={() => setViewing(c)} title="צפייה בנכס המלא">
              {c.asset_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.asset_url} alt="" />
              ) : (
                <span className="thumb-empty">אין תצוגה מקדימה</span>
              )}
              {c.format && <span className="thumb-badge">{c.format}</span>}
              {c.asset_type === 'video' && <span className="thumb-play">▶</span>}
            </button>
            <div className="body">
              <div className="card-foot">
                <span className="meta-name" title={title(c)}>{title(c)}</span>
                {c.status && <span className="badge">{c.status}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div className="lightbox" onClick={() => setViewing(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setViewing(null)} aria-label="סגור">✕</button>
            {viewing.full_asset_url && viewing.asset_type === 'video' ? (
              <video src={viewing.full_asset_url} controls autoPlay className="lightbox-media" />
            ) : viewing.full_asset_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.full_asset_url} alt="" className="lightbox-media" />
            ) : (
              <div className="lightbox-fallback">
                {viewing.asset_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewing.asset_url} alt="" className="lightbox-media" />
                ) : null}
                <p className="muted">
                  {viewing.asset_type === 'video'
                    ? 'נכס הווידאו המלא לא זמין — מוצגת תמונת התצוגה.'
                    : 'נכס מלא לא זמין'}
                </p>
              </div>
            )}
            <div className="lightbox-caption">{title(viewing)}</div>
          </div>
        </div>
      )}
    </>
  );
}
