/*
# Restrict virtual meeting access check to signed-in users

1. Summary
- The virtual meeting access check is used by row rules for signed-in users only.
- It was still executable by everyone because the public role inherits execute rights by default.

2. Changes
- Removes execute rights from the public role and the anonymous role.
- Grants execute to the signed-in role only.

3. Important notes
- Row rules that call this check run as signed-in users, so access for members, staff, and organizers is unchanged.
*/

REVOKE EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_virtual_meeting(uuid, uuid) TO authenticated;
