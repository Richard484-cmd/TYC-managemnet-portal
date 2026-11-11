'use client';

import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const HISTORY = [
  <>On <strong>30th December 2020</strong>, His Lordship entrusted the new vision to <strong>Prince Kwani, now Pastor, and Erasmus Thomas, now Rev’d Erasmus Thomas Owunari</strong>. Following the charge, they embarked on fasting, prayer and planning in preparation for the establishment of the Church.</>,
  <>The official opening was scheduled for <strong>Sunday, 17th January 2021</strong>, following a musical concert and preparatory service on <strong>Saturday, 16th January 2021</strong>. The first leadership team was headed by Pastor Prince Kwani as Lead Pastor, with Rev’d Erasmus Thomas as Assistant Pastor.</>,
  <>The first service was attended by His Lordship Rt. Rev. Dr. Enoch Atuboyedia, clergy, dignitaries and <strong>64 other founding members</strong>. On <strong>3rd April 2021</strong>, the Church held its first baptism, with about five members entering into the fellowship of Christ.</>,
  <>On <strong>23rd May 2021</strong>, Pentecost Day, the Church was formally christened <strong>The Youth Church of the Epiphany</strong>. The Church also held its first confirmation service, during which approximately <strong>32 persons were confirmed</strong>.</>,
  <>In <strong>October 2021</strong>, the first leadership transition took place. Rev’d Erasmus Thomas became Lead Pastor and Pastor Precious Tamunokonbia was appointed Assistant Pastor. Under this leadership, the Church experienced significant spiritual, administrative and developmental growth.</>,
  <>TYC has continued to impact young people and the wider Okrika community through <strong>JIST Service, Prayer Tornado, Worship Service, Praise Service, Cultural Day and Drama Night</strong>, as well as pair-to-pair evangelism and Words on the Streets.</>,
  <>On <strong>10th April 2023</strong>, the Church celebrated its first <strong>Knight of St. Christopher</strong>, Sir Uduak Hanson, whose service and commitment were highlighted as examples of humility and dedication.</>,
  <>On <strong>5th July 2025</strong>, Lead Pastor <strong>Erasmus Thomas</strong> was ordained into the ordained ministry of the Holy Order of the Church by His Lordship Rt. Rev. Dr. Enoch Atuboyedia.</>,
  <>From its humble beginnings in 2020 and official opening in 2021, <strong>The Youth Church of the Epiphany has grown into a vibrant centre for worship, evangelism, youth development, fellowship and spiritual transformation</strong>.</>,
];

const COLLAPSE_MS = 500;

export function AboutHistory() {
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    const button = buttonRef.current;
    if (!button) {
      setExpanded(false);
      return;
    }
    const anchorTop = button.getBoundingClientRect().top;
    const start = performance.now();
    const keepButtonInPlace = (now: number) => {
      const drift = button.getBoundingClientRect().top - anchorTop;
      if (drift !== 0) window.scrollBy(0, drift);
      if (now - start < COLLAPSE_MS + 40) requestAnimationFrame(keepButtonInPlace);
    };
    setExpanded(false);
    requestAnimationFrame(keepButtonInPlace);
  };

  return (
    <div className="mt-8 [overflow-anchor:none]">
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-6 border-l-2 border-[#D8A52D] pl-6 text-[#334A62]">
            {HISTORY.map((paragraph, index) => <p key={index} className="text-base leading-8">{paragraph}</p>)}
          </div>
        </div>
      </div>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={expanded}
        onClick={handleToggle}
        className="group mt-8 inline-flex items-center gap-3 rounded-full bg-[#F4B942] px-6 py-3 text-sm font-semibold text-[#031A3A] shadow-[0_12px_30px_rgba(244,185,66,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#f7c75f]"
      >
        {expanded ? 'Show Less' : 'Learn More About Us'}
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
