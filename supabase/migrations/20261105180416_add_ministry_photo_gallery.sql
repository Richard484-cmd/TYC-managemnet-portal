/*
# Add ministry photo gallery (slideshow photos per ministry)

1. New Tables
- `public_ministry_photos`
  - `id` (uuid, primary key)
  - `ministry_id` (uuid, references public_ministries, cascades on delete)
  - `image_url` (text, public URL shown on the website)
  - `storage_path` (text, nullable; path inside the ministry-photos bucket, null for photos that came from the site's own image files)
  - `sort_order` (integer, display order in the slideshow)
  - `created_at` (timestamptz)

2. Modified Tables
- None. The existing single `image_url` column on `public_ministries` is kept untouched and is no longer read by the site.

3. Data
- Each ministry that already had a photo in `image_url` gets that photo copied into the new table as its first slideshow photo. Re-running this is safe; it only inserts ministries that have no photos yet.

4. Security
- Row level security enabled on `public_ministry_photos`.
- Visitors (anon) and signed-in users can read photos only for published ministries.
- Staff who can manage website ministries (super admin, admin, pastor) can read, add and remove photos. Photos cannot be edited in place.
- Browser roles get only the privileges their policies need: SELECT for everyone, INSERT and DELETE for authenticated.

5. Important Notes
- Upload storage rules for the ministry-photos bucket already restrict each upload to the ministry's own folder and to staff, and are reused as-is.
*/

CREATE TABLE IF NOT EXISTS public.public_ministry_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.public_ministries(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_ministry_photos_ministry_sort_idx
  ON public.public_ministry_photos (ministry_id, sort_order);

ALTER TABLE public.public_ministry_photos ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.public_ministry_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.public_ministry_photos TO authenticated;

DROP POLICY IF EXISTS "public_ministry_photos_select_published" ON public.public_ministry_photos;
CREATE POLICY "public_ministry_photos_select_published" ON public.public_ministry_photos
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.public_ministries pm
      WHERE pm.id = public_ministry_photos.ministry_id
        AND pm.is_published = true
    )
  );

DROP POLICY IF EXISTS "public_ministry_photos_select_staff" ON public.public_ministry_photos;
CREATE POLICY "public_ministry_photos_select_staff" ON public.public_ministry_photos
  FOR SELECT
  TO authenticated
  USING (public.can_manage_website_ministries());

DROP POLICY IF EXISTS "public_ministry_photos_insert_staff" ON public.public_ministry_photos;
CREATE POLICY "public_ministry_photos_insert_staff" ON public.public_ministry_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_website_ministries()
    AND EXISTS (
      SELECT 1 FROM public.public_ministries pm
      WHERE pm.id = public_ministry_photos.ministry_id
    )
  );

DROP POLICY IF EXISTS "public_ministry_photos_delete_staff" ON public.public_ministry_photos;
CREATE POLICY "public_ministry_photos_delete_staff" ON public.public_ministry_photos
  FOR DELETE
  TO authenticated
  USING (public.can_manage_website_ministries());

INSERT INTO public.public_ministry_photos (ministry_id, image_url, storage_path, sort_order)
SELECT pm.id, pm.image_url, NULL, 0
FROM public.public_ministries pm
WHERE pm.image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.public_ministry_photos existing
    WHERE existing.ministry_id = pm.id
  );
