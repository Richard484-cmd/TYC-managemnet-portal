import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Church, HandCoins, BookOpen } from 'lucide-react';
import { AboutHistory } from '@/components/public/about-history';
import { CoverVideoFrame } from '@/components/public/cover-video-frame';
import { getPublishedPublicMinistries } from '@/lib/public-ministries';

export const dynamic = 'force-dynamic';

const VALUES = [
  { title: 'Faith', description: 'We believe in the authority of Scripture and the power of prayer to transform lives.', icon: BookOpen },
  { title: 'Community', description: 'We are a family that supports, encourages, and holds each other accountable.', icon: Users },
  { title: 'Service', description: 'We follow Jesus by serving our neighbors both near and far.', icon: HandCoins },
  { title: 'Worship', description: 'We gather to honor God with hearts full of gratitude and praise.', icon: Church },
];

const CHURCH_BIRTHDAY = Date.UTC(2021, 0, 17);
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const buildStats = (memberCount: string, ministryCount: string) => [
  { value: memberCount, label: 'Members' },
  { value: ministryCount, label: 'Ministries' },
  { value: String(Math.floor((Date.now() - CHURCH_BIRTHDAY) / MS_PER_YEAR)), label: 'Years Serving' },
  { value: '50+', label: 'Volunteers' },
];

export default async function AboutPage() {
  const [settings, ministries] = await Promise.all([getChurchSettings(), getPublishedPublicMinistries()]);
  const stats = buildStats(settings.members_count, ministries ? String(ministries.length) : '—');

  return (
    <PublicLayout settings={settings}>
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-black pb-16 pt-32 text-white sm:py-32 lg:items-center">
        <CoverVideoFrame
          src="/videos/about-hero/WhatsApp_Video_2026-11-05_at_20.16.41.mp4"
          poster="/images/hero/image copy 8.png"
          title="Worship at The Youth Church"
        />
        <div className="absolute inset-0 z-10 bg-[linear-gradient(0deg,rgba(3,26,58,0.9)_0%,rgba(3,26,58,0.55)_38%,rgba(3,26,58,0)_70%)]" />
        <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="hero-slide-left text-xs font-bold uppercase tracking-[0.3em] text-[#F4B942] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">About Us</p>
          <h1 className="hero-slide-left mt-5 max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-[-0.035em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-6xl" style={{ animationDelay: '0.2s' }}>A living church for a growing generation.</h1>
          <p className="hero-slide-right mt-6 max-w-xl text-base leading-8 text-[#F1F6FA] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ animationDelay: '0.4s' }}>The Youth Church of the Epiphany is a vibrant spiritual community helping young people find belonging, grow in faith and serve with purpose.</p>
        </div>
      </section>

      <section data-aos="fade-up" className="bg-[#F4F7F6] py-20 sm:py-28">
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#B67E16]">Our story</p>
          <h2 className="mt-4 font-serif text-4xl font-bold tracking-[-0.03em] text-[#092A5F] sm:text-5xl">Rooted in prayer. Growing in purpose.</h2>
          <p className="mt-6 text-base leading-8 text-[#506174]">The Youth Church of the Epiphany (TYC) is one of the pioneering projects initiated by His Lordship, Rt. Rev. Dr. Enoch Atuboyedia, at the beginning of his episcopacy. The vision was inspired by the Holy Spirit to bridge the gap between older and younger generations, reconnect lost youths with the Church, and create a vibrant spiritual community for young people.</p>
          <AboutHistory />
        </article>
      </section>

      <section data-aos="fade-up" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative" data-aos="fade-right" data-aos-duration="1600" data-aos-easing="ease-out-cubic">
              <img
                src="/images/hero/WhatsApp_Image_2026-10-01_at_20.50.38.jpeg"
                alt="Church community gathering"
                className="rounded-2xl shadow-lg"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Our Mission</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                To make disciples of Jesus Christ who love God, love people, and make a difference in the world.
                We exist to help people take their next step toward Christ, no matter where they are on their journey.
              </p>
              <h3 className="mt-8 text-xl font-semibold">Our Vision</h3>
              <p className="mt-2 text-muted-foreground">
                Raising Godly youths that would be change agents round the world by impacting the society and the church positively.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" className="border-y border-border/40 bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What We Value</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              These core values shape everything we do as a church community.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{value.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section data-aos="fade-up" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
