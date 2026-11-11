import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarDays, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { EventRegistrationForm } from '@/components/public/event-registration-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  requires_registration: boolean | null;
  capacity: number | null;
  status: string | null;
  address: string | null;
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const settings = await getChurchSettings();
  const supabase = createClient();

  let event: EventDetail | null = null;
  try {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .eq('is_public', true)
      .is('deleted_at', null)
      .maybeSingle();
    event = data as EventDetail | null;
  } catch {
    event = null;
  }

  if (!event) notFound();

  const eventDate = new Date(event.start_date);

  return (
    <PublicLayout settings={settings}>
      <section className="border-b border-border/40 bg-muted/30 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{event.status}</Badge>
            {event.requires_registration && (
              <Badge variant="outline">Registration Required</Badge>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
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
            {event.capacity && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Capacity: {event.capacity}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {event.image_url && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <img src={event.image_url} alt={event.title} className="w-full object-cover" />
                </div>
              )}
              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold">About This Event</h2>
                <p className="mt-3 text-muted-foreground">
                  {event.description || 'No description available for this event.'}
                </p>
              </div>
            </div>
            <div>
              {event.requires_registration ? (
                <EventRegistrationForm eventId={event.id} />
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <h3 className="text-lg font-semibold">No Registration Required</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Just show up! We look forward to welcoming you.
                    </p>
                    {event.address && (
                      <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                        <MapPin className="mb-1 inline h-4 w-4" />
                        <p className="text-muted-foreground">{event.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
