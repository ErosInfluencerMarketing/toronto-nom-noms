import { useState, useEffect } from 'react';
import { Template, TemplateFormData, PLACEHOLDERS } from '@/types/template';
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
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  platform: z.enum(['eros', 'noms']),
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
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    platform: 'eros',
    message_body: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        platform: template.platform,
        message_body: template.message_body,
      });
    } else {
      setFormData({
        name: '',
        platform: 'eros',
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
    setFormData({
      ...formData,
      message_body: formData.message_body + placeholder,
    });
  };

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
            <Textarea
              id="message_body"
              value={formData.message_body}
              onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
              className="bg-secondary border-border min-h-[150px] font-mono text-sm"
              placeholder="Hi [Owner Name], I noticed [Business Name] on Instagram..."
            />
            {errors.message_body && (
              <p className="text-xs text-destructive">{errors.message_body}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Click placeholders above to insert them into your message
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
