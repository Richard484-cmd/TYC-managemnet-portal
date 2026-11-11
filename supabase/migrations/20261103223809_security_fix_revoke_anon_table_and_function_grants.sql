/*
# Remove anonymous access that no policy allows

1. Summary
- Removes the anonymous (not signed in) role's table privileges on every public table except the six that have public-facing row rules.
- Restores the anonymous role's privileges on those six tables only for the verbs their public rules use.
- Removes anonymous and signed-in execute rights on two functions that are only used internally.

2. Tables kept public (anon grants restored to the verbs their policies allow)
- church_settings: SELECT
- contact_submissions: INSERT
- events: SELECT
- event_registrations: INSERT
- giving_campaigns: SELECT
- prayer_requests: SELECT, INSERT

3. Functions
- can_access_virtual_meeting: anonymous execute removed (signed-in access kept, used by row rules).
- assign_default_member_role: all execute removed (it only runs as a database trigger).

4. Important notes
- No row rules change. Access for the public website is unchanged because no anonymous policy existed for any other table.
- Signed-in access is not changed by this migration.
*/

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('church_settings', 'contact_submissions', 'events', 'event_registrations', 'giving_campaigns', 'prayer_requests')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.church_settings, public.contact_submissions, public.events, public.event_registrations, public.giving_campaigns, public.prayer_requests FROM anon;
GRANT SELECT ON public.church_settings, public.events, public.giving_campaigns TO anon;
GRANT INSERT ON public.contact_submissions, public.event_registrations TO anon;
GRANT SELECT, INSERT ON public.prayer_requests TO anon;

REVOKE EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.assign_default_member_role() FROM PUBLIC, anon, authenticated;
