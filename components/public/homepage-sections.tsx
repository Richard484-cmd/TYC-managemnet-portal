import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Quote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ChurchSettings } from '@/lib/church-settings';
import { getMinistryIcon, type PublicMinistry } from '@/lib/public-ministries';

export interface HomepageEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  requires_registration: boolean | null;
}

interface HomepageSectionsProps {
  settings: ChurchSettings;
  ministries: PublicMinistry[] | null;
  events: HomepageEvent[];
}

const testimonials = [
  {
    id: 'community-family',
    quote: 'This church became our family when we moved to the city. The love and support changed our lives.',
    author: 'John Omubo',
    role: 'Member since 2021',
  },
  {
    id: 'purpose-through-service',
    quote: 'Serving through outreach helped me discover purpose and grow closer to God in ways I never expected.',
    author: 'Albert Levi',
    role: 'Member',
  },
  {
    id: 'faith-foundations',
    quote: 'TYC gives young people a safe place to ask hard questions and build strong foundations of faith.',
    author: 'Ibimina Eremie',
    role: 'Member since 2021',
  },
];

const weeklyServices = [
  {
    id: 'sunday-service',
    name: 'Sunday Service',
    day: 'Every Sunday',
    time: '8:00 AM – 10:00 AM',
    description: 'Worship, teaching, prayer, and community for the week ahead.',
  },
  {
    id: 'midweek-service',
    name: 'Midweek Service',
    day: 'Every Wednesday',
    time: '5:00 PM – 7:00 PM',
    description: 'A focused evening to refuel through God’s Word and fellowship.',
  },
];

const featuredMinistrySlugs = new Set([
  'worship-music',
  'childrens-ministry',
  'youth-ministry',
  'bible-study',
  'prayer-ministry',
  'de-potters',
  'sanctuary-unit',
  'outreach-missions',
]);

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <Badge
        className={`mb-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
          light
            ? 'bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/20'
            : 'bg-[var(--brand-navy-800)]/10 text-[var(--brand-navy-800)] hover:bg-[var(--brand-navy-800)]/15'
        }`}
      >
        {eyebrow}
      </Badge>
      <h2
        id={id}
        className={`font-serif text-3xl font-bold leading-[1.12] tracking-[-0.025em] sm:text-4xl lg:text-5xl ${
          light ? 'text-white' : 'text-[var(--text-heading)]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 max-w-xl text-base leading-7 ${
            light ? 'text-white/75' : 'text-[var(--text-body)]'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function EventCard({ event }: { event: HomepageEvent }) {
  const eventDate = new Date(event.start_date);
  const day = eventDate.toLocaleDateString('en-US', { day: 'numeric' });
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const date = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Card className="h-full border-[var(--border)] bg-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="flex h-full gap-4 p-5">
        <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--brand-navy-900)] text-white">
          <span className="text-2xl font-bold leading-none">{day}</span>
          <span className="mt-1 text-xs font-bold tracking-[0.08em] text-[var(--brand-gold)]">{month}</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-bold leading-tight text-[var(--text-heading)]">{event.title}</h3>
          <p className="mt-2 text-sm font-medium text-[var(--text-body)]">{date}</p>
          <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-navy-700)]" />{time}</p>
            {event.location && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-navy-700)]" />{event.location}</p>}
          </div>
          {event.requires_registration && <p className="mt-3 text-xs font-semibold text-[var(--brand-navy-700)]">Registration required</p>}
          <Link href={`/events/${event.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--brand-navy-800)] transition-colors hover:text-[var(--brand-gold-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)] focus-visible:ring-offset-2">
            View details <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomepageSections({ settings, ministries, events }: HomepageSectionsProps) {
  return (
    <>
      <section aria-label="Quick information" className="border-b border-[var(--brand-navy-800)] bg-[var(--brand-navy-800)] py-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1fr_auto] lg:items-center lg:px-8">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-[var(--brand-gold)]" aria-hidden="true" />
            <div><h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]">Service times</h2><p className="mt-1 whitespace-pre-line text-base leading-6 text-white">{settings.service_times}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--brand-gold)]" aria-hidden="true" />
            <div><h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]">Location</h2><p className="mt-1 text-base leading-6 text-white">Okrika Grammar School, Okrika, Rivers State</p></div>
          </div>
          <Button asChild className="min-h-11 rounded-full bg-[var(--brand-gold)] px-6 text-base font-bold text-[var(--brand-navy-900)] shadow-sm hover:bg-[var(--brand-gold-hover)] hover:text-[var(--brand-navy-900)]"><Link href="/contact">Plan Your Visit<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section aria-labelledby="welcome-heading" className="overflow-hidden bg-[var(--brand-cream)]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="flex items-center px-4 py-16 sm:px-8 sm:py-20 lg:px-16 lg:py-24">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-navy-700)]">Welcome to TYC</p>
              <h2 id="welcome-heading" className="mt-4 font-serif text-3xl font-bold leading-[1.12] tracking-[-0.025em] text-[var(--brand-navy-800)] sm:text-4xl lg:text-5xl">A place to grow, belong, and live for Christ.</h2>
              <p className="mt-6 text-base leading-7 text-[var(--text-body)]">The Youth Church of the Epiphany is a welcoming community where young people encounter God, build meaningful relationships, and discover purpose together.</p>
              <ul className="mt-8 space-y-4" aria-label="What you can find at TYC">
                {['A welcoming community for young people', 'Grow through worship, fellowship, and God’s Word', 'Discover purpose and serve with impact'].map((point) => <li key={point} className="flex items-start gap-3 text-base font-medium leading-6 text-[var(--text-heading)]"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold)] text-[var(--brand-navy-900)]"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>{point}</li>)}
              </ul>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild className="min-h-11 rounded-full bg-[var(--brand-gold)] px-6 text-base font-bold text-[var(--brand-navy-900)] hover:bg-[var(--brand-gold-hover)] hover:text-[var(--brand-navy-900)]"><Link href="/about">More About Us</Link></Button><Button asChild variant="outline" className="min-h-11 rounded-full border-[var(--brand-navy-800)]/30 bg-transparent px-6 text-base font-bold text-[var(--brand-navy-800)] hover:border-[var(--brand-navy-800)] hover:bg-[var(--brand-navy-800)]/5"><Link href="/leadership">Meet Our Team</Link></Button></div>
            </div>
          </div>
          <div className="relative min-h-[360px] lg:min-h-[620px]"><Image src="/images/welcome/image.png" alt="A worship leader ministering at The Youth Church of the Epiphany" fill sizes="(min-width: 1024px) 50vw, 100vw" data-aos="fade-left" data-aos-duration="1600" data-aos-easing="ease-out-cubic" className="object-cover object-center" /></div>
        </div>
      </section>

      <section aria-labelledby="services-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading id="services-heading" eyebrow="Make space for worship" title="Weekly services" description="There is a place for you here. Join us for worship, teaching, and fellowship throughout the week." />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {weeklyServices.map((service, index) => <Card key={service.id} data-aos={index % 2 === 0 ? 'fade-right' : 'fade-left'} data-aos-duration="1100" data-aos-delay={index * 120} className="border-[var(--border)] shadow-none transition-shadow duration-300 hover:shadow-lg"><CardContent className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-navy-700)]">{service.day}</p><h3 className="mt-2 font-serif text-2xl font-bold text-[var(--text-heading)]">{service.name}</h3></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold)]/15 text-[var(--brand-navy-800)]"><Clock3 className="h-5 w-5" aria-hidden="true" /></div></div><p className="mt-4 text-base leading-7 text-[var(--text-body)]">{service.description}</p><div className="mt-6 flex flex-col gap-2 text-sm font-medium text-[var(--text-body)] sm:flex-row sm:gap-6"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--brand-navy-700)]" />{service.time}</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--brand-navy-700)]" />OGS, Okrika</span></div></CardContent></Card>)}
          </div>
          <div className="mt-8"><Button asChild className="min-h-11 rounded-full bg-[var(--brand-gold)] px-6 text-base font-bold text-[var(--brand-navy-900)] shadow-sm hover:bg-[var(--brand-gold-hover)] hover:text-[var(--brand-navy-900)]"><Link href="/contact">Plan Your Visit<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
      </section>

      <section aria-labelledby="events-heading" className="bg-[var(--brand-navy-900)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><SectionHeading id="events-heading" eyebrow="Mark your calendar" title="Upcoming events" description="Stay connected with special gatherings and moments we are looking forward to sharing together." light /><Button asChild variant="outline" className="min-h-11 shrink-0 rounded-full border-white/40 bg-transparent px-5 text-base font-bold text-white hover:border-[var(--brand-gold)] hover:bg-transparent hover:text-[var(--brand-gold)]"><Link href="/events">View All Events<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          {events.length > 0 ? <div className="mt-10 grid gap-5 md:grid-cols-2">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="mt-10 rounded-xl border border-dashed border-white/25 px-6 py-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-[var(--brand-gold)]" aria-hidden="true" /><h3 className="mt-4 font-serif text-2xl font-bold text-white">No upcoming events yet</h3><p className="mx-auto mt-2 max-w-md text-base leading-7 text-white/70">Check back soon for the next special gathering at TYC.</p></div>}
        </div>
      </section>

      <section aria-labelledby="ministries-heading" className="bg-[var(--brand-cream)] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><SectionHeading id="ministries-heading" eyebrow="Find your place" title="Ministries for every gift" description="Connect with people who share your passion and discover a meaningful way to serve." /><Button asChild variant="outline" className="min-h-11 shrink-0 rounded-full border-[var(--brand-navy-800)]/30 bg-transparent px-5 text-base font-bold text-[var(--brand-navy-800)] hover:border-[var(--brand-navy-800)] hover:bg-[var(--brand-navy-800)]/5"><Link href="/ministries">Explore All Ministries<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          {ministries === null ? <div className="mt-10 rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center text-base text-[var(--text-muted)]">We could not load our ministries right now. Please check back shortly.</div> : ministries.length === 0 ? <div className="mt-10 rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center text-base text-[var(--text-muted)]">Ministry information is coming soon.</div> : <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{ministries.filter((ministry) => featuredMinistrySlugs.has(ministry.slug)).sort((a, b) => a.sort_order - b.sort_order).map((ministry, index) => { const Icon = getMinistryIcon(ministry.icon_key); return <Card key={ministry.id} data-aos="fade-up" data-aos-duration="900" data-aos-delay={(index % 4) * 100} className="relative overflow-hidden border-[var(--border)] bg-white shadow-none transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="h-1" style={{ backgroundColor: ministry.tone || 'var(--brand-gold)' }} /><CardContent className="p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy-800)]/10 text-[var(--brand-navy-800)]"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="font-serif text-xl font-bold text-[var(--text-heading)]">{ministry.name}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-body)]">{ministry.description}</p>{ministry.meeting_text && <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{ministry.meeting_text}</p>}</CardContent></Card>; })}</div>}
        </div>
      </section>

      <section aria-labelledby="testimonies-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><SectionHeading id="testimonies-heading" eyebrow="Stories from our community" title="Real stories. Real lives." description="Hear how God is working through the people and community of TYC." /><div className="mt-10 grid gap-5 md:grid-cols-3">{testimonials.map((testimony) => <Card key={testimony.id} className="border-[var(--border)] bg-white shadow-none"><CardContent className="p-6"><Quote className="h-7 w-7 text-[var(--brand-gold-hover)]" aria-hidden="true" /><p className="mt-5 text-base italic leading-7 text-[var(--text-body)]">“{testimony.quote}”</p><div className="mt-6 border-t border-[var(--border)] pt-4"><p className="font-serif text-base font-bold text-[var(--text-heading)]">{testimony.author}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{testimony.role}</p></div></CardContent></Card>)}</div></div>
      </section>

      <section aria-labelledby="final-cta-heading" className="relative isolate overflow-hidden bg-[var(--brand-navy-900)] py-20 sm:py-24"><Image src="/images/hero/image%20copy.png" alt="" fill sizes="100vw" className="-z-20 object-cover" /><div className="absolute inset-0 -z-10 bg-[var(--brand-navy-900)]/80" /><div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)]">You belong here</p><h2 id="final-cta-heading" className="mt-4 font-serif text-3xl font-bold leading-tight tracking-[-0.025em] text-white sm:text-4xl lg:text-5xl">We Would Love to Welcome You</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/80">Come as you are. Find community, grow in faith, and take your next step with us.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="min-h-12 rounded-full bg-[var(--brand-gold)] px-7 text-base font-bold text-[var(--brand-navy-900)] shadow-lg hover:bg-[var(--brand-gold-hover)] hover:text-[var(--brand-navy-900)]"><Link href="/contact">Plan Your Visit<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline" className="min-h-12 rounded-full border-white/60 bg-transparent px-7 text-base font-bold text-white hover:border-[var(--brand-gold)] hover:bg-transparent hover:text-[var(--brand-gold)]"><Link href="/register">Create an Account</Link></Button></div></div></section>
    </>
  );
}
