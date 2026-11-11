/*
# Update church settings with TYC branding

## Purpose
Update the church_settings table to reflect the correct church name and tagline.

## Changes
- Update church_name to "The Youth Church of the Epiphany"
- Update church_tagline to "TYC · A community of faith, hope, and love"
*/

UPDATE church_settings SET value = jsonb_set(value, '{value}', '"The Youth Church of the Epiphany"') WHERE key = 'church_name';
UPDATE church_settings SET value = jsonb_set(value, '{value}', '"TYC · A community of faith, hope, and love"') WHERE key = 'church_tagline';

-- Insert if not exists
INSERT INTO church_settings (key, value, is_public)
SELECT 'church_name', jsonb_build_object('value', 'The Youth Church of the Epiphany'), true
WHERE NOT EXISTS (SELECT 1 FROM church_settings WHERE key = 'church_name');

INSERT INTO church_settings (key, value, is_public)
SELECT 'church_tagline', jsonb_build_object('value', 'TYC · A community of faith, hope, and love'), true
WHERE NOT EXISTS (SELECT 1 FROM church_settings WHERE key = 'church_tagline');
