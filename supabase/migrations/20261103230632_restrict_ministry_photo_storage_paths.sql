/*
# Restrict ministry photo paths

Only allow staff to write objects whose first path segment is the slug of an existing published website ministry.
*/

DROP POLICY IF EXISTS "ministry_photos_insert_staff" ON storage.objects;
CREATE POLICY "ministry_photos_insert_staff" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries
    WHERE public_ministries.slug = (storage.foldername(name))[1]
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
    FROM public.public_ministries
    WHERE public_ministries.slug = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'ministry-photos'
  AND public.can_manage_website_ministries()
  AND EXISTS (
    SELECT 1
    FROM public.public_ministries
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
    FROM public.public_ministries
    WHERE public_ministries.slug = (storage.foldername(name))[1]
  )
);
