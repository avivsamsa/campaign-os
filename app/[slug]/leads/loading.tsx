// מסך שלד לעמוד הלידים — Next.js מציג אותו מיידית בלחיצה, לפני שהשרת מחזיר נתונים.
// בלעדיו הדפדפן "נתקע" על העמוד הקודם עד שהשאילתות חוזרות.
export default function LeadsLoading() {
  return (
    <div className="skel-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">טוען לידים…</span>

      {/* כותרת */}
      <div className="skel" style={{ width: 170, height: 26, marginBottom: 18 }} />

      {/* שורת סיכום */}
      <div className="skel-grid" style={{ marginBottom: 16 }}>
        <div className="skel skel-card" />
        <div className="skel skel-card" />
        <div className="skel skel-card" />
      </div>

      {/* חיפוש */}
      <div className="skel" style={{ height: 46, borderRadius: 12, marginBottom: 14 }} />

      {/* צ'יפים של סטטוסים */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {[70, 92, 78, 84, 66].map((w, i) => (
          <div key={i} className="skel" style={{ width: w, height: 32, borderRadius: 999 }} />
        ))}
      </div>

      {/* שורות לידים */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skel skel-row" />
      ))}
    </div>
  );
}
