'use client';

import { useEffect, useState } from 'react';

interface BackgroundSlideshowProps {
  images: { src: string; alt: string }[];
  intervalMs?: number;
  splitRight?: boolean;
}

const FADE_DURATION = 2000;

export function BackgroundSlideshow({ images, intervalMs = 8000, splitRight = false }: BackgroundSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden bg-[#07111f]">
      {images.map((image, index) => {
        const isActive = index === activeIndex;
        return (
          <div
            key={image.src}
            className="absolute inset-0"
            style={{
              opacity: isActive ? 1 : 0,
              transition: `opacity ${FADE_DURATION}ms ease-in-out`,
            }}
          >
            <img
              src={image.src}
              alt=""
              aria-hidden="true"
              loading={index === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full scale-110 object-cover"
              style={{ filter: 'blur(28px) brightness(0.5) saturate(0.9)' }}
            />
            <img
              src={image.src}
              alt={image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              className={splitRight
                ? 'absolute inset-y-0 right-0 h-full w-full object-contain object-center will-change-transform lg:w-1/2'
                : 'absolute inset-0 h-full w-full object-contain object-center lg:object-right will-change-transform'}
              style={{
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                transition: `transform ${FADE_DURATION}ms ease-out`,
                filter: 'brightness(0.92) contrast(1.05) saturate(0.95)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
