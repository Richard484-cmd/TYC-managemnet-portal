/*
# Public ministries with per-ministry photo uploads

1. New Tables
- `public_ministries`: the ministries shown on the public Ministries page.
  - `id` (uuid, primary key)
  - `slug` (text, unique) stable identifier used for storage folders
  - `name`, `description`, `meeting_text` (text shown on the card)
  - `icon_key` (text) key of the icon shown on the card
  - `tone` (text, hex colour) background tint of the card
  - `image_url` (text) photo shown on the card; set by staff uploads
  - `sort_order` (integer) display order
  - `is_published` (boolean) hidden from the public site when false
  - `created_at`, `updated_at`

2. Storage
- New public bucket `ministry-photos` (5 MB limit, JPEG / PNG / WebP only).
- Anyone can read photos (the public website shows them); only staff can upload, replace or delete them.

3. Security
- RLS enabled on `public_ministries`.
- Anonymous and signed-in visitors can read published rows only.
- Staff (super_admin, admin, pastor) can read all rows and change only `image_url`, `updated_at`.
- No client can insert or delete ministries through the API.
- Helper `can_manage_website_ministries()` centralises the staff check.

4. Seed data
- The 11 ministries currently shown on the website are inserted. Re-running is safe.

# Notes
1. Existing rows keep their current photo paths until staff upload a replacement.
2. Replaced photos remain in the bucket; they are no longer referenced.
*/

CREATE OR REPLACE FUNCTION public.can_manage_website_ministries()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'super_admin', 'church', NULL)
    OR has_role(auth.uid(), 'admin', 'church', NULL)
    OR has_role(auth.uid(), 'pastor', 'church', NULL);
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_website_ministries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_website_ministries() TO authenticated;

CREATE TABLE IF NOT EXISTS public.public_ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  meeting_text text NOT NULL DEFAULT 'Contact us for gathering times',
  icon_key text NOT NULL DEFAULT 'users',
  tone text NOT NULL DEFAULT '#EEF3FA',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_ministries ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.public_ministries TO anon, authenticated;
GRANT UPDATE (image_url, updated_at) ON public.public_ministries TO authenticated;

DROP POLICY IF EXISTS "public_ministries_select_published" ON public.public_ministries;
CREATE POLICY "public_ministries_select_published" ON public.public_ministries FOR SELECT
TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "public_ministries_select_staff" ON public.public_ministries;
CREATE POLICY "public_ministries_select_staff" ON public.public_ministries FOR SELECT
TO authenticated
USING (public.can_manage_website_ministries());

DROP POLICY IF EXISTS "public_ministries_update_staff" ON public.public_ministries;
CREATE POLICY "public_ministries_update_staff" ON public.public_ministries FOR UPDATE
TO authenticated
USING (public.can_manage_website_ministries())
WITH CHECK (public.can_manage_website_ministries());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ministry-photos',
  'ministry-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "ministry_photos_insert_staff" ON storage.objects;
CREATE POLICY "ministry_photos_insert_staff" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ministry-photos' AND public.can_manage_website_ministries());

DROP POLICY IF EXISTS "ministry_photos_update_staff" ON storage.objects;
CREATE POLICY "ministry_photos_update_staff" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ministry-photos' AND public.can_manage_website_ministries())
WITH CHECK (bucket_id = 'ministry-photos' AND public.can_manage_website_ministries());

DROP POLICY IF EXISTS "ministry_photos_delete_staff" ON storage.objects;
CREATE POLICY "ministry_photos_delete_staff" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ministry-photos' AND public.can_manage_website_ministries());

INSERT INTO public.public_ministries (slug, name, description, meeting_text, icon_key, tone, image_url, sort_order) VALUES
  ('worship-music', 'Worship & Music', 'Lead the congregation into God''s presence through music, song and creative arts.', 'Thursdays at 7:00 PM', 'music', '#FFF8E8', '/images/hero/image copy 5.png', 1),
  ('childrens-ministry', 'Children''s Ministry', 'Create a safe, joyful environment where children discover God''s love and grow together.', 'Sundays during service', 'users', '#EDF7F4', '/images/hero/image-clean.png', 2),
  ('youth-ministry', 'Youth Ministry', 'Build friendships, grow in faith and explore real-life questions in a supportive community.', 'Fridays at 7:00 PM', 'users', '#EEF3FA', '/images/hero/image copy 8.png', 3),
  ('bible-study', 'Bible Study', 'Explore Scripture, discuss practical application and pray together each week.', 'Wednesdays at 7:00 PM', 'book-open', '#F5F0FA', '/images/hero/image copy 9.png', 4),
  ('outreach-missions', 'Outreach & Missions', 'Serve our community and carry practical hope to people near and far.', 'Various times', 'hand-coins', '#F8F1EA', '/images/hero/WhatsApp_Image_2026-10-01_at_20.50.38.jpeg', 5),
  ('prayer-ministry', 'Prayer Ministry', 'Stand in intercession for our church, community and individual prayer requests.', 'Tuesdays at 6:00 AM', 'heart', '#ECF5F7', '/images/hero/image copy 10.png', 6),
  ('de-potters', 'DE Potters', 'Our drama unit paints the Scripture with pictures, bringing God''s Word to life on stage.', 'Contact us for gathering times', 'drama', '#FBF0EC', 'https://images.pexels.com/photos/6896223/pexels-photo-6896223.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 7),
  ('ushering', 'Ushering', 'Welcome every guest with warmth and help every service flow with excellence and order.', 'Contact us for gathering times', 'door-open', '#F3F6EC', 'https://images.pexels.com/photos/5737831/pexels-photo-5737831.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 8),
  ('men-ministry', 'Men Ministry', 'A brotherhood of men growing in faith, leadership and accountability as they serve their families and church.', 'Contact us for gathering times', 'user-round', '#EEF2F7', 'https://images.pexels.com/photos/15021636/pexels-photo-15021636.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 9),
  ('women-ministry', 'Women Ministry', 'A community of women encouraging one another in prayer, purpose and the strength found in Christ.', 'Contact us for gathering times', 'flower-2', '#F8EEF3', 'https://images.pexels.com/photos/24023629/pexels-photo-24023629.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 10),
  ('tech-department', 'Tech Department', 'Using technology for His glory, we power our services, media and digital outreach with skill and creativity.', 'Contact us for gathering times', 'monitor', '#EAF2F8', 'https://images.pexels.com/photos/8102680/pexels-photo-8102680.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 11)
ON CONFLICT (slug) DO NOTHING;
