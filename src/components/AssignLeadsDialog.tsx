import { useState } from 'react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
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
import { UserCheck } from 'lucide-react';

interface AssignLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onAssigned: () => void;
}

export function AssignLeadsDialog({ open, onOpenChange, leadIds, onAssigned }: AssignLeadsDialogProps) {
  const { members, assignLeads } = useTeamMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const handleAssign = () => {
    if (!selectedMemberId || leadIds.length === 0) return;
    assignLeads.mutate(
      { leadIds, userId: selectedMemberId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedMemberId('');
          onAssigned();
        },
      }
    );
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Assign {leadIds.length} Lead{leadIds.length !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select team member
            </label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Choose a member..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email || member.id.slice(0, 8)}
                    {member.role === 'admin' && ' (admin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMember && (
            <p className="text-sm text-muted-foreground">
              {leadIds.length} lead{leadIds.length !== 1 ? 's' : ''} will be assigned to{' '}
              <span className="text-foreground font-medium">
                {selectedMember.full_name || selectedMember.email}
              </span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedMemberId || assignLeads.isPending}
          >
            {assignLeads.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
