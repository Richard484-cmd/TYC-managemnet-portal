-- Add Worker and Archived membership statuses
-- The existing seed (migration 0008) has: visitor, regular_attender, member, inactive, transferred
-- This adds two new statuses requested by the member management module.

INSERT INTO membership_statuses (status_key, name, description, sort_order, is_system)
VALUES
  ('worker', 'Worker', 'A member who actively serves in a department or ministry', 25, true),
  ('archived', 'Archived', 'A member record that has been archived and is no longer active', 60, true)
ON CONFLICT (status_key) DO NOTHING;
