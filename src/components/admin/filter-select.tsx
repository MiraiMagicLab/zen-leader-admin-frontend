import type { FilterChipOption } from '@/components/admin/filter-chip-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterChipOption[];
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

/**
 * Compact Select filter for admin list toolbars (status, role, type, etc.).
 * Prefer this over segmented chips for management dashboards.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel = 'Filter',
  placeholder = 'Select…',
  className,
  triggerClassName,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn('h-9 w-[10.5rem] rounded-md border-border/70', triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
