'use client';

import { useState } from 'react';
import { Globe, Church, Mail, Check, type LucideIcon } from 'lucide-react';

type GiveMethod = {
  id: string;
  label: string;
  summary: string;
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
};

const GIVE_METHODS: GiveMethod[] = [
  {
    id: 'online',
    label: 'Online',
    summary: 'Secure one-time or recurring gifts',
    icon: Globe,
    title: 'Give online',
    description:
      'Give securely through our online giving portal. Choose a one-time gift or set up recurring giving that fits your season.',
    points: ['One-time or recurring gifts', 'Secure online portal', 'Give from anywhere, at any time'],
  },
  {
    id: 'in-person',
    label: 'In Person',
    summary: 'Bring your gift to any Sunday service',
    icon: Church,
    title: 'Give in person',
    description:
      'Bring your gift to any of our Sunday services. Cash and check are both welcome during the offering.',
    points: ['Cash or check accepted', 'Available at every Sunday service', 'Our team is happy to help'],
  },
  {
    id: 'mail',
    label: 'Mail',
    summary: 'Send a check to our church office',
    icon: Mail,
    title: 'Give by mail',
    description:
      'Send a check to our church office. Our team can share the mailing address and answer any questions about your gift.',
    points: ['Checks sent to the church office', 'Contact us for the mailing address', 'Receipts available on request'],
  },
];

export function GiveOptions() {
  const [activeId, setActiveId] = useState(GIVE_METHODS[0].id);
  const active = GIVE_METHODS.find((method) => method.id === activeId) ?? GIVE_METHODS[0];
  const ActiveIcon = active.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:items-stretch">
      <div role="tablist" aria-label="Ways to give" className="flex flex-col gap-3">
        {GIVE_METHODS.map((method) => {
          const selected = method.id === activeId;
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              type="button"
              role="tab"
              id={`give-tab-${method.id}`}
              aria-selected={selected}
              aria-controls="give-panel"
              onClick={() => setActiveId(method.id)}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4B942] ${
                selected
                  ? 'border-[#071B3D] bg-[#071B3D] text-white shadow-[0_18px_40px_rgba(7,27,61,0.18)]'
                  : 'border-[#DCE3EC] bg-white text-[#071B3D] hover:-translate-y-0.5 hover:border-[#071B3D]/30 hover:shadow-[0_12px_30px_rgba(7,27,61,0.08)]'
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  selected ? 'bg-[#F4B942] text-[#071B3D]' : 'bg-[#F5F7FA] text-[#071B3D] group-hover:bg-[#F4B942]/20'
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-semibold">{method.label}</span>
                <span className={`mt-1 block text-sm ${selected ? 'text-white/80' : 'text-[#667487]'}`}>
                  {method.summary}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="give-panel"
        role="tabpanel"
        aria-labelledby={`give-tab-${active.id}`}
        key={active.id}
        style={{ animation: 'hero-fade-up 0.5s ease-out both' }}
        className="flex flex-col rounded-[28px] border border-[#DCE3EC] bg-white p-8 shadow-[0_18px_50px_rgba(7,27,61,0.08)] sm:p-10"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#071B3D] text-[#F4B942]">
          <ActiveIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-6 font-serif text-2xl font-semibold text-[#071B3D]">{active.title}</h3>
        <p className="mt-3 text-base leading-7 text-[#667487]">{active.description}</p>
        <ul className="mt-6 space-y-3">
          {active.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm font-medium text-[#071B3D]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F4B942]/25">
                <Check className="h-3.5 w-3.5 text-[#071B3D]" strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
