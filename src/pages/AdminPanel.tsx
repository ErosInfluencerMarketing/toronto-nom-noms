import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useLeads } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, UserPlus, Users, Mail, Shield, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminPanel() {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { members, isLoading, invites, sendInvite, assignLeads } = useTeamMembers();
  const { leads } = useLeads();

  const [inviteEmail, setInviteEmail] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [assignFilter, setAssignFilter] = useState('unassigned');

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have admin permissions.</p>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    await sendInvite.mutateAsync(inviteEmail.trim());
    setInviteEmail('');
  };

  const filteredLeadsForAssign = leads.filter((l) => {
    if (assignFilter === 'unassigned') return !(l as any).assigned_user_id || (l as any).assigned_user_id === user?.id;
    return true;
  });

  const handleBulkAssign = () => {
    if (!selectedMemberId) return;
    const leadIds = filteredLeadsForAssign.map((l) => l.id);
    if (leadIds.length === 0) {
      toast.info('No leads to assign');
      return;
    }
    assignLeads.mutate({ leadIds, userId: selectedMemberId });
    setAssignDialogOpen(false);
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Invite Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invite Team Member
            </CardTitle>
            <CardDescription>Send an email invite to add a new user to the CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="max-w-sm bg-secondary border-border"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <Button onClick={handleSendInvite} disabled={sendInvite.isPending || !inviteEmail.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>

            {invites.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Pending Invites</h4>
                <div className="flex flex-wrap gap-2">
                  {invites.filter((i: any) => i.status === 'pending').map((inv: any) => (
                    <Badge key={inv.id} variant="outline" className="text-xs">
                      <Mail className="h-3 w-3 mr-1" /> {inv.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Team Members ({members.length})
            </CardTitle>
            <CardDescription>Manage team access and assign leads</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Leads</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const assignedCount = leads.filter((l) => (l as any).assigned_user_id === member.id).length;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name || '—'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignedCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {member.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberId(member.id);
                              setAssignDialogOpen(true);
                            }}
                          >
                            Assign Leads
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Assign Leads Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Assign Leads to {selectedMember?.full_name || selectedMember?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignFilter} onValueChange={setAssignFilter}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned / My Leads</SelectItem>
                <SelectItem value="all">All Leads</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {filteredLeadsForAssign.length} lead{filteredLeadsForAssign.length !== 1 ? 's' : ''} will be assigned.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={assignLeads.isPending}>
              {assignLeads.isPending ? 'Assigning...' : 'Assign All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
