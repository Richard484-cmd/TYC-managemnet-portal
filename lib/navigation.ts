export type NavIconName =
  | 'LayoutDashboard'
  | 'Users'
  | 'UserPlus'
  | 'Building2'
  | 'Church'
  | 'ImagePlus'
  | 'UsersRound'
  | 'CalendarDays'
  | 'CalendarCheck'
  | 'Video'
  | 'Heart'
  | 'KanbanSquare'
  | 'ListTodo'
  | 'Send'
  | 'CircleDollarSign'
  | 'Zap'
  | 'BarChart3';

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  roles?: string[];
  badge?: string;
}

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Members', href: '/admin/members', icon: 'Users', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager', 'department_leader', 'group_leader'] },
  { label: 'Visitors', href: '/admin/visitors', icon: 'UserPlus', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager'] },
  { label: 'CRM', href: '/admin/crm', icon: 'KanbanSquare', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager'] },
  { label: 'Tasks', href: '/admin/tasks', icon: 'ListTodo', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager', 'department_leader', 'group_leader'] },
  { label: 'Communications', href: '/admin/communications', icon: 'Send', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager', 'department_leader', 'group_leader'] },
  { label: 'Prayer Requests', href: '/admin/prayer', icon: 'Heart', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager'] },
  { label: 'Giving', href: '/admin/giving', icon: 'CircleDollarSign', roles: ['super_admin', 'finance_officer'] },
  { label: 'Attendance', href: '/admin/attendance', icon: 'CalendarCheck', roles: ['super_admin', 'admin', 'pastor', 'follow_up_manager', 'department_leader', 'group_leader'] },
  { label: 'My Units', href: '/admin/my-units', icon: 'Building2', roles: ['super_admin', 'admin', 'pastor', 'department_leader', 'group_leader'] },
  { label: 'Departments', href: '/admin/departments', icon: 'Building2', roles: ['super_admin', 'admin', 'pastor', 'department_leader'] },
  { label: 'Ministries', href: '/admin/ministries', icon: 'Church', roles: ['super_admin', 'admin', 'pastor', 'department_leader'] },
  { label: 'Website Ministries', href: '/admin/website-ministries', icon: 'ImagePlus', roles: ['super_admin', 'admin', 'pastor'] },
  { label: 'Groups', href: '/admin/groups', icon: 'UsersRound', roles: ['super_admin', 'admin', 'pastor', 'department_leader', 'group_leader'] },
  { label: 'Virtual Meetings', href: '/admin/virtual-meetings', icon: 'Video', roles: ['super_admin', 'admin', 'pastor', 'department_leader', 'group_leader'] },
  { label: 'Media Library', href: '/admin/media', icon: 'ImagePlus', roles: ['super_admin', 'admin', 'pastor', 'department_leader', 'group_leader'] },
  { label: 'Automations', href: '/admin/automations', icon: 'Zap', roles: ['super_admin', 'admin'] },
  { label: 'Reports', href: '/admin/reports', icon: 'BarChart3', roles: ['super_admin', 'admin', 'pastor', 'finance_officer', 'follow_up_manager', 'department_leader', 'group_leader'] },
];

export const memberNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/member/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Attendance', href: '/member/attendance', icon: 'CalendarCheck' },
  { label: 'Virtual Meetings', href: '/member/meetings', icon: 'Video' },
  { label: 'Media Library', href: '/member/media', icon: 'ImagePlus' },
  { label: 'Events', href: '/events', icon: 'CalendarDays' },
  { label: 'Prayer', href: '/member/prayer', icon: 'Heart' },
  { label: 'Giving', href: '/member/giving', icon: 'CircleDollarSign' },
];

export function filterNavByRoles(items: NavItem[], roles: { role_key: string }[]): NavItem[] {
  const roleKeys = roles.map((r) => r.role_key);
  return items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => roleKeys.includes(r));
  });
}
