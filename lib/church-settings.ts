import { createClient } from '@/lib/supabase/server';

export interface ChurchSettings {
  church_name: string;
  church_tagline: string;
  church_address: string;
  church_phone: string;
  church_email: string;
  church_website: string;
  church_description: string;
  service_times: string;
  members_count: string;
}

const DEFAULT_SETTINGS: ChurchSettings = {
  church_name: 'The Youth Church of the Epiphany',
  church_tagline: 'TYC · A community of faith, hope, and love',
  church_address: '',
  church_phone: '',
  church_email: '',
  church_website: '',
  church_description: '',
  service_times: 'Sundays 8:00 AM & Wednesdays 5:00 PM',
  members_count: '—',
};

export async function getChurchSettings(): Promise<ChurchSettings> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('church_settings')
      .select('key, value')
      .eq('is_public', true);

    if (error || !data) return DEFAULT_SETTINGS;

    const settings = { ...DEFAULT_SETTINGS };
    for (const row of data) {
      const val = (row.value as { value?: string })?.value;
      if (val !== undefined && row.key in settings) {
        (settings as Record<string, string>)[row.key] = val;
      }
    }

    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
