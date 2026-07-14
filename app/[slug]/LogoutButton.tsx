'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton({ slug }: { slug: string }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/portal/logout', { method: 'POST' }).catch(() => {});
    router.replace(`/${slug}`);
    router.refresh();
  }
  return (
    <button type="button" className="portal-logout" onClick={logout}>
      התנתקות
    </button>
  );
}
