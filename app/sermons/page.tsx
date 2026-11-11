import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, CalendarDays, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SERMONS = [
  {
    title: 'Walking by Faith, Not by Sight',
    speaker: 'Pastor Name',
    date: 'September 22, 2026',
    duration: '42 min',
    series: 'Faith Foundations',
    description: 'What does it mean to trust God when we cannot see the path ahead? This message explores biblical faith through the story of Abraham.',
    videoUrl: '#',
    image: '/images/hero/image copy 9.png',
  },
  {
    title: 'The Heart of Worship',
    speaker: 'Pastor Name',
    date: 'September 15, 2026',
    duration: '38 min',
    series: 'Faith Foundations',
    description: 'True worship is not about songs on Sunday — it is about a life surrendered to God every day of the week.',
    videoUrl: '#',
    image: '/images/hero/image copy 10.png',
  },
  {
    title: 'Loving Your Neighbor',
    speaker: 'Associate Pastor Name',
    date: 'September 8, 2026',
    duration: '35 min',
    series: 'Living the Gospel',
    description: 'Jesus said the second greatest commandment is to love our neighbor. But who is our neighbor, and what does love look like?',
    videoUrl: '#',
    image: '/images/hero/image copy 11.png',
  },
  {
    title: 'Finding Hope in Hard Times',
    speaker: 'Pastor Name',
    date: 'September 1, 2026',
    duration: '40 min',
    series: 'Living the Gospel',
    description: 'When life falls apart, where do we turn? The Psalms show us a path through suffering toward hope.',
    videoUrl: '#',
    image: '/images/hero/image-clean.png',
  },
  {
    title: 'The Power of Community',
    speaker: 'Pastor Name',
    date: 'August 25, 2026',
    duration: '36 min',
    series: 'Living the Gospel',
    description: 'God designed us for relationship. This message looks at the early church and what biblical community looks like today.',
    videoUrl: '#',
    image: '/images/hero/image.png',
  },
  {
    title: 'Grace That Changes Everything',
    speaker: 'Pastor Name',
    date: 'August 18, 2026',
    duration: '44 min',
    series: 'Foundations',
    description: 'Grace is the foundation of our faith — unearned, unmerited, and life-changing. This message explores what grace really means.',
    videoUrl: '#',
    image: '/images/hero/WhatsApp_Image_2026-10-01_at_20.50.38.jpeg',
  },
];

export default async function SermonsPage() {
  const settings = await getChurchSettings();

  return (
    <PublicLayout settings={settings}>
      <section className="relative isolate overflow-hidden bg-[#031A3A] py-24 text-white sm:py-32">
        <img src="/images/hero/image copy 9.png" alt="Worship service" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#031A3A_8%,rgba(3,26,58,0.86)_52%,rgba(3,26,58,0.45))]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Badge className="border-[#F4B942]/40 bg-[#F4B942] text-[#031A3A] hover:bg-[#F4B942]">Watch & Listen</Badge>
          <h1 className="mt-5 max-w-2xl font-serif text-5xl font-bold tracking-[-0.04em] sm:text-7xl">Words that stay with you.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#D7E3F1]">Catch up on messages designed to help you grow in your understanding of God and His purpose for your life.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Featured Sermon */}
          {SERMONS.length > 0 && (
            <div className="mb-12">
              <Badge variant="secondary" className="mb-4">Latest Message</Badge>
              <Card className="overflow-hidden">
                <div className="grid lg:grid-cols-2">
                  <div className="relative aspect-video bg-muted lg:aspect-auto">
                    <img
                      src={SERMONS[0].image}
                      alt={SERMONS[0].title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <PlayCircle className="h-16 w-16 text-white/90" />
                    </div>
                  </div>
                  <CardContent className="flex flex-col justify-center p-8">
                    <Badge variant="outline" className="mb-3 w-fit">{SERMONS[0].series}</Badge>
                    <h2 className="text-2xl font-bold">{SERMONS[0].title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {SERMONS[0].speaker} &middot; {SERMONS[0].date} &middot; {SERMONS[0].duration}
                    </p>
                    <p className="mt-4 text-muted-foreground">{SERMONS[0].description}</p>
                    <Button className="mt-6 w-fit">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Watch Now
                    </Button>
                  </CardContent>
                </div>
              </Card>
            </div>
          )}

          {/* Sermon Archive */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">All Sermons</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERMONS.map((sermon) => (
              <Card key={sermon.title} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={sermon.image}
                    alt={sermon.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40">
                    <PlayCircle className="h-12 w-12 text-white/90" />
                  </div>
                </div>
                <CardContent className="p-5">
                  <Badge variant="outline" className="mb-2">{sermon.series}</Badge>
                  <h3 className="font-semibold">{sermon.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{sermon.speaker}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {sermon.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sermon.duration}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
