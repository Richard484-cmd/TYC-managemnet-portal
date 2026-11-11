import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/leadership',
  '/ministries',
  '/events',
  '/sermons',
  '/give',
  '/prayer',
  '/contact',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unauthorized',
  '/auth/callback',
];

const STAFF_ROLE_KEYS = [
  'super_admin',
  'admin',
  'pastor',
  'finance_officer',
  'follow_up_manager',
  'department_leader',
  'group_leader',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route + '?')
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/verify-email')) {
    try {
      const { data: roleData } = await supabase
        .from('role_assignments')
        .select('role_key')
        .eq('user_id', user.id)
        .is('revoked_at', null);

      const roles = (roleData ?? []).map((r) => r.role_key);
      const hasStaffRole = roles.some((r) => STAFF_ROLE_KEYS.includes(r));
      const target = hasStaffRole ? '/admin/dashboard' : '/member/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    } catch {
      return NextResponse.redirect(new URL('/member/dashboard', request.url));
    }
  }

  if (!user && pathname.startsWith('/member')) {
    return NextResponse.redirect(
      new URL('/login?redirect=' + encodeURIComponent(pathname), request.url)
    );
  }

  if (!user && pathname.startsWith('/admin')) {
    return NextResponse.redirect(
      new URL('/login?redirect=' + encodeURIComponent(pathname), request.url)
    );
  }

  return supabaseResponse;
}
