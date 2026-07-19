import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות — Campaign OS',
  description: 'מדיניות הפרטיות של מערכת ניהול הלידים והקמפיינים.',
};

const UPDATED = '16 ביולי 2026';
const CONTACT_EMAIL = 'm@avivsamsa.co.il';

export default function PrivacyPage() {
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
        .legal-doc ul { padding-inline-start: 1.2rem; }
        .legal-doc li { margin-bottom: 0.35rem; }
        .legal-doc a { color: var(--primary); }
        .legal-doc .intro { font-size: 1.05rem; color: var(--text); }
      `}</style>

      <h1>מדיניות פרטיות</h1>
      <div className="updated">עודכן לאחרונה: {UPDATED} · <a href="#en">English version below</a></div>

      <p className="intro">
        מדיניות זו מתארת כיצד מערכת ניהול הלידים והקמפיינים (&quot;המערכת&quot;, &quot;אנחנו&quot;),
        המופעלת על ידי AVIVSAMSA, אוספת, משתמשת ושומרת מידע. המערכת היא כלי עסקי (B2B) לניהול
        לידים ונתוני פרסום עבור לקוחותינו המפרסמים.
      </p>

      <h2>1. איזה מידע אנחנו אוספים</h2>
      <ul>
        <li>
          <strong>פרטי לידים</strong> — שם, מספר טלפון וכתובת אימייל, כפי שהוזנו על ידי גולשים
          בטפסי לידים (Lead Ads) של Facebook / Instagram.
        </li>
        <li>
          <strong>נתוני ביצועי פרסום</strong> — מזהי קמפיינים, מודעות, קריאטיבים ומדדים (חשיפות,
          קליקים, הוצאה וכו&apos;) הנמשכים מפלטפורמת המודעות של Meta.
        </li>
        <li>
          <strong>מידע תפעולי</strong> — סטטוס הליד, הערות ותיעוד שהוזנו על ידי המשתמש העסקי
          לצורך ניהול הפנייה.
        </li>
      </ul>

      <h2>2. מקור המידע</h2>
      <p>
        המידע נאסף באמצעות ה-API הרשמי של Meta (Graph API) ומנגנון ה-Webhook של Lead Ads, בהתאם
        להרשאות שהעניק לנו בעל חשבון המודעות. איננו אוספים מידע ישירות מגולשים דרך אתר זה, מלבד
        פרטי ההתחברות של המשתמש העסקי לפורטל.
      </p>

      <h2>3. מטרות השימוש</h2>
      <ul>
        <li>העברת הלידים ללקוח העסקי הרלוונטי שהריץ את הקמפיין, לצורך יצירת קשר וטיפול.</li>
        <li>הצגת נתוני ביצועים וניתוח אפקטיביות של קמפיינים ומודעות.</li>
        <li>ניהול פנימי, שיפור השירות ואבטחת המערכת.</li>
      </ul>

      <h2>4. התפקיד שלנו</h2>
      <p>
        ביחס לפרטי הלידים אנחנו פועלים כ&quot;מעבד מידע&quot; עבור לקוחותינו המפרסמים, שהם
        &quot;בעלי המידע&quot; ואחראים לקשר מול הליד. אנו מעמידים את המידע לרשות הלקוח הספציפי
        שאליו שייך הליד בלבד.
      </p>

      <h2>5. שיתוף מידע</h2>
      <p>אנחנו לא מוכרים מידע אישי. מידע עשוי להיות מונגש רק ל:</p>
      <ul>
        <li>הלקוח העסקי שאליו משויך הליד.</li>
        <li>
          ספקי תשתית המשמשים להפעלת המערכת (אחסון בסיס נתונים, אירוח, ו-Meta כמקור הנתונים) —
          בכפוף להתחייבויות סודיות ואבטחה.
        </li>
        <li>רשויות מוסמכות, אם וכאשר נדרש על פי דין.</li>
      </ul>

      <h2>6. שמירת מידע</h2>
      <p>
        אנו שומרים את המידע כל עוד הוא נדרש למטרות שלשמן נאסף או כל עוד ההתקשרות עם הלקוח בתוקף.
        לאחר מכן המידע נמחק או מונגש לפי בקשת הלקוח.
      </p>

      <h2>7. אבטחת מידע</h2>
      <p>
        אנו נוקטים אמצעים סבירים להגנה על המידע, לרבות תעבורה מוצפנת (HTTPS), בקרת גישה מבוססת
        הרשאות, וסיסמאות מגובבות (hashed). עם זאת, אף מערכת אינה חסינה לחלוטין.
      </p>

      <h2>8. זכויותיך ומחיקת מידע</h2>
      <p>
        ניתן לפנות אלינו בבקשה לעיין במידע, לתקן אותו או למחוק אותו. לבקשת מחיקת מידע אישי, שלח/י
        אימייל אל <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> עם הפרטים הרלוונטיים,
        ונטפל בבקשה בתוך זמן סביר.
      </p>

      <h2>9. עוגיות (Cookies)</h2>
      <p>
        המערכת משתמשת בעוגייה חיונית אחת לשמירת מצב ההתחברות של המשתמש העסקי לפורטל. איננו משתמשים
        בעוגיות פרסום או מעקב של צד שלישי.
      </p>

      <h2>10. שינויים במדיניות</h2>
      <p>
        אנו עשויים לעדכן מדיניות זו מעת לעת. גרסה מעודכנת תפורסם בעמוד זה עם תאריך העדכון המעודכן.
      </p>

      <h2>11. יצירת קשר</h2>
      <p>
        בשאלות בנוגע למדיניות פרטיות זו או לטיפול במידע, ניתן לפנות אל:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <hr id="en" style={{ margin: '3.5rem 0 2.25rem', border: 'none', borderTop: '1px solid var(--border)' }} />

      <div dir="ltr" style={{ textAlign: 'left' }}>
        <h1>Privacy Policy</h1>
        <div className="updated">Last updated: July 16, 2026</div>

        <p className="intro">
          This policy describes how the lead &amp; campaign management system (&quot;the System&quot;,
          &quot;we&quot;), operated by AVIVSAMSA, collects, uses, and stores information. The System is a
          B2B business tool for managing leads and advertising data for our advertising clients.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li><strong>Lead details</strong> — name, phone number, and email address, as submitted by users in Facebook / Instagram Lead Ads forms.</li>
          <li><strong>Advertising performance data</strong> — campaign, ad, and creative identifiers and metrics (impressions, clicks, spend, etc.) pulled from Meta&apos;s advertising platform.</li>
          <li><strong>Operational information</strong> — lead status, notes, and records entered by the business user to manage the inquiry.</li>
        </ul>

        <h2>2. Source of Information</h2>
        <p>
          Information is collected via Meta&apos;s official API (Graph API) and the Lead Ads Webhook,
          according to the permissions granted by the ad account owner. We do not collect information
          directly from visitors through this site, other than the business user&apos;s portal login credentials.
        </p>

        <h2>3. Purposes of Use</h2>
        <ul>
          <li>Delivering leads to the relevant business client who ran the campaign, for contact and handling.</li>
          <li>Displaying performance data and analyzing the effectiveness of campaigns and ads.</li>
          <li>Internal management, service improvement, and system security.</li>
        </ul>

        <h2>4. Our Role</h2>
        <p>
          With respect to lead details we act as a &quot;data processor&quot; for our advertising clients,
          who are the &quot;data owners&quot; responsible for the relationship with the lead. We make the
          information available only to the specific client to whom the lead belongs.
        </p>

        <h2>5. Sharing Information</h2>
        <p>We do not sell personal information. Information may be made available only to:</p>
        <ul>
          <li>The business client to whom the lead is assigned.</li>
          <li>Infrastructure providers used to operate the system (database storage, hosting, and Meta as the data source) — subject to confidentiality and security obligations.</li>
          <li>Competent authorities, if and when required by law.</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>
          We retain information as long as it is needed for the purposes for which it was collected, or as
          long as the engagement with the client is active. Thereafter the information is deleted or made
          available at the client&apos;s request.
        </p>

        <h2>7. Data Security</h2>
        <p>
          We take reasonable measures to protect the information, including encrypted traffic (HTTPS),
          permission-based access control, and hashed passwords. However, no system is completely immune.
        </p>

        <h2>8. Your Rights and Data Deletion</h2>
        <p>
          You may contact us to review, correct, or delete information. To request deletion of personal data,
          email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the relevant details, and we will
          handle the request within a reasonable time.
        </p>

        <h2>9. Cookies</h2>
        <p>
          The system uses one essential cookie to maintain the business user&apos;s portal login state. We do
          not use third-party advertising or tracking cookies.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this policy from time to time. An updated version will be posted on this page with the revised date.</p>

        <h2>11. Contact</h2>
        <p>
          For questions regarding this privacy policy or data handling, contact:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
