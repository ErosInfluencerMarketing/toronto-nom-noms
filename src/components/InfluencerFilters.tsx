import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export type InfluencerContactFilter = 'has_email' | 'no_email' | 'has_website' | 'no_website';

export interface InfluencerDateRange {
  from?: Date;
  to?: Date;
}

export interface InfluencerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;
  nicheFilters: string[];
  onNicheFiltersChange: (value: string[]) => void;
  niches: string[];
  cityFilters: string[];
  onCityFiltersChange: (value: string[]) => void;
  cities: string[];
  contentTypeFilters: string[];
  onContentTypeFiltersChange: (value: string[]) => void;
  contactFilters: InfluencerContactFilter[];
  onContactFiltersChange: (value: InfluencerContactFilter[]) => void;
  dateRange: InfluencerDateRange;
  onDateRangeChange: (value: InfluencerDateRange) => void;
  onReset: () => void;
}

const statusOptions = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'partnered', label: 'Partnered' },
  { value: 'declined', label: 'Declined' },
];

const contentTypeOptions = [
  { value: 'food_reviews', label: '🍽️ Reviews' },
  { value: 'recipes', label: '👨‍🍳 Recipes' },
  { value: 'restaurant_tours', label: '🗺️ Tours' },
  { value: 'food_photography', label: '📸 Photography' },
  { value: 'mukbang', label: '🍜 Mukbang' },
  { value: 'mixed', label: '🎨 Mixed' },
];

const contactOptions: { value: InfluencerContactFilter; label: string }[] = [
  { value: 'has_email', label: '✉️ Has Email' },
  { value: 'no_email', label: '❌ No Email' },
  { value: 'has_website', label: '🌐 Has Website' },
  { value: 'no_website', label: '❌ No Website' },
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

export function InfluencerFilters({
  search,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  nicheFilters,
  onNicheFiltersChange,
  niches,
  cityFilters,
  onCityFiltersChange,
  cities,
  contentTypeFilters,
  onContentTypeFiltersChange,
  contactFilters,
  onContactFiltersChange,
  dateRange,
  onDateRangeChange,
  onReset,
}: InfluencerFiltersProps) {
  const hasActiveFilters =
    search !== '' ||
    statusFilters.length > 0 ||
    nicheFilters.length > 0 ||
    cityFilters.length > 0 ||
    contentTypeFilters.length > 0 ||
    contactFilters.length > 0 ||
    dateRange.from !== undefined ||
    dateRange.to !== undefined;

  const nicheOptions = niches.map((n) => ({ value: n, label: n }));
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
          placeholder="Search by username, name, niche, or city..."
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
          label="Content Type"
          options={contentTypeOptions}
          selected={contentTypeFilters}
          onChange={onContentTypeFiltersChange}
        />

        <MultiSelectPopover
          label="Contact Info"
          options={contactOptions}
          selected={contactFilters}
          onChange={onContactFiltersChange}
        />

        {niches.length > 0 && (
          <MultiSelectPopover
            label="Niche"
            options={nicheOptions}
            selected={nicheFilters}
            onChange={onNicheFiltersChange}
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

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs gap-1 h-8 border-border bg-secondary',
                hasDateFilter && 'border-primary/50 bg-primary/10 text-primary'
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {dateLabel}
              <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
            <Calendar
              mode="range"
              selected={dateRange.from || dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
            {hasDateFilter && (
              <div className="px-3 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => onDateRangeChange({})}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

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
