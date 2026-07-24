// מסך שלד לדשבורד הפורטל — תגובה מיידית גם בחזרה לעמוד הבית.
export default function PortalHomeLoading() {
  return (
    <div className="skel-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">טוען…</span>

      {/* כרטיסי KPI */}
      <div className="skel-grid" style={{ marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skel skel-card" />
        ))}
      </div>

      {/* כפתור "כל הלידים" */}
      <div className="skel" style={{ height: 52, borderRadius: 14, marginBottom: 26 }} />

      {/* כותרת קמפיינים */}
      <div className="skel" style={{ width: 140, height: 18, margin: '0 auto 14px' }} />

      {/* כרטיסי קמפיינים */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skel" style={{ height: 96, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </div>
  );
}
