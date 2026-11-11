import { cn } from '@/lib/utils';

interface ChurchLogoProps {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
}

const logoSrc = '/images/logo/image.png';

export function ChurchLogo({ className, compact = false, showTagline = false }: ChurchLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="The Youth Church">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/15">
        <img src={logoSrc} alt="The Youth Church emblem" width={36} height={36} className="h-full w-full object-contain" fetchPriority="high" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="max-w-[180px] text-[0.68rem] font-semibold leading-tight tracking-tight text-white/80 sm:max-w-none sm:whitespace-nowrap sm:text-sm sm:leading-normal">
            The Youth Church of the Epiphany (TYC)
          </span>
          {showTagline && (
            <span className="max-w-xs text-xs font-normal leading-5 text-white/60">
              Building lives, raising disciples, advancing God&apos;s kingdom.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
