import { useMemo, useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  extractTimePart,
  formatLocalDateTimeDisplay,
  mergeDateAndTime,
  parseLocalDateTime,
  toLocalDateTimeValue,
} from '@/lib/datetime-local';

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
};

export function DateTimePicker({
  value,
  onChange,
  disabled,
  id,
  placeholder = 'Select date and time',
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);
  const timeValue = useMemo(() => extractTimePart(value), [value]);
  const displayLabel = formatLocalDateTimeDisplay(value, placeholder);

  const pickDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(mergeDateAndTime(date, timeValue));
  };

  const pickTime = (time: string) => {
    const base = selectedDate ?? new Date();
    onChange(mergeDateAndTime(base, time));
  };

  const pickNow = () => {
    onChange(toLocalDateTimeValue(new Date()));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start px-3 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={pickDate}
        />
        <div className="space-y-2 border-t p-3">
          <Label className="text-muted-foreground text-xs">Hour</Label>
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => pickTime(e.target.value)}
            className="h-9 bg-background"
          />
          <div className="flex justify-between gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={pickNow}>
              Now
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
