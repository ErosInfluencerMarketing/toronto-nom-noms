import { useState } from 'react';
import { useRestaurantGroups, RestaurantGroup } from '@/hooks/useRestaurantGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Building2, Plus, Pencil, Trash2, Eye, X, Mail, Instagram, MapPin } from 'lucide-react';
import { Lead } from '@/types/lead';
import { StatusBadge } from '@/components/StatusBadge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RestaurantGroupManagerProps {
  leads: Lead[];
  onViewLead?: (lead: Lead) => void;
}

export function RestaurantGroupManager({ leads, onViewLead }: RestaurantGroupManagerProps) {
  const { groups, createGroup, updateGroup, deleteGroup, assignLeadsToGroup } = useRestaurantGroups();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RestaurantGroup | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingGroup, setViewingGroup] = useState<RestaurantGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const viewingLeads = viewingGroup
    ? leads.filter((l) => (l as any).group_id === viewingGroup.id)
    : [];

  const handleRemoveFromGroup = (leadId: string) => {
    assignLeadsToGroup.mutate({ leadIds: [leadId], groupId: null });
  };

  const openCreate = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setFormOpen(true);
  };

  const openEdit = (group: RestaurantGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || '');
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, name: name.trim(), description: description.trim() }, {
        onSuccess: () => setFormOpen(false),
      });
    } else {
      createGroup.mutate({ name: name.trim(), description: description.trim() }, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteGroup.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const getLeadCount = (groupId: string) =>
    leads.filter((l) => (l as any).group_id === groupId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Restaurant Groups</h2>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No groups yet. Create one to organize your leads.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const count = getLeadCount(group.id);
            return (
              <div
                key={group.id}
                className="rounded-lg border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {count} lead{count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setViewingGroup(group)} disabled={count === 0}>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(group)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(group.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'New Restaurant Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. King West Restaurants"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="bg-secondary border-border"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createGroup.isPending || updateGroup.isPending}
            >
              {editingGroup ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the group. Leads in this group will be unlinked but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Group Leads Dialog */}
      <Dialog open={!!viewingGroup} onOpenChange={(open) => !open && setViewingGroup(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {viewingGroup?.name}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({viewingLeads.length} lead{viewingLeads.length !== 1 ? 's' : ''})
              </span>
            </DialogTitle>
            {viewingGroup?.description && (
              <p className="text-sm text-muted-foreground">{viewingGroup.description}</p>
            )}
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {viewingLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No leads in this group.</p>
            ) : (
              <div className="space-y-2 pb-2">
                {viewingLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onViewLead) {
                          onViewLead(lead);
                          setViewingGroup(null);
                        }
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate hover:text-primary transition-colors">
                          {lead.business_name || '(no name)'}
                        </span>
                        <StatusBadge status={lead.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {lead.email}
                          </span>
                        )}
                        {lead.instagram_handle && (
                          <span className="flex items-center gap-1 truncate">
                            <Instagram className="h-3 w-3 shrink-0" />
                            @{lead.instagram_handle}
                          </span>
                        )}
                        {lead.city && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {lead.city}
                          </span>
                        )}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFromGroup(lead.id)}
                      title="Remove from group"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingGroup(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
