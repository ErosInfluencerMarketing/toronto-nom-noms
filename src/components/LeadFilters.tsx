import { Platform, LeadStatus } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, RotateCcw, ChevronDown, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type ContactFilter = 'both' | 'email_only' | 'instagram_only' | 'neither';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilters: LeadStatus[];
  onStatusFiltersChange: (value: LeadStatus[]) => void;
  platformFilters: Platform[];
  onPlatformFiltersChange: (value: Platform[]) => void;
  categoryFilters: string[];
  onCategoryFiltersChange: (value: string[]) => void;
  categories: string[];
  cityFilters: string[];
  onCityFiltersChange: (value: string[]) => void;
  cities: string[];
  contactFilters: ContactFilter[];
  onContactFiltersChange: (value: ContactFilter[]) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  onReset: () => void;
}

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'onboarded', label: 'Onboarded' },
];

const contactOptions: { value: ContactFilter; label: string }[] = [
  { value: 'both', label: 'Email & Instagram' },
  { value: 'email_only', label: 'Email Only' },
  { value: 'instagram_only', label: 'Instagram Only' },
  { value: 'neither', label: 'No Contact Info' },
];

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'eros', label: 'Eros' },
  { value: 'noms', label: 'Noms' },
];

function toggleValue<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

function MultiSelectPopover<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (val: T[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'text-xs gap-1 h-8 border-border bg-secondary',
            selected.length > 0 && 'border-primary/50 bg-primary/10 text-primary'
          )}
        >
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] bg-primary/20 text-primary">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 bg-popover border-border z-50" align="start">
        <div className="space-y-1">
          {options.map((opt) => {
            const toggle = () => onChange(toggleValue(selected, opt.value));
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={selected.includes(opt.value)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent"
                onClick={(e) => {
                  // Prevent double-toggle: only handle if click wasn't on the checkbox button
                  if (!(e.target as HTMLElement).closest('button[role="checkbox"]')) {
                    toggle();
                  }
                }}
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={toggle}
                />
                <span className="text-foreground">{opt.label}</span>
              </div>
            );
          })}
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground mt-1"
              onClick={() => onChange([])}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LeadFilters({
  search,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  platformFilters,
  onPlatformFiltersChange,
  categoryFilters,
  onCategoryFiltersChange,
  categories,
  cityFilters,
  onCityFiltersChange,
  cities,
  contactFilters,
  onContactFiltersChange,
  dateRange,
  onDateRangeChange,
  onReset,
}: LeadFiltersProps) {
  const hasActiveFilters =
    search !== '' ||
    statusFilters.length > 0 ||
    platformFilters.length > 0 ||
    categoryFilters.length > 0 ||
    cityFilters.length > 0 ||
    contactFilters.length > 0 ||
    dateRange.from !== undefined ||
    dateRange.to !== undefined;

  const categoryOptions = categories.map((c) => ({ value: c, label: c }));
  const cityOptions = cities.map((c) => ({ value: c, label: c }));

  const hasDateFilter = dateRange.from || dateRange.to;
  const dateLabel = hasDateFilter
    ? dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`
      : dateRange.from
        ? `From ${format(dateRange.from, 'MMM d')}`
        : `Until ${format(dateRange.to!, 'MMM d')}`
    : 'Date Added';

  return (
    <div className="space-y-3 flex-1 min-w-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or Instagram..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelectPopover
          label="Status"
          options={statusOptions}
          selected={statusFilters}
          onChange={onStatusFiltersChange}
        />

        <MultiSelectPopover
          label="Platform"
          options={platformOptions}
          selected={platformFilters}
          onChange={onPlatformFiltersChange}
        />

        <MultiSelectPopover
          label="Contact Info"
          options={contactOptions}
          selected={contactFilters}
          onChange={onContactFiltersChange}
        />

        {categories.length > 0 && (
          <MultiSelectPopover
            label="Category"
            options={categoryOptions}
            selected={categoryFilters}
            onChange={onCategoryFiltersChange}
          />
        )}

        {cities.length > 0 && (
          <MultiSelectPopover
            label="City"
            options={cityOptions}
            selected={cityFilters}
            onChange={onCityFiltersChange}
          />
        )}

        {hasActiveFilters && (
          <>
            <div className="w-px h-6 bg-border self-center mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
