'use client';

import { useAuth } from '@/lib/auth/auth-context';
import {
  ROLES,
  STAFF_ROLES,
  ADMIN_ROLES,
  PASTORAL_ROLES,
  type RoleAssignment,
} from '@/lib/auth/constants';

export function usePermissions() {
  const { roles, loading } = useAuth();

  const hasRole = (roleKey: string): boolean =>
    roles.some((ra: RoleAssignment) => ra.role_key === roleKey);

  const hasAnyRole = (roleKeys: string[]): boolean =>
    roleKeys.some((rk) => hasRole(rk));

  const hasScopedRole = (
    roleKey: string,
    scopeType: string,
    scopeId: string
  ): boolean =>
    roles.some(
      (ra: RoleAssignment) =>
        ra.role_key === roleKey &&
        ra.scope_type === scopeType &&
        ra.scope_id === scopeId
    );

  return {
    loading,
    roles,
    hasRole,
    hasAnyRole,
    hasScopedRole,
    isStaff: hasAnyRole([...STAFF_ROLES]),
    isAdmin: hasAnyRole([...ADMIN_ROLES]),
    isPastoral: hasAnyRole([...PASTORAL_ROLES]),
    isFinance: hasAnyRole([ROLES.SUPER_ADMIN, ROLES.FINANCE_OFFICER]),
    isSuperAdmin: hasRole(ROLES.SUPER_ADMIN),
    isFollowUpManager: hasAnyRole([ROLES.SUPER_ADMIN, ROLES.FOLLOW_UP_MANAGER]),
    isDepartmentLeader: hasRole(ROLES.DEPARTMENT_LEADER),
    isGroupLeader: hasRole(ROLES.GROUP_LEADER),
    isMember: hasRole(ROLES.MEMBER),
  };
}
