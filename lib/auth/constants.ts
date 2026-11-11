export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PASTOR: 'pastor',
  FINANCE_OFFICER: 'finance_officer',
  FOLLOW_UP_MANAGER: 'follow_up_manager',
  DEPARTMENT_LEADER: 'department_leader',
  GROUP_LEADER: 'group_leader',
  MEMBER: 'member',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  pastor: 'Pastor',
  finance_officer: 'Finance Officer',
  follow_up_manager: 'Follow-up Manager',
  department_leader: 'Department Leader',
  group_leader: 'Group Leader',
  member: 'Member',
};

export const STAFF_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.PASTOR,
  ROLES.FINANCE_OFFICER,
  ROLES.FOLLOW_UP_MANAGER,
  ROLES.DEPARTMENT_LEADER,
  ROLES.GROUP_LEADER,
] as const;

export const PASTORAL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.PASTOR,
] as const;

export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
] as const;

export const SCOPE_TYPES = {
  CHURCH: 'church',
  DEPARTMENT: 'department',
  MINISTRY: 'ministry',
  GROUP: 'group',
} as const;

export type ScopeType = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_key: string;
  scope_type: string;
  scope_id: string | null;
  granted_at: string;
  revoked_at: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  roles: RoleAssignment[];
}
