'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DATE_RANGE_OPTIONS, resolveDateRange, formatDateLabel, type DatePreset, type DateRange } from '@/lib/reports/date-range';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: Props) {
  const [preset, setPreset] = useState<DatePreset>(value.preset);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);
  const [open, setOpen] = useState(false);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const range = resolveDateRange(newPreset);
      onChange(range);
      setOpen(false);
    }
  };

  const handleCustomApply = () => {
    const range = resolveDateRange('custom', customStart, customEnd);
    onChange(range);
    setOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateLabel(value)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-[150px]"
                />
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <Button size="sm" onClick={handleCustomApply} className="w-full">
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {preset !== 'custom' && (
        <span className="text-sm text-muted-foreground">{formatDateLabel(value)}</span>
      )}
    </div>
  );
}
