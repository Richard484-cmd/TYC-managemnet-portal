/*
# Update public ministry names, schedules, and display content

1. Purpose
- Update the public ministry information shown on the church website homepage.
- Make the requested ministries and gathering times accurate without changing the existing table structure.

2. Modified Records
- `public_ministries.slug = 'worship-music'`: Zion Harmonies now meets Saturdays at 5:00 PM.
- `public_ministries.slug = 'de-potters'`: name is displayed as `DE POTTERS` and the unit now meets Saturdays at 5:00 PM.
- `public_ministries.slug = 'youth-ministry'`: gathering time is changed to contact the church.
- `public_ministries.slug = 'prayer-ministry'`: Prayer Ministry now meets Mondays at 6:00 PM.
- `public_ministries.slug = 'bible-study'`: Bible Study now meets Wednesdays at 5:00 PM.
- `public_ministries.slug = 'sanctuary-unit'`: name is displayed as `Sanctuary Unit`.

3. Security
- No tables, columns, grants, or policies are created or modified.
- Existing public ministry access rules remain unchanged.

4. Important Notes
- The updates are matched by stable ministry slugs rather than generated IDs.
- The statements are safe to re-run and only update the requested public content.
*/

UPDATE public.public_ministries
SET meeting_text = 'Saturdays at 5:00 PM', updated_at = now()
WHERE slug IN ('worship-music', 'de-potters');

UPDATE public.public_ministries
SET meeting_text = 'Contact us for gathering times', updated_at = now()
WHERE slug = 'youth-ministry';

UPDATE public.public_ministries
SET meeting_text = 'Mondays at 6:00 PM', updated_at = now()
WHERE slug = 'prayer-ministry';

UPDATE public.public_ministries
SET meeting_text = 'Wednesdays at 5:00 PM', updated_at = now()
WHERE slug = 'bible-study';

UPDATE public.public_ministries
SET name = 'DE POTTERS', updated_at = now()
WHERE slug = 'de-potters';

UPDATE public.public_ministries
SET name = 'Sanctuary Unit', updated_at = now()
WHERE slug = 'sanctuary-unit';