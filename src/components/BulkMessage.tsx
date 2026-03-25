import { useState, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { useTemplates } from '@/hooks/useTemplates';
import { supabase } from '@/integrations/supabase/client';
import { AIEmailWriter } from '@/components/AIEmailWriter';
import { useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Mail, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BulkMessageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onComplete?: () => void;
}

function fillPlaceholders(message: string, lead: Lead): string {
  return message
    .replace(/\[Business Name\]/g, lead.business_name || '')
    .replace(/\[Owner Name\]/g, lead.owner_name || 'there')
    .replace(/\[Example Restaurant\]/g, 'La Bella Italia')
    .replace(/\[Instagram Handle\]/g, lead.instagram_handle ? `@${lead.instagram_handle}` : 'Instagram')
    .replace(/\[City\]/g, lead.city || '')
    .replace(/\[Category\]/g, lead.category || '');
}

export function BulkMessage({ open, onOpenChange, leads, onComplete }: BulkMessageProps) {
  const { templates } = useTemplates();
  const queryClient = useQueryClient();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Hey [Business Name]!');
  const [sender, setSender] = useState<string>('noms');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const leadsWithEmail = useMemo(() => leads.filter((l) => !!l.email), [leads]);
  const leadsWithoutEmail = leads.length - leadsWithEmail.length;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setMessageTemplate(template.message_body);
      if (template.subject) {
        setSubjectTemplate(template.subject);
      }
    }
  };

  const handleSend = async () => {
    if (!messageTemplate.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    if (leadsWithEmail.length === 0) {
      toast.error('No selected leads have an email address');
      return;
    }

    setIsSending(true);
    setProgress({ sent: 0, failed: 0, total: leadsWithEmail.length });

    let sent = 0;
    let failed = 0;

    for (const lead of leadsWithEmail) {
      try {
        const personalizedMessage = fillPlaceholders(messageTemplate, lead);
        const personalizedSubject = fillPlaceholders(subjectTemplate, lead);

        const { data, error } = await supabase.functions.invoke('send-message', {
          body: {
            channels: ['email'],
            lead: {
              id: lead.id,
              email: lead.email,
              business_name: lead.business_name,
              status: lead.status,
            },
            message: personalizedMessage.trim(),
            subject: personalizedSubject.trim(),
            sender,
          },
        });

        if (error) throw error;
        if (data?.results?.email?.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      setProgress({ sent, failed, total: leadsWithEmail.length });
    }

    queryClient.invalidateQueries({ queryKey: ['leads'] });

    if (sent > 0) {
      toast.success(`Sent ${sent} email${sent > 1 ? 's' : ''} successfully`);
    }
    if (failed > 0) {
      toast.error(`${failed} email${failed > 1 ? 's' : ''} failed to send`);
    }

    setIsSending(false);
    if (sent > 0) {
      onComplete?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Bulk Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Recipients summary */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {leadsWithEmail.length} lead{leadsWithEmail.length !== 1 ? 's' : ''} with email
              </Badge>
              {leadsWithoutEmail > 0 && (
                <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {leadsWithoutEmail} skipped (no email)
                </Badge>
              )}
            </div>
          </div>

          {/* Sender selection */}
          <div className="space-y-2">
            <Label>Send from</Label>
            <Select value={sender} onValueChange={setSender}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="noms">hello@nomspass.com</SelectItem>
                <SelectItem value="eros">hello@erosmarketing.io</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template selector */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No templates — create one first
                  </SelectItem>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.platform})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Email Subject</Label>
            <Input
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              className="bg-secondary border-border"
              placeholder="Email subject line... (supports [Business Name] etc.)"
            />
            <p className="text-xs text-muted-foreground">Placeholders will be personalized per lead</p>
          </div>

          {/* AI Writer */}
          <AIEmailWriter
            channel="email"
            templates={templates}
            onGenerated={(result) => {
              setMessageTemplate(result.message_body);
              if (result.subject) setSubjectTemplate(result.subject);
            }}
          />

          {/* Message body */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="bg-secondary border-border min-h-[150px] font-mono text-sm"
              placeholder="Type your message or select a template above..."
            />
            <p className="text-xs text-muted-foreground">
              Placeholders like [Business Name], [Owner Name] will be replaced per lead
            </p>
          </div>

          {/* Progress */}
          {isSending && (
            <div className="text-sm text-muted-foreground">
              Sending... {progress.sent + progress.failed}/{progress.total} 
              {progress.failed > 0 && ` (${progress.failed} failed)`}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || leadsWithEmail.length === 0}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending
                ? `Sending ${progress.sent + progress.failed}/${progress.total}...`
                : `Send to ${leadsWithEmail.length} Lead${leadsWithEmail.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
