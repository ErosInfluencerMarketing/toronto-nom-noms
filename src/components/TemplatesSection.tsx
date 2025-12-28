import { useState } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { Template, TemplateFormData } from '@/types/template';
import { Lead } from '@/types/lead';
import { TemplateCard } from './TemplateCard';
import { TemplateForm } from './TemplateForm';
import { Button } from '@/components/ui/button';
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
import { Plus, FileText } from 'lucide-react';

interface TemplatesSectionProps {
  leads: Lead[];
}

export function TemplatesSection({ leads }: TemplatesSectionProps) {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateTemplate = (data: TemplateFormData) => {
    createTemplate.mutate(data, {
      onSuccess: () => setIsFormOpen(false),
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
      ) : (
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
      )}

      {/* Template Form Dialog */}
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

      {/* Delete Confirmation Dialog */}
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
