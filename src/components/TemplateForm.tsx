import { useState, useEffect, useRef } from 'react';
import { Template, TemplateFormData, Channel, PLACEHOLDERS } from '@/types/template';
import { Platform } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bold, Italic, Underline, Link, List, ListOrdered, Heading2 } from 'lucide-react';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  platform: z.enum(['eros', 'noms']),
  channel: z.enum(['email', 'instagram']),
  message_body: z.string().min(1, 'Message body is required').max(2000),
});

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TemplateFormData) => void;
  template?: Template | null;
  isLoading?: boolean;
}

export function TemplateForm({ open, onOpenChange, onSubmit, template, isLoading }: TemplateFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    platform: 'eros',
    channel: 'email',
    message_body: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        platform: template.platform,
        channel: template.channel || 'email',
        message_body: template.message_body,
      });
    } else {
      setFormData({
        name: '',
        platform: 'eros',
        channel: 'email',
        message_body: '',
      });
    }
    setErrors({});
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = templateSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    onSubmit(formData);
  };

  const insertPlaceholder = (placeholder: string) => {
    insertAtCursor(placeholder);
  };

  const wrapSelection = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message_body;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setFormData({ ...formData, message_body: newText });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertAtCursor = (insert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData({ ...formData, message_body: formData.message_body + insert });
      return;
    }
    const start = textarea.selectionStart;
    const text = formData.message_body;
    const newText = text.substring(0, start) + insert + text.substring(start);
    setFormData({ ...formData, message_body: newText });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insert.length, start + insert.length);
    }, 0);
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    const selected = textarea ? formData.message_body.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    if (selected) {
      wrapSelection('<a href="URL">', '</a>');
    } else {
      insertAtCursor('<a href="URL">link text</a>');
    }
  };

  const formatActions = [
    { icon: Bold, label: 'Bold', action: () => wrapSelection('<b>', '</b>') },
    { icon: Italic, label: 'Italic', action: () => wrapSelection('<i>', '</i>') },
    { icon: Underline, label: 'Underline', action: () => wrapSelection('<u>', '</u>') },
    { icon: Link, label: 'Link', action: insertLink },
    { icon: Heading2, label: 'Heading', action: () => wrapSelection('<h2>', '</h2>') },
    { icon: List, label: 'Bullet List', action: () => insertAtCursor('\n<ul>\n  <li>Item</li>\n</ul>\n') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertAtCursor('\n<ol>\n  <li>Item</li>\n</ol>\n') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-secondary border-border"
              placeholder="e.g., Initial Outreach"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={formData.platform}
              onValueChange={(value: Platform) => setFormData({ ...formData, platform: value })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eros">Eros</SelectItem>
                <SelectItem value="noms">Noms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <Select
              value={formData.channel}
              onValueChange={(value: Channel) => setFormData({ ...formData, channel: value })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="instagram">Instagram DM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message_body">Message Body *</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PLACEHOLDERS.map((p) => (
                <Badge
                  key={p.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors text-xs"
                  onClick={() => insertPlaceholder(p.key)}
                >
                  {p.key}
                </Badge>
              ))}
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5 p-1 border border-border rounded-t-md bg-muted/50">
                {formatActions.map((item) => (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          item.action();
                        }}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <Textarea
              ref={textareaRef}
              id="message_body"
              value={formData.message_body}
              onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
              className="bg-secondary border-border min-h-[150px] font-mono text-sm rounded-t-none -mt-px"
              placeholder="Hi [Owner Name], I noticed [Business Name] on Instagram..."
            />
            {errors.message_body && (
              <p className="text-xs text-destructive">{errors.message_body}</p>
            )}
            {formData.message_body && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div
                  className="rounded-md border border-border bg-background p-3 text-sm max-w-none
                    [&_a]:text-primary [&_a]:underline [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5
                    max-h-[150px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: formData.message_body }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Use the toolbar to format text with HTML tags. Click placeholders to insert dynamic fields.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
