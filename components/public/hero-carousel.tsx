'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Play, Heart, ArrowRight } from 'lucide-react';

interface HeroCarouselProps {
  churchName: string;
  tagline: string;
}

const heroImages = [
  { src: '/images/hero/image.png', alt: 'Worship leader speaking during a church service' },
  { src: '/images/hero/image copy 8.png', alt: 'Youth church congregation gathered for worship' },
  { src: '/images/hero/image copy 17.png', alt: 'Youth minister speaking at the podium during a church service' },
  { src: '/images/hero/image copy 5.png', alt: 'Church congregation gathered for worship' },
  { src: '/images/hero/image copy 10.png', alt: 'Bishop speaking during a church service' },
  { src: '/images/hero/image copy 11.png', alt: 'Church minister preaching from the pulpit' },
];

const heroPhrases = [
  'Building Lives,',
  'Raising Disciples,',
  "Advancing God's Kingdom.",
];

const LINE1 = 'Welcome to The Youth Church';
const LINE2_PREFIX = 'of the ';
const LINE2_SCRIPT = 'Epiphany';

const SLIDE_DURATION = 8000;
const FADE_DURATION = 2500;
const ZOOM_DURATION = SLIDE_DURATION + FADE_DURATION;

export function HeroCarousel({ churchName, tagline }: HeroCarouselProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [typedLine1, setTypedLine1] = useState('');
  const [typedPrefix, setTypedPrefix] = useState('');
  const [typedScript, setTypedScript] = useState('');
  const [showCtas, setShowCtas] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const typingRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      setActiveImage((prev) => (prev + 1) % heroImages.length);
    }, SLIDE_DURATION);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const goToImage = (index: number) => {
    if (index === activeImage) return;
    setActiveImage(index);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      setActiveImage((prev) => (prev + 1) % heroImages.length);
    }, SLIDE_DURATION);
  };

  useEffect(() => {
    if (!mounted) return;

    let charIndex = 0;
    let phase: 'line1' | 'prefix' | 'script' = 'line1';

    const typeNext = () => {
      if (phase === 'line1') {
        if (charIndex <= LINE1.length) {
          setTypedLine1(LINE1.slice(0, charIndex));
          charIndex++;
          typingRef.current.push(window.setTimeout(typeNext, 32));
        } else {
          phase = 'prefix';
          charIndex = 0;
          typingRef.current.push(window.setTimeout(typeNext, 400));
        }
      } else if (phase === 'prefix') {
        if (charIndex <= LINE2_PREFIX.length) {
          setTypedPrefix(LINE2_PREFIX.slice(0, charIndex));
          charIndex++;
          typingRef.current.push(window.setTimeout(typeNext, 32));
        } else {
          phase = 'script';
          charIndex = 0;
          typingRef.current.push(window.setTimeout(typeNext, 50));
        }
      } else {
        if (charIndex <= LINE2_SCRIPT.length) {
          setTypedScript(LINE2_SCRIPT.slice(0, charIndex));
          charIndex++;
          typingRef.current.push(window.setTimeout(typeNext, 38));
        } else {
          typingRef.current.push(window.setTimeout(() => setShowCtas(true), 1400));
          typingRef.current.push(window.setTimeout(() => setShowSecondary(true), 1900));
        }
      }
    };

    typingRef.current.push(window.setTimeout(typeNext, 600));

    return () => {
      typingRef.current.forEach((id) => window.clearTimeout(id));
      typingRef.current = [];
    };
  }, [mounted]);

  return (
    <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
      {/* Background images — all mounted, CSS transitions for crossfade + Ken Burns */}
      <div className="absolute inset-0 overflow-hidden bg-[#07111f]">
        {heroImages.map((image, index) => {
          const isActive = activeImage === index;
          return (
            <Image
              key={image.src}
              src={image.src}
              alt=""
              fill
              sizes="100vw"
              priority={index === 0}
              className="absolute inset-0 h-full w-full object-cover object-center will-change-[opacity,transform]"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1.08) translate3d(-1%, -0.5%, 0)' : 'scale(1) translate3d(0, 0, 0)',
                transition: `opacity ${FADE_DURATION}ms ease-in-out, transform ${ZOOM_DURATION}ms ease-out`,
                zIndex: isActive ? 2 : 1,
                filter: 'brightness(0.68) contrast(1.12) saturate(0.92)',
              }}
            />
          );
        })}
      </div>

      {/* Overlay system — image dimmed via CSS filter; overlays provide brand-tinted text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#031A3A]/72 via-[#031A3A]/28 to-[#031A3A]/8" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#031A3A]/45 via-transparent to-[#031A3A]/22" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
        <div className="max-w-2xl lg:max-w-2xl">
          {/* Tagline overline */}
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#F4B942] sm:text-xs">
            {heroPhrases.map((phrase, i) => (
              <span
                key={i}
                className="hero-phrase"
                style={{ animationDelay: `${0.2 + i * 0.4}s` }}
              >
                {phrase}
                {i < heroPhrases.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>

          {/* Main title */}
          <h1 className="mt-5 sm:mt-6 lg:mt-7">
            <span className="hero-typewriter block font-sans text-[2.6rem] font-black leading-[1.08] tracking-[-0.03em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-5xl lg:text-6xl xl:text-7xl">
              {typedLine1}
            </span>

            <span className="block leading-[1.15]">
              <span className="hero-typewriter font-sans text-[2.6rem] font-black tracking-[-0.03em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-5xl lg:text-6xl xl:text-7xl">
                {typedPrefix}
              </span>
              {typedScript && (
                <span
                  className="font-script text-[3.2rem] font-bold text-[#F4B942] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-6xl lg:text-7xl xl:text-8xl"
                  style={{ lineHeight: 1 }}
                >
                  {typedScript}
                </span>
              )}
            </span>
          </h1>

          {/* Primary CTAs */}
          <div
            className={`mt-8 flex flex-col gap-3 transition-all duration-700 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 ${
              showCtas ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <Link
              href="/contact"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F4B942] px-7 text-sm font-semibold tracking-wide text-[#0B1F4B] transition-all hover:bg-[#F4B942]/90 hover:shadow-lg hover:shadow-[#F4B942]/30 hover:-translate-y-0.5"
            >
              <MapPin className="h-4 w-4" strokeWidth={2} />
              Plan Your Visit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
            <Link
              href="/sermons"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#F4B942]/70 bg-black/30 px-7 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition-all hover:border-[#F4B942] hover:text-[#F4B942] hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4 fill-current" strokeWidth={0} />
              Watch Latest Service
            </Link>
          </div>

          {/* Secondary actions */}
          <div
            className={`mt-6 flex items-center gap-5 transition-all duration-700 sm:mt-7 ${
              showSecondary ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <Link
              href="/give"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] transition-colors hover:text-[#F4B942]"
            >
              <Heart className="h-3.5 w-3.5" strokeWidth={2} />
              Give
            </Link>
            <span className="h-4 w-px bg-white/20" />
            <Link
              href="/prayer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] transition-colors hover:text-[#F4B942]"
            >
              <Heart className="h-3.5 w-3.5" strokeWidth={2} />
              Prayer Request
            </Link>
          </div>
        </div>
      </div>

      {/* Image indicators */}
      <div className="absolute bottom-8 right-4 z-10 flex gap-2 sm:bottom-10 sm:right-8">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToImage(index)}
            aria-label={`Show image ${index + 1}`}
            className={`h-1 rounded-full transition-all duration-500 ${
              activeImage === index ? 'w-8 bg-[#F4B942]' : 'w-4 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
