/*
# Fix: Revoke anon execute on can_access_virtual_meeting

## Security
- The Supabase security advisor flagged that `can_access_virtual_meeting(uuid, uuid)` is callable by the `anon` role. This lets an unauthenticated caller probe meeting IDs. Revoke EXECUTE from anon so only authenticated users can call it.
*/

REVOKE EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) TO authenticated;
