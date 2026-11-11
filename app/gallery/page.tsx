import { PublicLayout } from '@/components/public/public-layout';
import { getChurchSettings } from '@/lib/church-settings';

const galleryImages = [
  {
    src: '/images/welcome/image.png',
    alt: 'Church leaders and congregation gathered during a service',
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    src: '/images/hero/image.png',
    alt: 'Worship leader speaking during a church service',
    className: '',
  },
  {
    src: '/images/hero/WhatsApp_Image_2026-10-01_at_20.50.38.jpeg',
    alt: 'Youth church congregation gathered for worship',
    className: '',
  },
  {
    src: '/images/hero/image-clean.png',
    alt: 'Youth worship leader singing during a church service',
    className: '',
  },
  {
    src: '/images/hero/image copy 5.png',
    alt: 'Church members gathered together',
    className: 'md:col-span-2',
  },
];

export default async function GalleryPage() {
  const settings = await getChurchSettings();

  return (
    <PublicLayout settings={settings}>
      <main className="bg-[#F8F2E9] pb-20">
        <section className="relative isolate overflow-hidden bg-[#031A3A] py-24 text-white sm:py-32">
          <img src="/images/welcome/image.png" alt="Worship at the Youth Church of the Epiphany" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,#031A3A_8%,rgba(3,26,58,0.82)_50%,rgba(3,26,58,0.42))]" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-[#F4B942]">Our Community</p>
            <h1 className="mt-4 max-w-2xl font-serif text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-7xl">Moments worth remembering.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#D7E3F1] sm:text-lg">A visual collection of worship, fellowship, service, and community at the Youth Church of the Epiphany.</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8 sm:pt-20">
          <div className="grid auto-rows-[220px] gap-4 sm:auto-rows-[260px] md:grid-cols-2 md:grid-rows-2 lg:auto-rows-[280px]">
            {galleryImages.map((image) => (
              <div key={image.src} className={`group relative overflow-hidden rounded-2xl bg-[#E9DDCB] ${image.className}`}>
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#031A3A]/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
