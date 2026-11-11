/*
# Correct ministry photo access controls

Use the storage object's path explicitly and remove unintended table write privileges from browser roles.
*/

REVOKE INSERT, DELETE ON public.public_ministries FROM anon, authenticated;
REVOKE UPDATE ON public.public_ministries FROM anon, authenticated;
GRANT UPDATE (image_url, updated_at) ON public.public_ministries TO authenticated;

DROP POLICY IF EXISTS "ministry_photos_insert_staff" ON storage.objects;
CREATE POLICY "ministry_photos_insert_staff" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries pm
    WHERE pm.slug = (storage.foldername(storage.objects.name))[1]
  )
);

DROP POLICY IF EXISTS "ministry_photos_update_staff" ON storage.objects;
CREATE POLICY "ministry_photos_update_staff" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries pm
    WHERE pm.slug = (storage.foldername(storage.objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries pm
    WHERE pm.slug = (storage.foldername(storage.objects.name))[1]
  )
);

DROP POLICY IF EXISTS "ministry_photos_delete_staff" ON storage.objects;
CREATE POLICY "ministry_photos_delete_staff" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries pm
    WHERE pm.slug = (storage.foldername(storage.objects.name))[1]
  )
);
