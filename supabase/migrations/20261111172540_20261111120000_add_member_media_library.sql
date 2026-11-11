/*
# Add protected member media library

1. New Tables
- `public.media_assets`
- `id` (uuid, primary key): Stable media record identifier.
- `title` (text): Member-facing media title.
- `description` (text): Optional media description.
- `media_type` (text): `image` or `video`.
- `storage_path` (text): Private Storage object path.
- `mime_type` (text): Validated file content type recorded for display.
- `size_bytes` (bigint): File size recorded for display.
- `published` (boolean): Controls whether members can access the asset.
- `created_by` (uuid): Staff account that uploaded the asset.
- `created_at` (timestamptz): Creation timestamp.

2. Storage
- Creates or updates the private `member-media` bucket.
- Allows common image and video formats up to 100 MB.
- Members can download only published media through authenticated Storage reads.

3. Security
- Enables RLS on `public.media_assets`.
- Authenticated users may read published assets; staff may also read unpublished assets.
- Staff roles may insert, update, and delete media records.
- Only staff roles may write or delete files in `member-media`.
- Anonymous users receive no media table or Storage access.

4. Important Notes
- The bucket remains private so file paths cannot be used as permanent public links.
- The application must generate short-lived signed URLs for downloads.
- Upload paths begin with the uploader's authenticated user ID to prevent cross-account writes.
*/

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 104857600),
  published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;

DROP POLICY IF EXISTS "members_read_published_media" ON public.media_assets;
CREATE POLICY "members_read_published_media"
ON public.media_assets FOR SELECT
TO authenticated
USING (
  published
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR public.has_role(auth.uid(), 'finance_officer')
  OR public.has_role(auth.uid(), 'follow_up_manager')
  OR public.has_role(auth.uid(), 'department_leader')
  OR public.has_role(auth.uid(), 'group_leader')
);

DROP POLICY IF EXISTS "staff_insert_media" ON public.media_assets;
CREATE POLICY "staff_insert_media"
ON public.media_assets FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  )
);

DROP POLICY IF EXISTS "staff_update_media" ON public.media_assets;
CREATE POLICY "staff_update_media"
ON public.media_assets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR public.has_role(auth.uid(), 'department_leader')
  OR public.has_role(auth.uid(), 'group_leader')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR public.has_role(auth.uid(), 'department_leader')
  OR public.has_role(auth.uid(), 'group_leader')
);

DROP POLICY IF EXISTS "staff_delete_media" ON public.media_assets;
CREATE POLICY "staff_delete_media"
ON public.media_assets FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pastor')
  OR public.has_role(auth.uid(), 'department_leader')
  OR public.has_role(auth.uid(), 'group_leader')
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-media',
  'member-media',
  false,
  104857600,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "members_read_published_media_files" ON storage.objects;
CREATE POLICY "members_read_published_media_files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-media'
  AND EXISTS (
    SELECT 1
    FROM public.media_assets asset
    WHERE asset.storage_path = storage.objects.name
      AND (
        asset.published
        OR public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'pastor')
        OR public.has_role(auth.uid(), 'finance_officer')
        OR public.has_role(auth.uid(), 'follow_up_manager')
        OR public.has_role(auth.uid(), 'department_leader')
        OR public.has_role(auth.uid(), 'group_leader')
      )
  )
);

DROP POLICY IF EXISTS "staff_insert_media_files" ON storage.objects;
CREATE POLICY "staff_insert_media_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  )
);

DROP POLICY IF EXISTS "staff_update_media_files" ON storage.objects;
CREATE POLICY "staff_update_media_files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  )
)
WITH CHECK (
  bucket_id = 'member-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  )
);

DROP POLICY IF EXISTS "staff_delete_media_files" ON storage.objects;
CREATE POLICY "staff_delete_media_files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'pastor')
    OR public.has_role(auth.uid(), 'department_leader')
    OR public.has_role(auth.uid(), 'group_leader')
  )
);