import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users } from 'lucide-react';
import { PrayerRequestForm } from '@/components/public/prayer-request-form';
import { BackgroundSlideshow } from '@/components/public/background-slideshow';

export const dynamic = 'force-dynamic';

const PRAYER_HERO_IMAGES = [
  { src: '/images/hero/image copy 12.png', alt: 'Church members praying together with eyes closed' },
  { src: '/images/hero/image copy 13.png', alt: 'Worshippers lifting hands in prayer' },
  { src: '/images/hero/image copy 14.png', alt: 'A man praying with clasped hands' },
  { src: '/images/hero/image copy 15.png', alt: 'Church members kneeling in prayer on stage' },
];

export default async function PrayerPage() {
  const settings = await getChurchSettings();
  const supabase = createClient();

  let prayerRequests: { id: string; title: string; body: string; category: string | null; is_anonymous: boolean; created_at: string }[] = [];
  try {
    const { data } = await supabase
      .from('prayer_requests')
      .select('id, title, body, category, is_anonymous, created_at')
      .eq('visibility', 'public')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    prayerRequests = data ?? [];
  } catch {
    prayerRequests = [];
  }

  return (
    <PublicLayout settings={settings}>
      <section data-aos="fade-up" className="relative isolate flex min-h-[34rem] items-center overflow-hidden bg-[#071B3D] py-24 text-white sm:min-h-[38rem] sm:py-32">
        <BackgroundSlideshow images={PRAYER_HERO_IMAGES} splitRight />
        <div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-[#071B3D]/95 via-[#071B3D]/80 to-[#071B3D]/20 backdrop-blur-[2px] lg:w-[60%] lg:bg-[#071B3D]/75 lg:backdrop-blur-md" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#071B3D]/80 via-transparent to-[#071B3D]/25" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl lg:w-[58%] lg:pr-10">
            <Badge className="border-[#F4B942]/40 bg-[#F4B942] text-[#031A3A] hover:bg-[#F4B942]">Prayer</Badge>
            <h1 className="mt-5 font-serif text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-white sm:text-7xl">There is power in praying together.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">&ldquo;Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.&rdquo; — Philippians 4:6</p>
            <div className="mt-8 h-px w-20 bg-[#F4B942]" />
          </div>
        </div>
      </section>

      <section data-aos="fade-up" className="bg-[linear-gradient(135deg,#EAF3F0_0%,#F7F3EA_48%,#E7EEF5_100%)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="mb-10 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0B6863]">Community Prayer</p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#071B3D] sm:text-4xl">Prayer requests from our church family</h2>
            <p className="mt-4 text-base leading-7 text-[#526477]">Stand with others as they bring their needs before God.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr] lg:items-start">
            <div>
              {prayerRequests.length > 0 ? (
                <div className="space-y-4">
                  {prayerRequests.map((request, index) => (
                    <Card key={request.id} data-aos="fade-up" data-aos-delay={String(Math.min(index, 3) * 100)} className="rounded-[28px] border-[#D3E1DC] bg-[#FFFDF8]/90 shadow-[0_18px_50px_rgba(7,27,61,0.09)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(7,27,61,0.14)]">
                      <CardContent className="p-7">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCEEE8]">
                            <Heart className="h-5 w-5 text-[#0B6863]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-serif text-lg font-semibold text-[#071B3D]">{request.title}</h3>
                              {request.category && <Badge variant="outline" className="border-[#B8D3C9] bg-[#F4FBF7] capitalize text-[#0B6863]">{request.category}</Badge>}
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[#526477]">{request.body}</p>
                            <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-[#7C8A98]">
                              {request.is_anonymous ? 'Anonymous' : 'Community Member'} &middot;{' '}
                              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-[#B8D3C9] bg-[#FFFDF8]/80 p-12 text-center shadow-[0_18px_50px_rgba(7,27,61,0.06)]">
                  <Users className="mx-auto mb-4 h-12 w-12 text-[#0B6863]" />
                  <h3 className="font-serif text-xl font-semibold text-[#071B3D]">No prayer requests yet</h3>
                  <p className="mt-2 text-[#526477]">Be the first to share a prayer request with our community.</p>
                </div>
              )}
            </div>

            <div data-aos="fade-left" data-aos-delay="150" className="lg:sticky lg:top-28">
              <PrayerRequestForm />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
