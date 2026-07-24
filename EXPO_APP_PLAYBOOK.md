# Expo + Next.js App Playbook — Hard-Won Lessons

תובנות מעשיות מבניית האפליקציה (Expo SDK 54 / React Native, backend על Next.js + Supabase + Vercel, קהל בעברית/RTL). כתוב כך שאפשר להשתמש בו לאפליקציות הבאות.

---

## 1. RTL (עברית) — הבאג מספר 1

**הכלל:** תבנה **LTR-first עם RTL ידני**, או **RTL נייטיבי מלא** — אבל אל תערבב. אנחנו בחרנו LTR-first:
- `flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse'` (כדי לקבל תוצאה פיזית קבועה)
- `textAlign: 'right'` מפורש על כל טקסט
- `chevron = isRTL ? 'chevron-left' : 'chevron-right'`

**המלכודות:**
- **Expo Go מסתיר באגי RTL.** על מכשיר עם שפה אנגלית, `isRTL` נשאר `false` ב-Expo Go, אז הכל נראה מושלם. ב-**build נייטיב** `forceRTL(true)` נכנס לתוקף → React Navigation, יישור טקסט ורשימות **מתהפכים פעם שנייה** → הכל מראה־מראה. **תמיד תוודא RTL על build אמיתי, לא רק Expo Go.**
- `forceRTL` / `swapLeftAndRightInRTL` הן העדפות **נייטיביות** שנכנסות לתוקף **רק אחרי restart** של האפליקציה.

**הפתרון שעבד:** לכפות כיוון קבוע ולטעון מחדש פעם אחת אם צריך:
```js
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
try {
  I18nManager.allowRTL(false);
  if (I18nManager.isRTL) {           // מכשיר שהתחיל ב-RTL (אייפון בעברית / העדפה תקועה)
    I18nManager.forceRTL(false);
    Updates.reloadAsync().catch(() => {});   // כדי שההגדרה תיכנס לתוקף מיד
  }
} catch {}
```
**לעולם אל תשאיר `forceRTL(true)`** אם ה-UI בנוי LTR-first — זה מה ששבר אותנו.

---

## 2. Push Notifications (iOS) — יש 3 חלקים נפרדים שכולם חייבים להתקיים

Push זה לא דבר אחד. נכשלנו כי חלק אחד חסר בכל פעם:

1. **קוד + הרשאה (client):** `expo-notifications` — מבקשים הרשאה, `getExpoPushTokenAsync({ projectId })`, שולחים את הטוקן ל-backend. **לא עובד ב-Expo Go** (הוסר מ-SDK 53+ ל-iOS) — חייבים dev build / TestFlight.
2. **Provisioning Profile עם יכולת Push:** כשמוסיפים `expo-notifications`, ה-build **נכשל** כי הפרופיל הקיים לא כולל `aps-environment`. פתרון: `eas credentials` → iOS → production → Build Credentials → **All: Set up all** → מחדש את הפרופיל עם Push. (build ראשון עם היכולת החדשה כמעט תמיד נכשל — צריך לחדש קרדנציאלס.)
3. **APNs Push Key על שרתי Expo:** בלי זה, שליחת push מחזירה `InvalidCredentials: Could not find APNs credentials`. זה **נפרד** מהפרופיל! פתרון: `eas credentials` → iOS → **Push Notifications: Manage your Apple Push Notifications Key** → Set up. זה **לא דורש build מחדש** — ברגע שהמפתח על Expo, גם build קיים ישלח push.

**Backend:** שולחים ל-`https://exp.host/--/api/v2/push/send` (מערך הודעות), ומנקים טוקנים שחוזרים `DeviceNotRegistered`.

**בדיקה:** או https://expo.dev/notifications עם הטוקן, או POST ישיר ל-Expo API. תבדוק כשהאפליקציה **ברקע/סגורה** (banner).

---

## 3. EAS Build & Submit

- **תור ההגשה של EAS יכול להיתקע** במצב `IN_QUEUE` לשעות (קרה לנו כמה פעמים). **fallback אמין:** מורידים את ה-`.ipa` (מ-`eas build` או מה-URL בתוצאה) ומעלים דרך אפליקציית **Transporter** של אפל (חינם, GUI, לא צריך Xcode).
- `xcrun altool` / `iTMSTransporter` דורשים **Xcode מלא** (לא רק Command Line Tools). Transporter ה-GUI לא.
- **מגדילים `buildNumber`** לכל העלאה (unique + עולה). `version` — לשחרורים למשתמש.
- `"ITSAppUsesNonExemptEncryption": false` ב-infoPlist → מדלג על שאלת export compliance.
- EAS מנהל אוטומטית APNs + certificates, אבל **הוספת יכולת חדשה שוברת את הפרופיל** — צריך `eas credentials` לחדש (ראה §2).
- אפשר לשאול את סטטוס ה-build/submission דרך GraphQL API של Expo (`api.expo.dev/graphql`) עם ה-session secret מ-`~/.expo/state.json` — שימושי כשה-CLI תקוע.

---

## 4. ניווט ו-UX (React Native)

- **מסכי stack נייטיביים נותנים swipe-back אינטראקטיבי (pop) אבל לא push אינטראקטיבי.** בשביל תחושת אינסטגרם (המסך זז עם האצבע בשני הכיוונים בין מסכים שכנים) — משתמשים ב-`react-native-pager-view` (כלול ב-Expo Go), עם `layoutDirection="ltr"` כדי לקבע כיוון ולנטרל בלבול RTL.
- כותרת שמתחלפת **בזמן אמת** תוך כדי החלקה: `onPageScroll` (offset 0.5), לא `onPageSelected` (שקורה רק בסוף).
- `<Stack.Screen options={{...}}>` **בתוך** קומפוננטה יכול לאפס את ה-`animation` ב-setOptions → אנימציית הסגירה יוצאת הפוכה. הפתרון: לשים את ה-`animation` גם ב-options הפנימי, או להסתמך רק על ה-layout.
- ב-RTL, `headerLeft`/`headerRight` של React Navigation מתהפכים לפי `isRTL` — עוד סיבה לקבע `isRTL` (§1).

---

## 5. ארכיטקטורה שעבדה

- **Auth למובייל:** Bearer token ב-`expo-secure-store`, מול **אותם** endpoints של הפורטל (`resolvePortalSession()` תומך גם ב-cookie וגם ב-`Authorization: Bearer`). אפליקציה ואתר חולקים backend אחד.
- **Supabase:** ה-backend מתחבר עם **service_role** (עוקף RLS). לטבלאות שרק ה-backend ניגש אליהן — **מפעילים RLS בלי policies** (anon חסום לגמרי, service_role עובר). מגן על מידע רגיש (טוקנים, סיסמאות).
- סיסמאות: scrypt hash, אף פעם לא plaintext. סוד session: HMAC-signed cookie/token.
- **Latency:** ממקמים את פונקציות Vercel באותו region של ה-DB (למשל שתיהן ב-Singapore) — geo latency הוא העלות הכי גדולה בפורטל איטי.

---

## 6. Checklist להוספת פיצ'ר נייטיב חדש (שנוגע ב-native)

1. `npx expo install <lib>` (לא npm — כדי לתפוס גרסה תואמת SDK).
2. הוסף plugin/הרשאות ל-`app.json` אם צריך.
3. אם יש יכולת חדשה של אפל (Push/HealthKit/וכו') — צפה ש-build ראשון ייכשל → `eas credentials` לחדש פרופיל.
4. **בדוק על build אמיתי, לא Expo Go** (RTL, push, native modules).
5. הגדל `buildNumber`, בנה, והגש (Transporter אם התור תקוע).
6. `.env` / סודות — לעולם לא ב-git.

---

*נכתב מתוך בניית "AvivPPC" (campaign-os). כל סעיף כאן מייצג באג אמיתי שנתקלנו בו ופתרנו.*
