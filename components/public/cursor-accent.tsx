'use client';

import { useEffect, useRef } from 'react';

export function CursorAccent() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const handlePointerMove = (event: PointerEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };
      const cursor = cursorRef.current;
      if (cursor) cursor.style.opacity = '1';
    };

    const animate = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      current.x += (target.x - current.x) * 0.14;
      current.y += (target.y - current.y) * 0.14;
      const cursor = cursorRef.current;
      if (cursor) cursor.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      frameRef.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div ref={cursorRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-5 w-5 opacity-0 md:block">
      <span className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(3,26,58,0.9),0_0_16px_rgba(244,185,66,0.75)] mix-blend-difference" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F4B942] shadow-[0_0_0_2px_#031A3A]" />
    </div>
  );
}
