import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ViewMode = 'card' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-secondary rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-3 ${viewMode === 'card' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
        onClick={() => onViewModeChange('card')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-3 ${viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
        onClick={() => onViewModeChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
