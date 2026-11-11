'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Heart,
  LogIn,
  Home,
  Info,
  Users,
  Sparkles,
  Images,
  CalendarDays,
  PlayCircle,
  HandHelping,
  Mail,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { ChurchLogo } from '@/components/branding/church-logo';

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: Info },
  { label: 'Leadership', href: '/leadership', icon: Users },
  { label: 'Ministries', href: '/ministries', icon: Sparkles },
  { label: 'Gallery', href: '/gallery', icon: Images },
  { label: 'Events', href: '/events', icon: CalendarDays },
  { label: 'Sermons', href: '/sermons', icon: PlayCircle },
  { label: 'Prayer', href: '/prayer', icon: HandHelping },
  { label: 'Contact', href: '/contact', icon: Mail },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number } | null>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const pathname = usePathname();

  const activeIndex = NAV_LINKS.findIndex((link) => isActive(pathname, link.href));
  const targetIndex = hoveredIndex ?? activeIndex;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = linkRefs.current[targetIndex];
    if (el) {
      setUnderlineStyle({ left: el.offsetLeft, width: el.offsetWidth });
    } else {
      setUnderlineStyle(null);
    }
  }, [targetIndex, scrolled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    if (menuOpen) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <>
      <header
        className={`fixed top-0 z-[100] w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/10 bg-[#07111f]/80 backdrop-blur-md'
            : 'bg-transparent'
        }`}
      >
      <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:gap-8 lg:px-10">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center"
          onClick={() => setMenuOpen(false)}
        >
          <ChurchLogo />
        </Link>

        <nav
          className="relative hidden flex-1 items-center justify-center gap-5 xl:flex 2xl:gap-7"
          aria-label="Main navigation"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {NAV_LINKS.map((link, i) => {
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => { linkRefs.current[i] = el; }}
                onMouseEnter={() => setHoveredIndex(i)}
                className={`text-[0.82rem] font-medium tracking-wide transition-colors ${
                  targetIndex === i ? 'text-[#F4B942]' : 'text-white hover:text-[#F4B942]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {underlineStyle && (
            <span
              className="pointer-events-none absolute bottom-[-2px] h-[2px] rounded-full bg-[#F4B942] transition-all duration-300 ease-out"
              style={{ left: underlineStyle.left, width: underlineStyle.width }}
            />
          )}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden items-center gap-1.5 rounded-full border border-[#F4B942]/70 px-4 py-2 text-[0.82rem] font-semibold tracking-wide text-white transition-all hover:-translate-y-0.5 hover:border-[#F4B942] hover:text-[#F4B942] xl:inline-flex"
          >
            <LogIn className="h-3.5 w-3.5" strokeWidth={2} />
            Sign In
          </a>
          <Link
            href="/give"
            className="hidden items-center gap-1.5 rounded-full bg-[#F4B942] px-5 py-2 text-[0.82rem] font-semibold tracking-wide text-[#0B1F4B] transition-all hover:-translate-y-0.5 hover:bg-[#F4B942]/90 xl:inline-flex"
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={2} />
            Give
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:text-white xl:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </header>

      {/* Mobile navigation drawer */}
      <div
        className={`fixed inset-0 z-[110] xl:hidden ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMenu}
        />

        {/* Panel */}
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={`absolute right-0 top-0 flex h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-l-[2rem] border-l border-white/20 bg-gradient-to-br from-[#244d6d]/95 via-[#102f50]/95 to-[#071b36]/95 shadow-[-24px_0_70px_rgba(1,12,30,0.5)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#102f50]/80 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: "url('/images/nav/image.png')" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[#061633]/70" />
          <span className="pointer-events-none absolute -right-24 top-16 h-56 w-56 rounded-full bg-[#F4B942]/16 blur-3xl" />
          <span className="pointer-events-none absolute -left-28 bottom-24 h-64 w-64 rounded-full bg-[#8bc6c8]/12 blur-3xl" />
          <span className="pointer-events-none absolute inset-x-8 top-24 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Panel header */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/15 px-5 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <ChurchLogo compact />
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-white/70 transition-all hover:border-white/30 hover:bg-white/15 hover:text-white"
              onClick={closeMenu}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Navigation links */}
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-6 touch-pan-y scroll-smooth">
            <p className="px-3 pb-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#F4B942]/80">
              Menu
            </p>
            <ul className="space-y-1">
              {NAV_LINKS.map((link, index) => {
                const active = isActive(pathname, link.href);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      style={{ transitionDelay: menuOpen ? `${index * 40 + 100}ms` : '0ms' }}
                      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ${
                        menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                      } ${
                        active
                          ? 'border border-white/20 bg-white/14 text-white shadow-[0_8px_24px_rgba(3,26,58,0.22)]'
                          : 'border border-transparent text-white/75 hover:border-white/15 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          active
                            ? 'bg-[#F4B942] text-[#0B1F4B] shadow-[0_4px_14px_rgba(244,185,66,0.25)]'
                            : 'border border-white/10 bg-white/10 text-white/65 group-hover:border-[#F4B942]/40 group-hover:text-[#F4B942]'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="flex-1 text-[0.95rem] font-medium tracking-wide">{link.label}</span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F4B942]" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* CTA section */}
          <div className="relative z-10 flex-none border-t border-white/10 bg-[#061633]/55 px-6 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
            <Link
              href="/contact"
              onClick={closeMenu}
              className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F4B942] px-6 text-[0.95rem] font-bold text-[#0B1F4B] transition-all hover:bg-[#E6A82F] active:scale-[0.98]"
            >
              Plan Your Visit
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href="/login"
                onClick={closeMenu}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-4 text-[0.85rem] font-semibold text-white/90 transition-colors hover:border-[#F4B942] hover:text-[#F4B942]"
              >
                <LogIn className="h-4 w-4" strokeWidth={2} />
                Sign In
              </a>
              <Link
                href="/give"
                onClick={closeMenu}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#F4B942]/50 bg-[#F4B942]/10 px-4 text-[0.85rem] font-semibold text-[#F4B942] transition-colors hover:bg-[#F4B942]/20"
              >
                <Heart className="h-4 w-4" strokeWidth={2} />
                Give
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
