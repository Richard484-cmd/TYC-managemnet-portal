/*
# Security Hardening: SECURITY DEFINER functions for giving verify/refund

## Purpose
Financial transaction verify and refund operations were performed via direct client UPDATE on the giving_transactions table. While RLS restricts UPDATE to finance_officer/super_admin, the client could set arbitrary status values. This migration creates two SECURITY DEFINER functions that enforce the allowed status transitions server-side.

## Security Changes
- Create `verify_giving_transaction(p_transaction_id uuid)` — sets status='verified', verified_by, verified_at, completed_at. Only callable by finance_officer/super_admin.
- Create `refund_giving_transaction(p_transaction_id uuid)` — sets status='refunded', refunded_at. Only callable by finance_officer/super_admin.
- Both functions derive the caller from auth.uid(), validate authorization, and enforce allowed transitions.

## Important Notes
1. These functions replace direct UPDATE calls in the client component.
2. The functions validate that the transaction exists and is in an allowed state before transitioning.
3. EXECUTE is granted to authenticated only, revoked from anon.
*/

-- ============================================================================
-- verify_giving_transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_giving_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Authorize the caller
  IF NOT (
    public.has_role(auth.uid(), 'finance_officer', 'church', NULL)
    OR public.has_role(auth.uid(), 'super_admin', 'church', NULL)
  ) THEN
    RAISE EXCEPTION 'Not authorized to verify transactions';
  END IF;

  -- Check transaction exists and get current status
  SELECT status INTO v_current_status
  FROM public.giving_transactions
  WHERE id = p_transaction_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Only allow verifying pending or successful transactions
  IF v_current_status NOT IN ('pending', 'successful') THEN
    RAISE EXCEPTION 'Transaction cannot be verified from status: %', v_current_status;
  END IF;

  UPDATE public.giving_transactions
  SET
    status = 'verified',
    verified_by = auth.uid(),
    verified_at = now(),
    completed_at = COALESCE(completed_at, now()),
    updated_at = now()
  WHERE id = p_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_giving_transaction(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_giving_transaction(uuid) FROM anon;

-- ============================================================================
-- refund_giving_transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refund_giving_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Authorize the caller
  IF NOT (
    public.has_role(auth.uid(), 'finance_officer', 'church', NULL)
    OR public.has_role(auth.uid(), 'super_admin', 'church', NULL)
  ) THEN
    RAISE EXCEPTION 'Not authorized to refund transactions';
  END IF;

  -- Check transaction exists and get current status
  SELECT status INTO v_current_status
  FROM public.giving_transactions
  WHERE id = p_transaction_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Only allow refunding verified or successful transactions
  IF v_current_status NOT IN ('verified', 'successful') THEN
    RAISE EXCEPTION 'Transaction cannot be refunded from status: %', v_current_status;
  END IF;

  UPDATE public.giving_transactions
  SET
    status = 'refunded',
    refunded_at = now(),
    updated_at = now()
  WHERE id = p_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_giving_transaction(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_giving_transaction(uuid) FROM anon;
