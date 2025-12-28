import { Platform, LeadStatus } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: LeadStatus | 'all';
  onStatusFilterChange: (value: LeadStatus | 'all') => void;
  platformFilter: Platform | 'all';
  onPlatformFilterChange: (value: Platform | 'all') => void;
}

const statusOptions: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'onboarded', label: 'Onboarded' },
];

const platformOptions: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'eros', label: 'Eros' },
  { value: 'noms', label: 'Noms' },
];

export function LeadFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  platformFilter,
  onPlatformFilterChange,
}: LeadFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or Instagram..."
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
      
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => onStatusFilterChange(option.value)}
              className={cn(
                'text-xs',
                statusFilter === option.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-border self-center mx-2" />
        
        <div className="flex flex-wrap gap-1">
          {platformOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => onPlatformFilterChange(option.value)}
              className={cn(
                'text-xs',
                platformFilter === option.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
