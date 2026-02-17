import { useState } from 'react';
import { Template } from '@/types/template';
import { Lead } from '@/types/lead';
import { PlatformBadge } from './PlatformBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Edit2, Trash2, Eye, Copy, FileText, Mail, Instagram } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateCardProps {
  template: Template;
  leads: Lead[];
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template, leads, onEdit, onDelete }: TemplateCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  
  const filteredLeads = leads.filter((l) => l.platform === template.platform);

  const getPreviewMessage = () => {
    if (!selectedLeadId) return template.message_body;
    
    const lead = leads.find((l) => l.id === selectedLeadId);
    if (!lead) return template.message_body;
    
    return template.message_body
      .replace(/\[Business Name\]/g, lead.business_name || '')
      .replace(/\[Owner Name\]/g, lead.owner_name || 'there')
      .replace(/\[Example Restaurant\]/g, 'La Bella Italia')
      .replace(/\[Instagram Handle\]/g, lead.instagram_handle ? `@${lead.instagram_handle}` : '');
  };

  const copyToClipboard = () => {
    const message = getPreviewMessage();
    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard');
  };

  return (
    <>
      <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
                <PlatformBadge platform={template.platform} />
                <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                  {template.channel === 'email' ? <Mail className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                  {template.channel === 'email' ? 'Email' : 'IG DM'}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-3 font-mono bg-secondary/50 rounded p-2 mt-2">
                {template.message_body}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(template)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview: {template.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select a lead to preview with</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead (show placeholders)</SelectItem>
                  {filteredLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredLeads.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No leads found for {template.platform === 'eros' ? 'Eros' : 'Noms'} platform
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Message Preview</Label>
              <div className="bg-secondary rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border border-border min-h-[150px]">
                {selectedLeadId && selectedLeadId !== 'none' ? getPreviewMessage() : template.message_body}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
