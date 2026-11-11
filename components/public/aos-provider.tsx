'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css';

export function AosProvider() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('main > *:not([data-aos]), main section:not([data-aos])').forEach((element) => {
      element.dataset.aos = 'fade-up';
    });

    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: false,
      offset: 72,
      anchorPlacement: 'top-bottom',
      mirror: true,
    });
    AOS.refreshHard();
  }, [pathname]);

  return null;
}
