import { useState } from 'react';
import { format } from 'date-fns';
import { Lead } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Loader2 } from 'lucide-react';

interface LogCallDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogCallDialog({ lead, open, onOpenChange }: LogCallDialogProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const stamp = format(new Date(), 'MMM d, yyyy h:mm a');
      const text = note.trim();
      const entry = `[${stamp}] 📞 Call${text ? ': ' + text : ''}`;
      const updatedNotes = entry + (lead.notes ? '\n\n' + lead.notes : '');

      const updates: Record<string, unknown> = {
        notes: updatedNotes,
        last_outreach_date: new Date().toISOString().split('T')[0],
      };
      if (lead.status === 'new') updates.status = 'contacted';

      const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Call logged');
      setNote('');
      onOpenChange(false);
    } catch (e) {
      toast.error('Failed to log call: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setNote('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Log Call{lead ? ` — ${lead.business_name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Add notes from your call. This will be timestamped and prepended to the lead's notes.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was discussed? (e.g. Left voicemail, spoke with owner, follow up next week...)"
          rows={6}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave();
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            Save Call Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
