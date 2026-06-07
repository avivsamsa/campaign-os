import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Single server-side Supabase client.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 * Created lazily so a missing env var surfaces as a catchable error
 * (e.g. in /api/health) rather than crashing module import.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env',
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js App Router ממטמן GET של fetch כברירת מחדל; supabase-js משתמש ב-fetch
      // פנימית, ולכן קריאות SELECT היו מחזירות דאטה ישנה. no-store מבטיח קריאה טרייה תמיד.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  });

  return client;
}
