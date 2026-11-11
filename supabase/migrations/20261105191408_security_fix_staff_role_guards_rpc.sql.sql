/*
# Staff-only guards on sensitive database functions

Plain-English summary
Several database functions the admin screens call had no check on who was calling them. Any signed-in account, including an ordinary member, could have read member contact details or changed visitor records. This migration adds a role check inside each function and removes the right for anonymous visitors (and the general public) to run them.

1. Functions guarded (same names, same arguments, same results for staff)
- resolve_communication_audience: admin, super_admin, pastor, follow_up_manager
- get_contact_timeline: admin, super_admin, pastor, follow_up_manager
- count_members_by_status: admin, super_admin, pastor, follow_up_manager
- count_followups_by_type: admin, super_admin, pastor, follow_up_manager
- register_visitor, advance_visitor_stage, convert_visitor_to_member: admin, super_admin, pastor, follow_up_manager
- increment_prayer_count: admin, super_admin, pastor, follow_up_manager
- generate_transaction_reference: admin, super_admin, finance_officer

2. Access changes
- EXECUTE revoked from PUBLIC and anon on all nine functions.
- EXECUTE granted to authenticated (signed-in users still reach the function, and the role check decides).

3. Notes
- Functions count_members_by_status and count_followups_by_type change from plain SQL to PL/pgSQL so the check can run first. Return types are unchanged.
- has_role and the row-level policies are not changed.
- Unauthorized calls raise a permission error (42501).
*/

CREATE OR REPLACE FUNCTION public.resolve_communication_audience(p_criteria jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
result jsonb;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

SELECT jsonb_build_object(
'recipients', COALESCE((
SELECT jsonb_agg(jsonb_build_object(
'member_id', m.id,
'first_name', m.first_name,
'last_name', m.last_name,
'email', m.email,
'phone', m.phone
))
FROM public.members m
WHERE m.deleted_at IS NULL
AND m.is_active = true
AND (
p_criteria->>'status_key' IS NULL
OR m.status_key = p_criteria->>'status_key'
)
), '[]'::jsonb),
'total_count', COALESCE((
SELECT count(*)::int
FROM public.members m
WHERE m.deleted_at IS NULL
AND m.is_active = true
AND (
p_criteria->>'status_key' IS NULL
OR m.status_key = p_criteria->>'status_key'
)
), 0)
) INTO result;

RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_contact_timeline(p_contact_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
result jsonb;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

SELECT jsonb_agg(jsonb_build_object(
'activity_id', fa.id,
'activity_type', fa.activity_type,
'description', fa.description,
'performed_by', fa.performed_by,
'performed_at', fa.created_at
)) INTO result
FROM public.follow_up_activities fa
WHERE fa.contact_id = p_contact_id
ORDER BY fa.created_at DESC
LIMIT p_limit OFFSET p_offset;

RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_members_by_status()
RETURNS TABLE(status_key text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

RETURN QUERY
SELECT m.status_key, count(*)
FROM public.members m
WHERE m.deleted_at IS NULL
GROUP BY m.status_key
ORDER BY count(*) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_followups_by_type()
RETURNS TABLE(type text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

RETURN QUERY
SELECT f.type, count(*)
FROM public.follow_ups f
WHERE f.deleted_at IS NULL
GROUP BY f.type
ORDER BY count(*) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.advance_visitor_stage(p_visitor_id uuid, p_new_stage text, p_reason text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_visitor        RECORD;
v_old_stage      text;
v_contact_id     uuid;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

SELECT * INTO v_visitor FROM visitors WHERE id = p_visitor_id AND deleted_at IS NULL;
IF NOT FOUND THEN
RAISE EXCEPTION 'Visitor not found';
END IF;

v_old_stage  := v_visitor.lifecycle_stage;
v_contact_id := v_visitor.contact_id;

UPDATE visitors
SET lifecycle_stage = p_new_stage,
updated_at = now()
WHERE id = p_visitor_id;

IF v_contact_id IS NOT NULL THEN
INSERT INTO contact_movements (contact_id, from_stage, to_stage, reason, moved_by)
VALUES (v_contact_id, v_old_stage, p_new_stage, p_reason, auth.uid());
END IF;

RETURN p_new_stage;
END;
$function$;

CREATE OR REPLACE FUNCTION public.convert_visitor_to_member(p_visitor_id uuid, p_status_key text DEFAULT 'regular_attender'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_visitor    RECORD;
v_member_id  uuid;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

SELECT * INTO v_visitor FROM visitors WHERE id = p_visitor_id AND deleted_at IS NULL;
IF NOT FOUND THEN
RAISE EXCEPTION 'Visitor not found';
END IF;

IF v_visitor.converted_to_member_id IS NOT NULL THEN
RETURN v_visitor.converted_to_member_id;
END IF;

INSERT INTO members (first_name, last_name, email, phone, status_key, join_date, is_baptized, is_active)
VALUES (
v_visitor.first_name, v_visitor.last_name, v_visitor.email, v_visitor.phone,
p_status_key, CURRENT_DATE, false, true
)
RETURNING id INTO v_member_id;

INSERT INTO member_profiles (
member_id, address_line1, address_line2, city, state_province, postal_code, country
) VALUES (
v_member_id, v_visitor.address_line1, v_visitor.address_line2,
v_visitor.city, v_visitor.state_province, v_visitor.postal_code, v_visitor.country
);

UPDATE visitors SET
converted_to_member_id = v_member_id,
converted_at = now(),
status_key = 'converted',
lifecycle_stage = 'new_member',
updated_at = now()
WHERE id = p_visitor_id;

UPDATE contacts SET member_id = v_member_id, pipeline_stage = 'member' WHERE visitor_id = p_visitor_id;

INSERT INTO membership_history (member_id, previous_status, new_status, reason, changed_by)
VALUES (v_member_id, NULL, p_status_key, 'Converted from visitor', auth.uid());

RETURN v_member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_visitor(p_first_name text, p_last_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_source text DEFAULT 'walk_in'::text, p_assigned_to uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_address_line1 text DEFAULT NULL::text, p_address_line2 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state_province text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_country text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_contact_id   uuid;
v_visitor_id   uuid;
v_tag_id       uuid;
v_assigned_to  uuid := COALESCE(p_assigned_to, auth.uid());
v_followup_id  uuid;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

IF p_email IS NOT NULL AND p_email != '' THEN
SELECT id INTO v_contact_id FROM contacts
WHERE email = p_email AND deleted_at IS NULL LIMIT 1;
END IF;

IF v_contact_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
SELECT id INTO v_contact_id FROM contacts
WHERE phone = p_phone AND deleted_at IS NULL LIMIT 1;
END IF;

IF v_contact_id IS NULL THEN
INSERT INTO contacts (first_name, last_name, email, phone, source, pipeline_stage, assigned_to, notes)
VALUES (p_first_name, p_last_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), p_source, 'first_visit', v_assigned_to, p_notes)
RETURNING id INTO v_contact_id;
ELSE
UPDATE contacts SET
first_name = p_first_name,
last_name = p_last_name,
email = COALESCE(NULLIF(p_email, ''), contacts.email),
phone = COALESCE(NULLIF(p_phone, ''), contacts.phone),
source = p_source,
assigned_to = COALESCE(v_assigned_to, contacts.assigned_to),
notes = COALESCE(p_notes, contacts.notes),
updated_at = now()
WHERE id = v_contact_id;
END IF;

SELECT v.id INTO v_visitor_id
FROM visitors v
WHERE v.email = p_email AND v.email IS NOT NULL AND v.deleted_at IS NULL
LIMIT 1;

IF v_visitor_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
SELECT v.id INTO v_visitor_id
FROM visitors v
WHERE v.phone = p_phone AND v.deleted_at IS NULL
LIMIT 1;
END IF;

IF v_visitor_id IS NULL THEN
INSERT INTO visitors (
first_name, last_name, email, phone, source, lifecycle_stage, status_key,
assigned_to, notes, address_line1, address_line2, city, state_province, postal_code, country
) VALUES (
p_first_name, p_last_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), p_source,
'new_visitor', 'active', v_assigned_to, p_notes,
p_address_line1, p_address_line2, p_city, p_state_province, p_postal_code, p_country
)
RETURNING id INTO v_visitor_id;
ELSE
UPDATE visitors SET
first_name = p_first_name,
last_name = p_last_name,
email = COALESCE(NULLIF(p_email, ''), visitors.email),
phone = COALESCE(NULLIF(p_phone, ''), visitors.phone),
source = p_source,
assigned_to = COALESCE(v_assigned_to, visitors.assigned_to),
notes = COALESCE(p_notes, visitors.notes),
updated_at = now()
WHERE id = v_visitor_id;
END IF;

UPDATE contacts SET visitor_id = v_visitor_id WHERE id = v_contact_id;

SELECT id INTO v_tag_id FROM tags WHERE slug = 'first-timer' AND deleted_at IS NULL LIMIT 1;
IF v_tag_id IS NOT NULL THEN
INSERT INTO tag_assignments (tag_id, entity_type, entity_id, assigned_by)
VALUES (v_tag_id, 'visitor', v_visitor_id, auth.uid())
ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING;
END IF;

INSERT INTO follow_ups (
visitor_id, contact_id, type, priority, status, due_date, assigned_to, assigned_by
) VALUES (
v_visitor_id, v_contact_id, 'welcome_call', 'normal', 'pending',
CURRENT_DATE + INTERVAL '3 days', v_assigned_to, auth.uid()
)
RETURNING id INTO v_followup_id;

INSERT INTO tasks (
title, description, entity_type, entity_id, assigned_to, assigned_by, priority, status, due_date
) VALUES (
'Follow up with new visitor: ' || p_first_name || ' ' || p_last_name,
'Welcome call for first-time visitor. Contact via ' || COALESCE(NULLIF(p_phone, ''), NULLIF(p_email, ''), 'no contact info'),
'visitor', v_visitor_id, v_assigned_to, auth.uid(), 'normal', 'pending',
CURRENT_DATE + INTERVAL '3 days'
);

RETURN v_visitor_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_prayer_count(p_prayer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'pastor') OR has_role(auth.uid(), 'follow_up_manager')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

UPDATE public.prayer_requests
SET prayer_count = COALESCE(prayer_count, 0) + 1
WHERE id = p_prayer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_transaction_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
ref text;
BEGIN
IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'finance_officer')) THEN
RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END IF;

ref := 'TXN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6);
RETURN ref;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_members_by_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_followups_by_type() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.advance_visitor_stage(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_visitor(text, text, text, text, text, uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_prayer_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_transaction_reference() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.resolve_communication_audience(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_timeline(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_members_by_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_followups_by_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_visitor_stage(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_visitor_to_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_visitor(text, text, text, text, text, uuid, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_prayer_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_transaction_reference() TO authenticated;
