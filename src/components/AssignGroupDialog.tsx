import { useState } from 'react';
import { useRestaurantGroups } from '@/hooks/useRestaurantGroups';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface AssignGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onAssigned: () => void;
}

export function AssignGroupDialog({ open, onOpenChange, leadIds, onAssigned }: AssignGroupDialogProps) {
  const { groups, assignLeadsToGroup } = useRestaurantGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const handleAssign = () => {
    if (!selectedGroupId || leadIds.length === 0) return;
    const groupId = selectedGroupId === '__none__' ? null : selectedGroupId;
    assignLeadsToGroup.mutate(
      { leadIds, groupId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedGroupId('');
          onAssigned();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Assign {leadIds.length} Lead{leadIds.length !== 1 ? 's' : ''} to Group
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Choose a group..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="__none__">No Group (remove)</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedGroupId || assignLeadsToGroup.isPending}
          >
            {assignLeadsToGroup.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
