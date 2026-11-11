import Link from 'next/link';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { ChurchLogo } from '@/components/branding/church-logo';
import type { ChurchSettings } from '@/lib/church-settings';

const FOOTER_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Ministries', href: '/ministries' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Events', href: '/events' },
  { label: 'Sermons', href: '/sermons' },
  { label: 'Give', href: '/give' },
  { label: 'Prayer', href: '/prayer' },
  { label: 'Contact', href: '/contact' },
];

export function PublicFooter({ settings }: { settings: ChurchSettings }) {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <ChurchLogo showTagline />
            <div className="flex gap-3">
              <a href="https://www.facebook.com/people/The-Youth-Church/100067826753974/?checkpoint_src=any" target="_blank" rel="noopener noreferrer" className="text-white/60 transition-colors hover:text-[#F4B942]" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 transition-colors hover:text-[#F4B942]" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 transition-colors hover:text-[#F4B942]" aria-label="YouTube">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">Quick Links</h3>
            <ul className="grid grid-cols-2 gap-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/65 transition-colors hover:text-[#F4B942]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">Contact</h3>
            <ul className="space-y-2 text-sm text-white/65">
              {settings.church_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{settings.church_address}</span>
                </li>
              )}
              {settings.church_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{settings.church_phone}</span>
                </li>
              )}
              {settings.church_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{settings.church_email}</span>
                </li>
              )}
              <li className="pt-2">
                <span className="font-medium text-white">Service Times</span>
                <br />
                {settings.service_times}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white/55">
          <p>&copy; {new Date().getFullYear()} {settings.church_name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
