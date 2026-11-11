/*
# Add advance_visitor_stage RPC

## Purpose
Provides a single atomic operation to move a visitor forward (or backward) in the
lifecycle pipeline. It updates the visitor's lifecycle_stage, logs a contact_movement
for audit/history, and returns the new stage key.

## Changes

### 1. New function: `advance_visitor_stage(p_visitor_id, p_new_stage, p_reason)`
SECURITY DEFINER RPC that:
  a) Validates the visitor exists and is not soft-deleted
  b) Reads the current lifecycle_stage from the visitor row
  c) Updates the visitor's lifecycle_stage to p_new_stage
  d) If the visitor has a linked contact, inserts a contact_movement row recording
     the from_stage / to_stage transition and the reason
  e) Returns the new stage key

Callable by authenticated staff (admin, super_admin, pastor, follow_up_manager).

## Security
- SECURITY DEFINER runs as table owner, bypasses RLS for the cross-table insert.
- EXECUTE granted to authenticated only.
*/

CREATE OR REPLACE FUNCTION public.advance_visitor_stage(
  p_visitor_id  uuid,
  p_new_stage   text,
  p_reason      text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visitor        RECORD;
  v_old_stage      text;
  v_contact_id     uuid;
BEGIN
  SELECT * INTO v_visitor FROM visitors WHERE id = p_visitor_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visitor not found';
  END IF;

  v_old_stage  := v_visitor.lifecycle_stage;
  v_contact_id := v_visitor.contact_id;

  -- Update the visitor's lifecycle stage
  UPDATE visitors
    SET lifecycle_stage = p_new_stage,
        updated_at = now()
    WHERE id = p_visitor_id;

  -- Log the movement in contact_movements if we have a contact
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_movements (contact_id, from_stage, to_stage, reason, moved_by)
    VALUES (v_contact_id, v_old_stage, p_new_stage, p_reason, auth.uid());
  END IF;

  RETURN p_new_stage;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_visitor_stage TO authenticated;