/*
# Add check_in_time to attendance_records

## Purpose
Adds a `check_in_time` column to the `attendance_records` table so every record captures when the member checked in (in addition to the existing `status`, `notes`, and `recorded_by` fields).

## Changes
1. **attendance_records** — new nullable `check_in_time timestamptz` column. Nullable because records marked "absent" or "excused" will not have a check-in time.

## Security
No policy changes. Existing RLS policies on `attendance_records` remain unchanged — only staff and scoped leaders can insert/update records; members can read their own.

## Notes
1. The column is nullable — absent/excused records do not have a check-in time.
2. This prepares the schema for future QR-code-based check-in, where the check-in timestamp is captured at scan time.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'attendance_records'
    AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE public.attendance_records ADD COLUMN check_in_time timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ar_check_in_time ON public.attendance_records (check_in_time);
