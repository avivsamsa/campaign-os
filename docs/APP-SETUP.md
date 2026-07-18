# Campaign OS — מדריך הפיכה לאפליקציה (iOS + Android)

מטרה: לעטוף את אתר הווב הקיים באפליקציה נייטיב עם Capacitor, להוסיף פוש, ולהעלות ל-App Store / Google Play.
כל הפקודות רצות על ה-**Mac** (iOS דורש Xcode).

הבסיס כבר מוכן בריפו: PWA (manifest + icons + service worker) ואייקון מקור ב-`public/icons/icon-1024.png`.

---

## דרישות מקדימות (חד-פעמי)
- **Mac** עם **Xcode** (App Store) + Command Line Tools
- **CocoaPods**: `sudo gem install cocoapods`
- **Node 18+** (כבר יש)
- **Android Studio** (לאנדרואיד; אפשר לדחות)
- חשבון **Apple Developer** ✅ (יש לך) · חשבון **Google Play** (25$ חד-פעמי, לדחות)

---

## שלב 1 — התקנת Capacitor
בתיקיית הפרויקט:
```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

צור בשורש `capacitor.config.ts`:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'il.co.avivsamsa.campaignos',   // מזהה קבוע — לא לשנות אחרי פרסום
  appName: 'Campaign OS',
  webDir: 'public',                       // תיקיית fallback (טוענים אתר חי מרחוק)
  server: {
    url: 'https://ppc.avivsamsa.co.il',   // האפליקציה טוענת את האתר החי
    cleartext: false,
  },
  ios: { contentInset: 'always' },
  backgroundColor: '#0E0C0B',
};

export default config;
```

> `server.url` = האפליקציה מציגה את האתר החי. יתרון: עדכוני ווב מיידיים בלי הגשה מחדש.
> חיסרון: אפל בודקת "אתר עטוף" (כלל 4.2) — לכן **חובה** להוסיף פוש (שלב 3) שנותן ערך נייטיב.

## שלב 2 — הוספת פלטפורמות + אייקונים
```bash
npx cap add ios
npx cap add android          # אופציונלי כרגע

# אייקונים + splash מהמקור 1024 שכבר יצרנו:
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#A8325A' --splashBackgroundColor '#0E0C0B'

npx cap sync
```

הרצה על סימולטור:
```bash
npx cap open ios      # נפתח Xcode → Run
```

---

## שלב 3 — פוש נוטיפיקציות (Firebase Cloud Messaging) — הערך הנייטיב
1. צור פרויקט ב-**Firebase** → הוסף אפליקציית iOS (bundle id זהה ל-appId) → הורד `GoogleService-Info.plist` → גרור ל-Xcode.
2. ב-Apple Developer: הפעל **Push Notifications** ל-App ID, צור **APNs Key** (.p8) → העלה ל-Firebase.
3. התקן פלאגין:
   ```bash
   npm i @capacitor/push-notifications && npx cap sync
   ```
4. **צד ווב (אני אבנה):** קומפוננט שמבקש הרשאת פוש, מקבל device token, ושולח אותו ל-`/api/push/register` שישמור אותו ל-DB פר לקוח/אדמין.
5. **צד שרת (אני אבנה):** כשנכנס ליד (webhook) או מתגלה בעיית חשבון — שליחת פוש דרך FCM ל-tokens הרלוונטיים.

> את חלק 4+5 אני בונה בצד הווב; חלק 1–3 הם ב-Mac/Firebase.

---

## שלב 4 — מוכנות לאישור של אפל (App Review)
לפני הגשה, לוודא:

- [ ] **4.2 ערך נייטיב** — פוש עובד (לא רק אתר עטוף)
- [ ] **2.1 חשבון דמו** — לספק לבודקים פרטי כניסה לפורטל דמו (בהערות הביקורת). *(אני אכין פורטל דמו.)*
- [ ] **2.3.1 בלי פיצ'רים נסתרים** — להחליט על מיקום האדמין:
      אפשרות מומלצת: **האפליקציה הציבורית = פורטל לקוח בלבד**, ואתה מנהל דרך TestFlight/ווב.
- [ ] **5.1.1(v) מחיקת חשבון מתוך האפליקציה** — *(אני אבנה זרימת "מחיקת המידע שלי".)*
- [ ] **5.1.1 פרטיות** — מדיניות פרטיות ✅ + מילוי "App Privacy" ב-App Store Connect
- [ ] **splash + safe areas** — ✅ יש SplashScreen; לוודא בסימולטור

---

## שלב 5 — הגשה
1. Xcode → Product → Archive → Distribute → App Store Connect
2. App Store Connect → צור אפליקציה, מלא תיאור/צילומי מסך/פרטיות
3. הוסף חשבון דמו בהערות הביקורת
4. שלח לביקורת (בד"כ 1–3 ימים)

---

## מה אני (Claude) בונה בצד הווב במקביל
- `/api/push/register` + טבלת device tokens + שליחת פוש על ליד/בעיית חשבון
- פורטל **דמו** לבודקי אפל
- זרימת **מחיקת מידע** מתוך האפליקציה
- החלטת מיקום האדמין (לפי מה שתבחר)
