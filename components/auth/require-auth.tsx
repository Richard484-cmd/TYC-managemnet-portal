'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <>{fallback ?? null}</>;
  }

  return <>{children}</>;
}

interface RequireRoleProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

export function RequireRole({ children, roles, fallback }: RequireRoleProps) {
  const { loading, hasAnyRole } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyRole(roles)) {
    return <>{fallback ?? <UnauthorizedMessage />}</>;
  }

  return <>{children}</>;
}

interface RequireStaffProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireStaff({ children, fallback }: RequireStaffProps) {
  return (
    <RequireAuth>
      <RequireRole roles={[...STAFF_ROLES_LIST]} fallback={fallback}>
        {children}
      </RequireRole>
    </RequireAuth>
  );
}

function UnauthorizedMessage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    </div>
  );
}

const STAFF_ROLES_LIST = [
  'super_admin',
  'admin',
  'pastor',
  'finance_officer',
  'follow_up_manager',
  'department_leader',
  'group_leader',
] as const;
