import { createClient } from '@/lib/supabase/server';
import { ROLES, STAFF_ROLES, type AppUser, type RoleAssignment } from '@/lib/auth/constants';
import { redirect } from 'next/navigation';

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, display_name, first_name, last_name, phone, avatar_url, status')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return null;

    if (profile.status === 'suspended') return null;

    const { data: roleAssignments } = await supabase
      .from('role_assignments')
      .select('id, user_id, role_key, scope_type, scope_id, granted_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    return {
      ...profile,
      roles: (roleAssignments as RoleAssignment[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(...roles: string[]): Promise<AppUser> {
  const user = await requireUser();
  const hasRole = roles.some((role) =>
    user.roles.some((ra) => ra.role_key === role)
  );
  if (!hasRole) redirect('/unauthorized');
  return user;
}

export async function requireStaff(): Promise<AppUser> {
  return requireRole(...STAFF_ROLES);
}

export async function requireAdmin(): Promise<AppUser> {
  return requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);
}

export async function requireSuperAdmin(): Promise<AppUser> {
  return requireRole(ROLES.SUPER_ADMIN);
}

export async function requirePastor(): Promise<AppUser> {
  return requireRole(ROLES.SUPER_ADMIN, ROLES.PASTOR);
}

export async function requireFinance(): Promise<AppUser> {
  return requireRole(ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER);
}

export function userHasRole(user: AppUser, roleKey: string): boolean {
  return user.roles.some((ra) => ra.role_key === roleKey);
}

export function userHasAnyRole(user: AppUser, roleKeys: string[]): boolean {
  return roleKeys.some((rk) => userHasRole(user, rk));
}

export function userIsStaff(user: AppUser): boolean {
  return userHasAnyRole(user, [...STAFF_ROLES]);
}

export function userIsAdmin(user: AppUser): boolean {
  return userHasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
}

export function userIsPastoral(user: AppUser): boolean {
  return userHasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.PASTOR]);
}

export function userIsFinance(user: AppUser): boolean {
  return userHasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER]);
}
