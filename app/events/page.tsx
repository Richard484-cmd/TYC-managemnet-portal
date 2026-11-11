import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, ArrowRight, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const settings = await getChurchSettings();
  const supabase = createClient();

  let events: { id: string; title: string; description: string | null; start_date: string; end_date: string | null; location: string | null; image_url: string | null; requires_registration: boolean | null; capacity: number | null; status: string | null }[] = [];
  try {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, start_date, end_date, location, image_url, requires_registration, capacity, status')
      .eq('is_public', true)
      .is('deleted_at', null)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true });
    events = data ?? [];
  } catch {
    events = [];
  }

  return (
    <PublicLayout settings={settings}>
      <section className="relative isolate overflow-hidden bg-[#031A3A] py-24 text-white sm:py-32">
        <img src="/images/hero/image copy 8.png" alt="Church community gathering" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#031A3A_8%,rgba(3,26,58,0.86)_52%,rgba(3,26,58,0.45))]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Badge className="border-[#F4B942]/40 bg-[#F4B942] text-[#031A3A] hover:bg-[#F4B942]">What&apos;s Happening</Badge>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl font-bold tracking-[-0.04em] sm:text-7xl">Make room for what matters.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#D7E3F1]">Join us for worship, fellowship, and special gatherings throughout the year.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {events.length > 0 ? (
            <div className="space-y-6">
              {events.map((event) => {
                const eventDate = new Date(event.start_date);
                const day = eventDate.toLocaleDateString('en-US', { day: 'numeric' });
                const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

                return (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="overflow-hidden transition-shadow hover:shadow-md">
                      <div className="flex flex-col sm:flex-row">
                        <div className="flex shrink-0 flex-col items-center justify-center bg-primary p-6 text-primary-foreground sm:w-28">
                          <span className="text-3xl font-bold">{day}</span>
                          <span className="text-sm">{month}</span>
                        </div>
                        <CardContent className="flex-1 p-6">
                          <h3 className="text-xl font-semibold">{event.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </span>
                            )}
                            {event.requires_registration && (
                              <span className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                Registration Required
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <Button variant="ghost" size="sm" className="mt-3 p-0">
                            View Details
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No Upcoming Events</h3>
              <p className="mt-2 text-muted-foreground">
                There are no events scheduled at this time. Please check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
