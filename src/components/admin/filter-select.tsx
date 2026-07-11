import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterSelectOption[];
  /** Visible field label shown before the Select trigger. */
  label: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

/**
 * Toolbar filter using shadcn Select (dropdown), not segmented tabs/chips.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  placeholder = 'Select…',
  className,
  triggerClassName,
}: FilterSelectProps) {
  const selectId = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Label htmlFor={selectId} className="text-muted-foreground shrink-0 text-xs font-medium">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={selectId}
          aria-label={ariaLabel ?? label}
          className={cn('h-9 min-w-[9.5rem] rounded-md', triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
