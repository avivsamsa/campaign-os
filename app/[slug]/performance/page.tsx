import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// "ביצועים" מוסתר מהפורטל כרגע (לפי בקשה) — כל גישה ישירה מופנית לבית.
// לשחזור: החזר את התוכן הקודם + את הטאב ב-layout.tsx.
export default async function PortalPerformancePage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}`);
}
