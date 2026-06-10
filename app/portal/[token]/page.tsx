import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// העברה ישירה ללידים — הליבה של הפורטל
export default function PortalHome({ params }: { params: { token: string } }) {
  redirect(`/portal/${params.token}/leads`);
  // eslint-disable-next-line @typescript-eslint/no-unreachable
  return <Link href={`/portal/${params.token}/leads`}>לידים →</Link>;
}
