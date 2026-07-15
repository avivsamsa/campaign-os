import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מחיקת מידע — Campaign OS',
  description: 'הוראות לבקשת מחיקת מידע אישי מהמערכת.',
};

const UPDATED = '16 ביולי 2026';
const CONTACT_EMAIL = 'm@avivsamsa.co.il';

export default function DataDeletionPage() {
  return (
    <main className="legal-doc">
      <style>{`
        .legal-doc {
          max-width: 760px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem 4rem;
          color: var(--text);
          line-height: 1.7;
        }
        .legal-doc h1 { font-size: 1.9rem; margin: 0 0 0.25rem; }
        .legal-doc .updated { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .legal-doc h2 { font-size: 1.2rem; margin: 2rem 0 0.6rem; }
        .legal-doc p, .legal-doc li { color: var(--text-2); font-size: 1rem; }
        .legal-doc ol, .legal-doc ul { padding-inline-start: 1.2rem; }
        .legal-doc li { margin-bottom: 0.35rem; }
        .legal-doc a { color: var(--primary); }
        .legal-doc .intro { font-size: 1.05rem; color: var(--text); }
      `}</style>

      <h1>הוראות מחיקת מידע</h1>
      <div className="updated">עודכן לאחרונה: {UPDATED}</div>

      <p className="intro">
        מערכת ניהול הלידים והקמפיינים, המופעלת על ידי AVIVSAMSA, מכבדת את זכותך למחיקת המידע האישי
        שלך. בעמוד זה מוסבר כיצד לבקש מחיקה.
      </p>

      <h2>איזה מידע נשמר</h2>
      <p>
        המערכת עשויה לשמור פרטי התקשרות שהוזנו בטופס ליד של מודעת Facebook / Instagram (שם, טלפון,
        אימייל), לצורך העברת הפנייה למפרסם הרלוונטי. איננו אוספים מידע נוסף מעבר לכך.
      </p>

      <h2>איך לבקש מחיקה</h2>
      <ol>
        <li>
          שלח/י אימייל אל <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> עם הכותרת
          &quot;בקשת מחיקת מידע&quot;.
        </li>
        <li>ציין/י את הפרטים שאיתם נמסרה הפנייה (שם ו/או מספר טלפון ו/או אימייל) לצורך זיהוי.</li>
        <li>נאתר את המידע ונמחק אותו מהמערכת בתוך זמן סביר, ולכל היותר 30 יום.</li>
        <li>נשלח אישור לכתובת האימייל שממנה נשלחה הבקשה.</li>
      </ol>

      <h2>הערה</h2>
      <p>
        מאחר שהמידע שייך למפרסם שהריץ את הקמפיין, ייתכן שנפנה גם אליו לצורך תיאום המחיקה. מידע שאנו
        מחויבים לשמור על פי דין עשוי להישמר לתקופה הנדרשת בחוק.
      </p>

      <h2>יצירת קשר</h2>
      <p>
        לכל שאלה בנוגע למחיקת מידע: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </main>
  );
}
