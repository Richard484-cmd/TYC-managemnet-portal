/*
# Seed Data: Roles, Membership Statuses, Pipeline Stages, Church Settings

## Purpose
Populates the catalog tables with the baseline data the application needs to function: the 8 ChurchConnect roles, 5 membership statuses, 5 CRM pipeline stages, and default church settings.

## Seed Data

1. **roles** — The 8 system roles: super_admin, admin, pastor, finance_officer, follow_up_manager, department_leader, group_leader, member. All marked as `is_system = true` so they cannot be accidentally deleted.

2. **membership_statuses** — The 5 lifecycle stages: visitor, regular_attender, member, inactive, transferred. Ordered by sort_order.

3. **pipeline_stages** — The 5 CRM pipeline stages: first_visit, engaged, member, active, serving. Ordered by sort_order.

4. **church_settings** — Default church configuration: name, tagline, contact info, service times, and feature flags. Public settings are readable by anyone; private settings are staff-only.

## Security

This migration only INSERTs data into tables that already have RLS enabled. The inserts use the service role (via the migration tool), which bypasses RLS. No policy changes are made.

## Important Notes

1. All seed rows use `ON CONFLICT DO NOTHING` so re-running the migration is safe.
2. System roles are marked `is_system = true` — the UI should prevent their deletion.
3. Church settings include both public (church name, service times) and private (feature flags) keys.
4. No user data is created — actual users, members, and role assignments are created through the application UI.
*/

-- ============================================================================
-- ROLES
-- ============================================================================

INSERT INTO public.roles (role_key, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full system access including users, roles, settings, and audit logs', true),
  ('admin', 'Admin', 'Church management: members, events, departments, groups, communications, reports', true),
  ('pastor', 'Pastor', 'Spiritual care: members, attendance, follow-ups, prayer, groups, reports', true),
  ('finance_officer', 'Finance Officer', 'Giving campaigns, transactions, and financial reports', true),
  ('follow_up_manager', 'Follow-up Manager', 'Visitors, follow-ups, and first-time engagement pipeline', true),
  ('department_leader', 'Department Leader', 'Leads a specific department: members, ministries, attendance', true),
  ('group_leader', 'Group Leader', 'Leads a specific group: members, attendance, communications', true),
  ('member', 'Member', 'Church member: own profile, giving, groups, attendance, prayer', true)
ON CONFLICT (role_key) DO NOTHING;

-- ============================================================================
-- MEMBERSHIP STATUSES
-- ============================================================================

INSERT INTO public.membership_statuses (status_key, name, description, sort_order, is_system) VALUES
  ('visitor', 'Visitor', 'First-time or occasional attendee, not yet a member', 1, true),
  ('regular_attender', 'Regular Attender', 'Attends regularly but not formally a member', 2, true),
  ('member', 'Member', 'Formal church member', 3, true),
  ('inactive', 'Inactive', 'No longer active in the church', 4, true),
  ('transferred', 'Transferred', 'Transferred to another church', 5, true)
ON CONFLICT (status_key) DO NOTHING;

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================

INSERT INTO public.pipeline_stages (stage_key, name, description, sort_order, is_system, color) VALUES
  ('first_visit', 'First Visit', 'Person has visited for the first time', 1, true, '#3b82f6'),
  ('engaged', 'Engaged', 'Person is engaging with the church community', 2, true, '#10b981'),
  ('member', 'Member', 'Person has become a formal member', 3, true, '#6366f1'),
  ('active', 'Active', 'Member is active in ministries and groups', 4, true, '#f59e0b'),
  ('serving', 'Serving', 'Member is actively serving in a leadership or ministry role', 5, true, '#ef4444')
ON CONFLICT (stage_key) DO NOTHING;

-- ============================================================================
-- CHURCH SETTINGS (default configuration)
-- ============================================================================

INSERT INTO public.church_settings (key, value, is_public) VALUES
  ('church_name', '{"value": "ChurchConnect"}'::jsonb, true),
  ('church_tagline', '{"value": "Welcome Home"}'::jsonb, true),
  ('church_address', '{"value": ""}'::jsonb, true),
  ('church_phone', '{"value": ""}'::jsonb, true),
  ('church_email', '{"value": ""}'::jsonb, true),
  ('service_times', '{"value": "Sunday 9:00 AM & 11:00 AM"}'::jsonb, true),
  ('church_website', '{"value": ""}'::jsonb, true),
  ('church_description', '{"value": ""}'::jsonb, true),
  ('feature_automations_enabled', '{"value": false}'::jsonb, false),
  ('feature_giving_enabled', '{"value": false}'::jsonb, false),
  ('feature_crm_enabled', '{"value": true}'::jsonb, false),
  ('feature_communications_enabled', '{"value": true}'::jsonb, false),
  ('automation_max_runs_per_day', '{"value": 100}'::jsonb, false),
  ('notification_digest_enabled', '{"value": true}'::jsonb, false),
  ('default_currency', '{"value": "USD"}'::jsonb, false),
  ('registration_requires_approval', '{"value": false}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;
