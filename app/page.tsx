import { PublicLayout } from '@/components/public/public-layout';
import { HeroCarousel } from '@/components/public/hero-carousel';
import { HomepageSections, type HomepageEvent } from '@/components/public/homepage-sections';
import { getChurchSettings } from '@/lib/church-settings';
import { getPublishedPublicMinistries } from '@/lib/public-ministries';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 300;

async function getUpcomingEvents(): Promise<HomepageEvent[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date, end_date, location, requires_registration')
      .eq('is_public', true)
      .is('deleted_at', null)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(4);

    if (error) {
      console.error('homepage events load failed', error);
      return [];
    }

    return (data ?? []) as HomepageEvent[];
  } catch (error) {
    console.error('homepage events load failed', error);
    return [];
  }
}

export default async function Home() {
  const [settings, ministries, events] = await Promise.all([
    getChurchSettings(),
    getPublishedPublicMinistries(),
    getUpcomingEvents(),
  ]);

  return (
    <PublicLayout settings={settings}>
      <HeroCarousel churchName={settings.church_name} tagline={settings.church_tagline} />
      <HomepageSections settings={settings} ministries={ministries} events={events} />
    </PublicLayout>
  );
}
