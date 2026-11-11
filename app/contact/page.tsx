import { getChurchSettings } from '@/lib/church-settings';
import { PublicLayout } from '@/components/public/public-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContactForm } from '@/components/public/contact-form';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settings = await getChurchSettings();

  return (
    <PublicLayout settings={settings}>
      <section data-aos="fade-up" className="relative isolate overflow-hidden bg-[#031A3A] py-24 text-white sm:py-32">
        <img
          src="/images/hero/image copy 18.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#031A3A]/95 via-[#031A3A]/85 to-[#031A3A]/60" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#011128]/85 via-transparent to-[#031A3A]/40" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="mb-4 rounded-full bg-[#F4B942]/15 px-4 py-1.5 text-[#F4B942] hover:bg-[#F4B942]/20">Get in Touch</Badge>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-6xl">Contact Us</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">
            Have a question or want to connect? We would love to hear from you.
            Reach out using the form below or through any of our contact channels.
          </p>
        </div>
      </section>

      <section data-aos="fade-up" className="bg-[#F5F7FA] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.8fr] lg:items-start">
            <div className="space-y-6">
              <Card data-aos="slide-right" data-aos-duration="1400" data-aos-delay="200" className="rounded-[28px] border-[#DCE3EC] bg-white shadow-[0_18px_50px_rgba(7,27,61,0.08)]">
                <CardContent className="p-7">
                  <h3 className="mb-5 font-serif text-xl font-semibold text-[#071B3D]">Contact Information</h3>
                  <div className="space-y-5">
                    {settings.church_address && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#071B3D]">Address</p>
                          <p className="mt-1 text-sm leading-6 text-[#667487]">{settings.church_address}</p>
                        </div>
                      </div>
                    )}
                    {settings.church_phone && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#071B3D]">Phone</p>
                          <p className="mt-1 text-sm leading-6 text-[#667487]">{settings.church_phone}</p>
                        </div>
                      </div>
                    )}
                    {settings.church_email && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#071B3D]">Email</p>
                          <p className="mt-1 text-sm leading-6 text-[#667487]">{settings.church_email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#071B3D]">Service Times</p>
                        <p className="mt-1 text-sm leading-6 text-[#667487]">{settings.service_times}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-aos="slide-right" data-aos-duration="1400" data-aos-delay="900" className="rounded-[28px] border-[#DCE3EC] bg-[#071B3D] text-white shadow-[0_18px_50px_rgba(7,27,61,0.12)]">
                <CardContent className="p-7">
                  <h3 className="mb-3 font-serif text-xl font-semibold">Plan Your Visit</h3>
                  <p className="text-sm leading-6 text-white/80">
                    New to our church? We would love to welcome you on a Sunday.
                    Use the form to let us know you are coming and we will have
                    someone ready to greet you.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div data-aos="slide-left" data-aos-duration="1400" data-aos-delay="1600">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
