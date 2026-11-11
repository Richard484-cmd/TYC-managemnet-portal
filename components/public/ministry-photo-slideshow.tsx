'use client';

import { useEffect, useState } from 'react';

const ROTATE_INTERVAL_MS = 4000;

interface MinistryPhotoSlideshowProps {
  photos: string[];
  alt: string;
}

export function MinistryPhotoSlideshow({ photos, alt }: MinistryPhotoSlideshowProps) {
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const activeIndex = index % count;

  return (
    <>
      {photos.map((src, photoIndex) => {
        const active = photoIndex === activeIndex;
        return (
          <img
            key={src}
            src={src}
            alt={active ? alt : ''}
            aria-hidden={!active}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-1000 ease-out group-hover:scale-105 ${active ? 'opacity-100' : 'opacity-0'}`}
          />
        );
      })}
      {count > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {photos.map((src, photoIndex) => (
            <span
              key={src}
              className={`h-1.5 rounded-full bg-white transition-all duration-500 ${photoIndex === activeIndex ? 'w-5 opacity-100' : 'w-1.5 opacity-50'}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
