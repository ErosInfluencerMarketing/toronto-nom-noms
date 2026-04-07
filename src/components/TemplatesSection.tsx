import { useState } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { useAttachments } from '@/hooks/useAttachments';
import { Template, TemplateFormData } from '@/types/template';
import { Lead } from '@/types/lead';
import { TemplateCard } from './TemplateCard';
import { TemplateForm } from './TemplateForm';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { PlatformBadge } from './PlatformBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, FileText, Edit2, Trash2, Mail, Instagram } from 'lucide-react';

interface TemplatesSectionProps {
  leads: Lead[];
}

export function TemplatesSection({ leads }: TemplatesSectionProps) {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { setTemplateAttachments } = useAttachments();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const handleCreateTemplate = (data: TemplateFormData) => {
    const { attachment_ids, ...templateData } = data;
    createTemplate.mutate(templateData, {
      onSuccess: (created: any) => {
        if (attachment_ids?.length && created?.id) {
          setTemplateAttachments(created.id, attachment_ids);
        }
        setIsFormOpen(false);
      },
    });
  };

  const handleUpdateTemplate = (data: TemplateFormData) => {
    if (!editingTemplate) return;
    
    updateTemplate.mutate({
      id: editingTemplate.id,
      ...data,
    }, {
      onSuccess: () => {
        setEditingTemplate(null);
        setIsFormOpen(false);
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteTemplate.mutate(deleteConfirmId, {
        onSuccess: () => setDeleteConfirmId(null),
      });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Message Templates</h2>
          <span className="text-sm text-muted-foreground">({templates.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button
            size="sm"
            onClick={() => {
              setEditingTemplate(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading templates...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center border border-dashed border-border rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No templates yet</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFormOpen(true)}
          >
            Create Your First Template
          </Button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              leads={leads}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirmId(id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium text-foreground">{template.name}</TableCell>
                  <TableCell><PlatformBadge platform={template.platform} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1 w-fit">
                      {template.channel === 'email' ? <Mail className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                      {template.channel === 'email' ? 'Email' : 'IG DM'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{template.subject || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{template.message_body}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(template)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(template.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TemplateForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
        template={editingTemplate}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
