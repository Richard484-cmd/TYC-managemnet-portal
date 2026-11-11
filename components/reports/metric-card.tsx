import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  changePercent?: number | null;
  changeLabel?: string;
  description?: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'navy' | 'gold' | 'slate';
  loading?: boolean;
  empty?: boolean;
  href?: string;
}

const toneClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  navy: 'bg-slate-100 text-[#173b63]',
  gold: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  changePercent,
  changeLabel,
  description,
  tone = 'slate',
  loading,
  empty,
}: MetricCardProps) {
  return (
    <Card className="border-border/70 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', toneClasses[tone])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-4 h-8 w-24 animate-pulse rounded bg-muted" />
        ) : empty ? (
          <p className="mt-4 text-sm text-muted-foreground">No data available</p>
        ) : (
          <p className="mt-4 text-2xl font-bold tracking-tight text-[#0b2340]">{value}</p>
        )}

        {changePercent !== undefined && changePercent !== null && !loading && !empty && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className={cn('font-semibold', changePercent >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
            </span>{' '}
            {changeLabel ?? 'from previous period'}
          </p>
        )}

        {description && !loading && !empty && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
