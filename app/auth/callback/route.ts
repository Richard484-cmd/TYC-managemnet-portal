import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { STAFF_ROLES } from '@/lib/auth/constants';

const STAFF_ROLE_KEYS = STAFF_ROLES.map((r) => r as string);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If a specific next path was requested, honor it
      if (next) {
        return NextResponse.redirect(new URL(next, request.url));
      }

      // Otherwise, determine the dashboard based on the user's role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: roleData } = await supabase
          .from('role_assignments')
          .select('role_key')
          .eq('user_id', user.id)
          .is('revoked_at', null);

        const roles = (roleData ?? []).map((r) => r.role_key);
        const hasStaffRole = roles.some((r) => STAFF_ROLE_KEYS.includes(r));
        const target = hasStaffRole ? '/admin/dashboard' : '/member/dashboard';
        return NextResponse.redirect(new URL(target, request.url));
      }

      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url));
}
