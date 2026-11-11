'use client';

import { useRef, useEffect, useState } from 'react';

const START_TIME = 14;

type CoverVideoFrameProps = {
  src: string;
  poster: string;
  title: string;
};

export function CoverVideoFrame({ src, poster, title }: CoverVideoFrameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = 0;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('defaultmuted', '');

    const startAtFrame = () => {
      const target = video.duration > START_TIME ? START_TIME : 0;
      if (Math.abs(video.currentTime - target) > 0.1) {
        try {
          video.currentTime = target;
        } catch {
          // not seekable yet; the next readiness event retries
        }
      }
      video.play().catch(() => {});
    };

    const markVideoReady = () => {
      setVideoReady(true);
    };

    const keepMuted = () => {
      if (video.volume !== 0) video.volume = 0;
      if (!video.muted) video.muted = true;
    };

    const unlockPlayback = () => {
      video.play().catch(() => {});
    };

    const handleVideoError = () => {
      setVideoReady(false);
    };

    video.addEventListener('loadedmetadata', startAtFrame);
    video.addEventListener('loadeddata', markVideoReady);
    video.addEventListener('loadeddata', startAtFrame);
    video.addEventListener('canplay', markVideoReady);
    video.addEventListener('canplay', startAtFrame);
    video.addEventListener('error', handleVideoError);
    video.addEventListener('ended', startAtFrame);
    video.addEventListener('pause', startAtFrame);
    video.addEventListener('play', keepMuted);
    window.addEventListener('touchstart', unlockPlayback, { once: true, passive: true });
    window.addEventListener('click', unlockPlayback, { once: true });
    if (video.readyState >= 2) {
      markVideoReady();
      startAtFrame();
    }

    return () => {
      video.removeEventListener('loadedmetadata', startAtFrame);
      video.removeEventListener('loadeddata', markVideoReady);
      video.removeEventListener('loadeddata', startAtFrame);
      video.removeEventListener('canplay', markVideoReady);
      video.removeEventListener('canplay', startAtFrame);
      video.removeEventListener('error', handleVideoError);
      video.removeEventListener('ended', startAtFrame);
      video.removeEventListener('pause', startAtFrame);
      video.removeEventListener('play', keepMuted);
      window.removeEventListener('touchstart', unlockPlayback);
      window.removeEventListener('click', unlockPlayback);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#031A3A]">
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover object-[center_top] transition-opacity duration-500 ${videoReady ? 'opacity-0' : 'opacity-100'}`}
      />
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        title={title}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_top] transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        style={{ filter: 'contrast(1.05) saturate(1.05)' }}
      />
    </div>
  );
}
