export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'last_month' | 'last_year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
  preset: DatePreset;
}

export interface DateRangeOption {
  value: DatePreset;
  label: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function resolveDateRange(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { start: toISODate(today), end: toISODate(today), preset };

    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: toISODate(y), end: toISODate(y), preset };
    }

    case 'this_week': {
      const day = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(sunday.getDate() - day);
      return { start: toISODate(sunday), end: toISODate(today), preset };
    }

    case 'this_month':
      return { start: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), end: toISODate(today), preset };

    case 'this_year':
      return { start: toISODate(new Date(today.getFullYear(), 0, 1)), end: toISODate(today), preset };

    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toISODate(start), end: toISODate(end), preset };
    }

    case 'last_year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { start: toISODate(start), end: toISODate(end), preset };
    }

    case 'custom':
      return {
        start: customStart ?? toISODate(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: customEnd ?? toISODate(today),
        preset,
      };
  }
}

export function getPreviousRange(range: DateRange): DateRange {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return { start: toISODate(prevStart), end: toISODate(prevEnd), preset: range.preset };
}

export function formatDateLabel(range: DateRange): string {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (range.start === range.end) return fmt(start);
  return `${fmt(start)} → ${fmt(end)}`;
}

export function computePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
