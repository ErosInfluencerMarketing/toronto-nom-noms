import { useState, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { Template } from '@/types/template';
import { useTemplates } from '@/hooks/useTemplates';
import { useAttachments, Attachment } from '@/hooks/useAttachments';
import { AttachmentManager } from '@/components/AttachmentManager';
import { supabase } from '@/integrations/supabase/client';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Send, Mail, Instagram, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickMessageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

function fillPlaceholders(message: string, lead: Lead): string {
  return message
    .replace(/\[Business Name\]/g, lead.business_name || '')
    .replace(/\[Owner Name\]/g, lead.owner_name || 'there')
    .replace(/\[Example Restaurant\]/g, 'La Bella Italia')
    .replace(/\[Instagram Handle\]/g, lead.instagram_handle ? `@${lead.instagram_handle}` : '')
    .replace(/\[City\]/g, lead.city || '')
    .replace(/\[Category\]/g, lead.category || '');
}

export function QuickMessage({ open, onOpenChange, lead }: QuickMessageProps) {
  const { templates } = useTemplates();
  const { attachments: allAttachments, uploading, uploadAttachment, getTemplateAttachments } = useAttachments();
  const queryClient = useQueryClient();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState(`Hey ${lead.business_name}!`);
  const [sendEmail, setSendEmail] = useState(!!lead.email);
  const [sendInstagram, setSendInstagram] = useState(!!lead.instagram_handle);
  const [sender, setSender] = useState<string>(lead.platform === 'eros' ? 'eros' : 'noms');
  const [isSending, setIsSending] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

  const hasEmail = !!lead.email;
  const hasInstagram = !!lead.instagram_handle;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setMessage(fillPlaceholders(template.message_body, lead));
      if (template.subject) {
        setSubject(fillPlaceholders(template.subject, lead));
      }
    }
  };

  const handleSend = async () => {
    const channels: string[] = [];
    if (sendEmail && hasEmail) channels.push('email');
    if (sendInstagram && hasInstagram) channels.push('instagram');

    if (channels.length === 0) {
      toast.error('Select at least one channel to send');
      return;
    }
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          channels,
            lead: {
              id: lead.id,
              email: lead.email,
              instagram_handle: lead.instagram_handle,
              business_name: lead.business_name,
              status: lead.status,
              email_engagement: lead.email_engagement,
            },
          message: message.trim(),
          subject: subject.trim(),
          sender,
        },
      });

      if (error) throw error;

      const results = data?.results || {};
      const successes: string[] = [];
      const failures: string[] = [];

      for (const [channel, result] of Object.entries(results) as [string, { success: boolean; error?: string }][]) {
        if (result.success) {
          successes.push(channel);
        } else {
          failures.push(`${channel}: ${result.error}`);
        }
      }

      if (successes.length > 0) {
        toast.success(`Message sent via ${successes.join(' & ')}`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }
      if (failures.length > 0) {
        failures.forEach((f) => toast.error(f));
      }

      if (successes.length > 0) {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Quick Message — {lead.business_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sender selection */}
          {sendEmail && (
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
          )}

          {/* Available channels */}
          <div className="space-y-2">
            <Label>Send via</Label>
            <div className="flex flex-wrap gap-4">
              <label className={`flex items-center gap-2 ${!hasEmail ? 'opacity-40' : ''}`}>
                <Checkbox
                  checked={sendEmail}
                  onCheckedChange={(v) => setSendEmail(!!v)}
                  disabled={!hasEmail}
                />
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email</span>
                {hasEmail && (
                  <Badge variant="secondary" className="text-[10px]">
                    {lead.email}
                  </Badge>
                )}
                {!hasEmail && <span className="text-xs text-muted-foreground">No email</span>}
              </label>

              <label className={`flex items-center gap-2 ${!hasInstagram ? 'opacity-40' : ''}`}>
                <Checkbox
                  checked={sendInstagram}
                  onCheckedChange={(v) => setSendInstagram(!!v)}
                  disabled={!hasInstagram}
                />
                <Instagram className="h-4 w-4" />
                <span className="text-sm">Instagram DM</span>
                {hasInstagram && (
                  <Badge variant="secondary" className="text-[10px]">
                    @{lead.instagram_handle}
                  </Badge>
                )}
                {!hasInstagram && <span className="text-xs text-muted-foreground">No handle</span>}
              </label>
            </div>
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

          {/* Subject (for email) */}
          {sendEmail && (
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-secondary border-border"
                placeholder="Email subject line..."
              />
            </div>
          )}

          {/* Message body */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-secondary border-border min-h-[150px] font-mono text-sm"
              placeholder="Type your message or select a template above..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || (!sendEmail && !sendInstagram)}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
