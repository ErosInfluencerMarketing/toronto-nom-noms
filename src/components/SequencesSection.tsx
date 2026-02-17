import { useState } from 'react';
import { useSequences } from '@/hooks/useSequences';
import { useTemplates } from '@/hooks/useTemplates';
import { Lead } from '@/types/lead';
import { SequenceFormData } from '@/types/sequence';
import { SequenceStepForm } from '@/components/SequenceStepForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Repeat, Pause, Play, CheckCircle, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface SequencesSectionProps {
  leads: Lead[];
}

export function SequencesSection({ leads }: SequencesSectionProps) {
  const { sequences, isLoading, createSequence, updateSequenceStatus, deleteSequence } = useSequences();
  const { templates } = useTemplates();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<SequenceFormData>({
    lead_id: '',
    steps: [{ template_id: '', delay_days: 0 }],
  });

  const emailTemplates = templates.filter((t) => t.channel === 'email');
  const leadsWithEmail = leads.filter((l) => !!l.email);

  const handleCreate = () => {
    if (!formData.lead_id || formData.steps.some((s) => !s.template_id)) return;
    createSequence.mutate(formData, {
      onSuccess: () => {
        setIsFormOpen(false);
        setFormData({ lead_id: '', steps: [{ template_id: '', delay_days: 0 }] });
      },
    });
  };

  const handleStepChange = (index: number, data: { template_id: string; delay_days: number }) => {
    const newSteps = [...formData.steps];
    newSteps[index] = data;
    setFormData({ ...formData, steps: newSteps });
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { template_id: '', delay_days: 2 }],
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.business_name || 'Unknown';
  const getTemplateName = (templateId: string) => templates.find((t) => t.id === templateId)?.name || 'Unknown';

  const statusColor: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/30',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    completed: 'bg-muted text-muted-foreground border-border',
    replied: 'bg-primary/10 text-primary border-primary/30',
  };

  const statusIcon: Record<string, React.ReactNode> = {
    active: <Play className="h-3 w-3" />,
    paused: <Pause className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    replied: <MessageCircle className="h-3 w-3" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Email Sequences</h2>
          <span className="text-sm text-muted-foreground">({sequences.length})</span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsFormOpen(true)}
          disabled={emailTemplates.length === 0 || leadsWithEmail.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {emailTemplates.length === 0 && (
        <p className="text-sm text-muted-foreground">Create an email template first to start a sequence.</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading sequences...</div>
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center border border-dashed border-border rounded-lg">
          <Repeat className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No active sequences</p>
          <p className="text-xs text-muted-foreground">Create a sequence to auto-send follow-up emails</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sequences.map((seq) => (
            <Card key={seq.id} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{getLeadName(seq.lead_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {seq.steps && seq.steps.length > 0
                        ? `${seq.steps.length} step${seq.steps.length !== 1 ? 's' : ''}`
                        : `Template: ${getTemplateName(seq.template_id)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusColor[seq.status]}>
                    {statusIcon[seq.status]}
                    <span className="ml-1 capitalize">{seq.status}</span>
                  </Badge>
                </div>

                {/* Show steps detail */}
                {seq.steps && seq.steps.length > 0 && (
                  <div className="space-y-1">
                    {seq.steps.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className={`text-xs flex items-center gap-2 ${
                          idx < seq.current_step
                            ? 'text-muted-foreground line-through'
                            : idx === seq.current_step
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span className="w-4 text-right">{idx + 1}.</span>
                        <span>{getTemplateName(step.template_id)}</span>
                        <span className="text-muted-foreground">
                          ({step.delay_days}d {idx === 0 ? 'delay' : 'after prev'})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Step {seq.current_step}/{seq.steps?.length || seq.max_followups}</span>
                  {seq.next_send_at && seq.status === 'active' && (
                    <span>Next: {format(new Date(seq.next_send_at), 'MMM d, h:mm a')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {seq.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'paused' })}
                      >
                        <Pause className="h-3 w-3 mr-1" /> Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'replied' })}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" /> Mark Replied
                      </Button>
                    </>
                  )}
                  {seq.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSequenceStatus.mutate({ id: seq.id, status: 'active' })}
                    >
                      <Play className="h-3 w-3 mr-1" /> Resume
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteConfirmId(seq.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sequence Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Start Email Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leadsWithEmail.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.business_name} — {l.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
              {formData.steps.map((step, idx) => (
                <SequenceStepForm
                  key={idx}
                  step={step}
                  stepIndex={idx}
                  templates={emailTemplates}
                  onChange={handleStepChange}
                  onRemove={handleRemoveStep}
                  canRemove={formData.steps.length > 1}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!formData.lead_id || formData.steps.some((s) => !s.template_id) || createSequence.isPending}
              >
                {createSequence.isPending ? 'Starting...' : 'Start Sequence'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sequence? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteSequence.mutate(deleteConfirmId, {
                    onSuccess: () => setDeleteConfirmId(null),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
