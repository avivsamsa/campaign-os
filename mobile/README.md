# Campaign OS — אפליקציית פורטל לקוח (React Native / Expo)

אפליקציה נייטיב לפורטל הלקוח. מדברת עם ה-backend הקיים (`ppc.avivsamsa.co.il`) עם אימות **Bearer token**.

## הרצה (פיתוח)
```bash
cd mobile
npm install
npx expo install --fix      # מיישר גרסאות ל-SDK הנכון
npx expo start
```
- סרוק/י את ה-QR עם **Expo Go** (מה-App Store) בטלפון, או `i` לסימולטור iOS / `a` לאנדרואיד.
- התחבר/י עם חשבון הדמו: פורטל `demo`, סיסמה `demo2026` (או כל לקוח אמיתי).

> RTL: בהרצה הראשונה ייתכן שיידרש reload אחד (r ב-terminal) כדי שהעברית תתיישר לימין.

## מבנה
- `app/` — מסכים (Expo Router): `login`, `leads`, `lead/[id]`
- `lib/` — `api.ts` (קריאות ל-backend), `auth.tsx` (token ב-SecureStore), `theme.ts`, `config.ts`
- `config.ts` → `API_BASE` (כתובת ה-backend)

## מה יש ב-v1
- התחברות (slug + סיסמה) → token נשמר מאובטח
- רשימת לידים + אנליטיקות + pull-to-refresh + חיוג/וואטסאפ
- מסך ליד: שינוי סטטוס + יומן/הערות

## בהמשך
- פוש (ליד חדש / בעיית חשבון), קטגוריות (שער בחירה), פופאפ סכום/סיבה מלא, biometric, מחיקת חשבון

## בנייה לחנות (EAS)
```bash
npm i -g eas-cli && eas login
eas build:configure
eas build --platform ios        # בונה .ipa בענן (בלי Xcode מקומי)
eas submit --platform ios       # מעלה ל-App Store Connect
```
