import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  let cookieStore: ReturnType<typeof cookies>;
  try {
    cookieStore = cookies();
  } catch {
    // No request context (e.g. during static generation or dev hot-reload).
    // Return a client with no-op cookie methods so the caller can still
    // attempt auth — it will simply see no session.
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as never);
            });
          } catch {
            // Called from a Server Component — safe to ignore since
            // middleware refreshes the session.
          }
        },
      },
    }
  );
}
