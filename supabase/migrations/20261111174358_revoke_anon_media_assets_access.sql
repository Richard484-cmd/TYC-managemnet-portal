/*
# Restrict member media records to signed-in users

1. Security change
- Removes inherited anonymous CRUD privileges from `public.media_assets`.
- Keeps the existing authenticated policies and staff permissions unchanged.

2. Important notes
- Members must be signed in before the media library can query published assets.
- Private storage access continues to use the existing authenticated storage policies and short-lived signed URLs.
*/

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.media_assets FROM anon;