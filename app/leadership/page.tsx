import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

const LEADERS = [
  {
    name: "Rt Rev'd Dr. Enoch Atuboyedia",
    role: 'Senior Pastor',
    detail: 'Bishop Diocese of Okrika',
    image: '/images/leadership/WhatsApp_Image_2026-10-07_at_18.11.50.jpeg',
  },
  {
    name: 'Ven Tamunoiyalla Somiari',
    role: 'Supervisor',
    image: '/images/leadership/image.png',
  },
  {
    name: "Rev'd Erasmus Thomas Owunari",
    role: 'Lead Pastor',
    image: '/images/leadership/IMG-20250923-WA0005.jpg.jpeg',
  },
  {
    name: 'Pst Precious Tamunokonbia',
    role: 'Assistant Pastor',
    image: '/images/leadership/image copy.png',
  },
  {
    name: 'Mrs. Adaogu Nekabari',
    role: 'General Secretary',
    image: '/images/leadership/image copy 2.png',
  },
  {
    name: 'George, Joseph Tams',
    role: 'Assistant General Secretary',
    image: '/images/leadership/257756.jpg copy.jpeg',
  },
  {
    name: 'Richard Stanford',
    role: 'Tech Team Leader',
    image: '/images/leadership/Richie copy.jpeg',
  },
];

export default async function LeadershipPage() {
  const settings = await getChurchSettings();

  return (
    <PublicLayout settings={settings}>
      <section className="relative isolate overflow-hidden bg-[#031A3A] py-24 text-white sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_10%,rgba(244,185,66,0.22),transparent_30%),linear-gradient(135deg,#031A3A_0%,#0A294D_58%,#0C3855_100%)]" />
        <div className="absolute -bottom-32 -left-20 -z-10 h-72 w-72 rounded-full border border-[#F4B942]/20" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#F4B942]">Our team</p>
          <h1 className="mt-5 font-serif text-5xl font-bold tracking-[-0.04em] sm:text-7xl">Leadership</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#D7E3F1]">
            Faithful servants dedicated to guiding and nurturing our community with wisdom, compassion, integrity, and unwavering faith.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F2F6F3] py-20 sm:py-28">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#DCEBE5]/70 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#B67E16]">Serving together</p>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-[-0.03em] text-[#092A5F] sm:text-5xl">The people guiding our church.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[#506174]">A leadership team committed to spiritual growth, excellence and the care of every person.</p>
          </div>

          <div className="grid gap-7 sm:grid-cols-2">
            {LEADERS.map((leader) => (
              <Card key={leader.name} className="group overflow-hidden rounded-[30px] border-[#D6E0DB] bg-[#FFFDF8] shadow-[0_16px_45px_rgba(9,42,95,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(9,42,95,0.15)]">
                <div className="relative aspect-[4/4.5] overflow-hidden bg-[#DCEBE5]">
                  <img src={leader.image} alt={leader.name} className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#031A3A]/55 to-transparent" />
                  <div className="absolute bottom-5 left-5 rounded-full border border-white/30 bg-[#F4B942] px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#031A3A]">Leadership</div>
                </div>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="font-serif text-2xl font-medium leading-tight text-[#24324A]">{leader.name}</h3>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#9B6B08]">{leader.role}</p>
                  {leader.detail && <p className="mt-2 text-sm text-[#667487]">{leader.detail}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-14 rounded-[30px] border border-[#C8D9D1] bg-[#E4F0EB] p-8 text-center shadow-[0_14px_35px_rgba(9,42,95,0.05)] sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B67E16]">Stay connected</p>
            <h3 className="mt-3 font-serif text-2xl font-semibold text-[#092A5F]">Want to connect with our team?</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#506174]">
              We would love to hear from you. Reach out with any questions or to learn more about serving.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
              {settings.church_email && (
                <a href={`mailto:${settings.church_email}`} className="flex items-center gap-2 text-sm font-medium text-[#092A5F] transition-colors hover:text-[#B67E16] hover:underline">
                  <Mail className="h-4 w-4" />
                  {settings.church_email}
                </a>
              )}
              {settings.church_phone && (
                <a href={`tel:${settings.church_phone}`} className="flex items-center gap-2 text-sm font-medium text-[#092A5F] transition-colors hover:text-[#B67E16] hover:underline">
                  <Phone className="h-4 w-4" />
                  {settings.church_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
