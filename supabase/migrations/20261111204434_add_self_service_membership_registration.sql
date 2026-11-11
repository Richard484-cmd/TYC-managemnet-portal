/*
# Self-service membership registration

Lets a newly signed-in user complete their own membership record through a single
secure function, since members cannot insert rows into the members table directly.

1. New Functions
- `complete_member_registration(...)` creates the caller's `members` row (status `visitor`,
  linked to `auth.uid()`) and the matching `member_profiles` row. If the caller already has
  a linked member record, it returns that record's id without creating a duplicate.

2. Security
- SECURITY DEFINER with a fixed search_path.
- The function only ever writes a row owned by `auth.uid()`; it cannot target other users.
- Execute is revoked from PUBLIC and anon, and granted to authenticated only.
- Names are required and length-limited.

3. Notes
- Staff can later change the status of the new member from the admin members page.
- The existing sign-up trigger continues to assign the member role.
*/

CREATE OR REPLACE FUNCTION public.complete_member_registration(
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_marital_status text DEFAULT NULL,
  p_is_baptized boolean DEFAULT false,
  p_baptism_date date DEFAULT NULL,
  p_previous_church text DEFAULT NULL,
  p_address_line1 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state_province text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_emergency_contact_relation text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_member_id uuid;
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_last_name text := btrim(coalesce(p_last_name, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to complete your membership.' USING ERRCODE = '42501';
  END IF;

  SELECT m.id INTO v_member_id
  FROM members m
  WHERE m.user_id = v_user_id AND m.deleted_at IS NULL
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'First and last name are required.' USING ERRCODE = '22023';
  END IF;

  IF length(v_first_name) > 100 OR length(v_last_name) > 100 THEN
    RAISE EXCEPTION 'Names must be 100 characters or fewer.' USING ERRCODE = '22001';
  END IF;

  SELECT u.email INTO v_user_email FROM users u WHERE u.id = v_user_id;

  INSERT INTO members (
    user_id, status_key, first_name, last_name, email, phone, date_of_birth,
    gender, marital_status, is_baptized, is_active, created_by
  )
  VALUES (
    v_user_id, 'visitor', v_first_name, v_last_name, v_user_email,
    nullif(btrim(coalesce(p_phone, '')), ''), p_date_of_birth,
    nullif(btrim(coalesce(p_gender, '')), ''), nullif(btrim(coalesce(p_marital_status, '')), ''),
    coalesce(p_is_baptized, false), true, v_user_id
  )
  RETURNING id INTO v_member_id;

  INSERT INTO member_profiles (
    member_id, address_line1, city, state_province, country,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    baptism_date, previous_church
  )
  VALUES (
    v_member_id,
    nullif(btrim(coalesce(p_address_line1, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state_province, '')), ''),
    nullif(btrim(coalesce(p_country, '')), ''),
    nullif(btrim(coalesce(p_emergency_contact_name, '')), ''),
    nullif(btrim(coalesce(p_emergency_contact_phone, '')), ''),
    nullif(btrim(coalesce(p_emergency_contact_relation, '')), ''),
    p_baptism_date,
    nullif(btrim(coalesce(p_previous_church, '')), '')
  );

  RETURN v_member_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_member_registration(
  text, text, text, date, text, text, boolean, date, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_member_registration(
  text, text, text, date, text, text, boolean, date, text, text, text, text, text, text, text, text
) TO authenticated;
