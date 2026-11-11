import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { GiveOptions } from '@/components/public/give-options';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, ArrowRight, CalendarClock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function GivePage() {
  const settings = await getChurchSettings();
  const supabase = createClient();

  let campaigns: { id: string; name: string; description: string | null; goal_amount: string | null; raised_amount: string | null; currency: string | null; image_url: string | null; end_date: string | null }[] = [];
  try {
    const { data } = await supabase
      .from('giving_campaigns')
      .select('id, name, description, goal_amount, raised_amount, currency, image_url, end_date')
      .eq('is_public', true)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    campaigns = data ?? [];
  } catch {
    campaigns = [];
  }

  return (
    <PublicLayout settings={settings}>
      <section data-aos="fade-up" className="relative isolate overflow-hidden bg-[#031A3A] pb-24 pt-40 text-white sm:pb-32 sm:pt-48">
        <img
          src="/images/hero/image copy 19.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#011128]/85 via-[#031A3A]/70 to-[#031A3A]/95" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#031A3A]/90 via-[#031A3A]/60 to-transparent" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="mb-5 rounded-full bg-[#F4B942]/15 px-4 py-1.5 text-[#F4B942] hover:bg-[#F4B942]/20">Partner With Us</Badge>
          <h1 className="font-serif text-5xl font-bold tracking-tight text-white sm:text-6xl">Give</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/90">
            Your generosity makes it possible for us to serve our community, support missions,
            and share the love of Christ. Thank you for your partnership.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#ways-to-give"
              className="inline-flex items-center gap-2 rounded-full bg-[#F4B942] px-7 py-3 text-sm font-semibold text-[#071B3D] transition-all hover:-translate-y-0.5 hover:bg-[#F4B942]/90"
            >
              <Heart className="h-4 w-4" strokeWidth={2} />
              Ways to Give
            </a>
            {campaigns.length > 0 && (
              <a
                href="#campaigns"
                className="inline-flex items-center gap-2 rounded-full border border-white/60 px-7 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-[#F4B942] hover:text-[#F4B942]"
              >
                Active Campaigns
              </a>
            )}
          </div>
        </div>
      </section>

      <section id="ways-to-give" data-aos="fade-up" className="scroll-mt-24 bg-[#F5F7FA] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div data-aos="fade-up" className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B7791F]">Generosity</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#071B3D] sm:text-4xl">Ways to Give</h2>
            <p className="mt-4 text-base leading-7 text-[#667487]">
              Choose the option that works best for you. Every gift helps us serve, teach, and care for our community.
            </p>
          </div>
          <div data-aos="fade-up" data-aos-delay="150">
            <GiveOptions />
          </div>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section id="campaigns" data-aos="fade-up" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div data-aos="fade-up" className="mb-12 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B7791F]">Current Focus</p>
              <h2 className="mt-3 font-serif text-3xl font-bold text-[#071B3D] sm:text-4xl">Active Campaigns</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {campaigns.map((campaign, index) => {
                const goal = campaign.goal_amount ? parseFloat(campaign.goal_amount) : 0;
                const raised = parseFloat(campaign.raised_amount || '0');
                const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

                return (
                  <Card
                    key={campaign.id}
                    data-aos="fade-up"
                    data-aos-delay={String(Math.min(index, 3) * 120)}
                    className="group overflow-hidden rounded-[28px] border-[#DCE3EC] bg-white shadow-[0_18px_50px_rgba(7,27,61,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(7,27,61,0.14)]"
                  >
                    {campaign.image_url && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={campaign.image_url}
                          alt={campaign.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="p-7 sm:p-8">
                      <h3 className="font-serif text-2xl font-semibold text-[#071B3D]">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="mt-3 text-sm leading-6 text-[#667487]">{campaign.description}</p>
                      )}
                      {goal > 0 && (
                        <div className="mt-6 space-y-3 rounded-2xl bg-[#F5F7FA] p-5">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="text-lg font-bold text-[#071B3D]">
                              {campaign.currency} {raised.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[#667487]">
                              of {campaign.currency} {goal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2.5 bg-[#DCE3EC]" />
                          <p className="text-xs font-medium text-[#667487]">{progress.toFixed(0)}% of goal reached</p>
                        </div>
                      )}
                      {campaign.end_date && (
                        <p className="mt-5 flex items-center gap-2 text-xs font-medium text-[#667487]">
                          <CalendarClock className="h-4 w-4 text-[#B7791F]" />
                          Ends {new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section data-aos="fade-up" className="bg-[#F5F7FA] pb-24 sm:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            data-aos="zoom-in"
            className="relative overflow-hidden rounded-[32px] bg-[#071B3D] px-8 py-14 text-center text-white shadow-[0_24px_70px_rgba(7,27,61,0.25)] sm:px-14"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F4B942]/15 blur-3xl" />
            <div className="relative">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4B942] text-[#071B3D]">
                <Heart className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">Your Gift Matters</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85">
                Every gift, no matter the size, makes a difference. Thank you for partnering with us
                to share hope with our community and the world.
              </p>
              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-[#F4B942] px-7 py-3 text-sm font-semibold text-[#071B3D] transition-all hover:-translate-y-0.5 hover:bg-[#F4B942]/90"
                >
                  Contact Us About Giving
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
