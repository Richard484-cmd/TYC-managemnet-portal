import { getChurchSettings } from '@/lib/church-settings';
import { getPublishedPublicMinistries, getMinistryIcon } from '@/lib/public-ministries';
import { PublicLayout } from '@/components/public/public-layout';
import { MinistryPhotoSlideshow } from '@/components/public/ministry-photo-slideshow';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MinistriesPage() {
  const [settings, ministries] = await Promise.all([getChurchSettings(), getPublishedPublicMinistries()]);

  return (
    <PublicLayout settings={settings}>
      <section className="relative isolate flex min-h-[62svh] items-end overflow-hidden bg-[#031A3A] py-20 text-white sm:py-28">
        <img src="/images/hero/image copy 11.png" alt="Church worship gathering" className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_30%] opacity-70" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,26,58,0.9),rgba(3,26,58,0.5),rgba(3,26,58,0.1))]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(3,26,58,0.9),transparent_72%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F4B942]">Find your place</p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-7xl">There is a place for your gifts here.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#EAF2F8] sm:text-lg">Discover the people, spaces and opportunities that help you grow in faith while making a meaningful difference.</p>
        </div>
      </section>

      <section className="bg-[#EAF4F1] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#B67E16]">One church, many expressions</p>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-[-0.03em] text-[#092A5F] sm:text-5xl">Serve with purpose. Belong with joy.</h2>
          <p className="mt-5 text-base leading-8 text-[#506174]">Our ministries are designed to make room for your story, your gifts and your next step with God.</p>
        </div>
      </section>

      <section className="bg-[#F8F4EC] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {ministries === null ? (
            <p className="text-center text-base text-[#506174]">We could not load our ministries right now. Please check back shortly.</p>
          ) : ministries.length === 0 ? (
            <p className="text-center text-base text-[#506174]">Our ministries will be listed here soon.</p>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {ministries.map((ministry) => {
                const Icon = getMinistryIcon(ministry.icon_key);
                return (
                  <article key={ministry.id} className="group overflow-hidden rounded-[28px] border border-[#D8DED9] shadow-[0_14px_40px_rgba(9,42,95,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(9,42,95,0.14)]" style={{ backgroundColor: ministry.tone }}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#092A5F]/10">
                      {ministry.photos.length > 0 && (
                        <MinistryPhotoSlideshow photos={ministry.photos} alt={`${ministry.name} ministry`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#031A3A]/65 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4B942] text-[#031A3A] shadow-lg">
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-[#092A5F]">{ministry.name}</h3>
                      <p className="mt-3 min-h-[72px] text-sm leading-6 text-[#506174]">{ministry.description}</p>
                      <div className="mt-5 border-t border-[#092A5F]/10 pt-4">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#B67E16]">Gathering time</p>
                        <p className="mt-1 text-sm font-semibold text-[#092A5F]">{ministry.meeting_text}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#0C3855] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#F4B942]">Take the next step</p>
          <h2 className="mt-4 font-serif text-3xl font-bold sm:text-5xl">Ready to get connected?</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#D7E3F1]">Tell us where you feel called to serve and we will help you find the right ministry family.</p>
          <Button asChild size="lg" className="mt-8 rounded-full bg-[#F4B942] px-7 text-[#031A3A] hover:bg-[#F7C75F]">
            <Link href="/contact">Get Connected <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
