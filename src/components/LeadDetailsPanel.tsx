import { useState, useEffect } from 'react';
import { normalizeInstagramHandle } from '@/lib/utils';
import { Lead } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from './StatusBadge';
import { PlatformBadge } from './PlatformBadge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Mail, Instagram, Calendar, Globe, MapPin, Building2, Save, Loader2, Repeat, Search, Phone, PhoneCall, MailOpen, StickyNote } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface LeadDetailsPanelProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SequenceInfo {
  id: string;
  name: string | null;
  status: string;
  current_step: number;
  max_followups: number;
  next_send_at: string | null;
  template_name: string | null;
}

function PhoneInlineAdd({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const v = value.trim();
    if (!v) { setEditing(false); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('leads').update({ phone: v }).eq('id', leadId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Phone added');
      setEditing(false);
    } catch {
      toast.error('Failed to save phone');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
          onClick={() => setEditing(true)}
        >
          + Add phone number
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        autoFocus
        type="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        placeholder="+1 555 123 4567"
        className="h-7 text-xs"
        disabled={saving}
      />
      <Button size="sm" className="h-7 px-2" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
      </Button>
    </div>
  );
}

export function LeadDetailsPanel({ lead, open, onOpenChange }: LeadDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sequences, setSequences] = useState<SequenceInfo[]>([]);
  const [loadingSeqs, setLoadingSeqs] = useState(false);
  const [findingIg, setFindingIg] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (lead && open) {
      setNotes(lead.notes || '');
      fetchSequences(lead.id);
    }
    if (!open) {
      setSequences([]);
    }
  }, [lead?.id, open]);

  const fetchSequences = async (leadId: string) => {
    setLoadingSeqs(true);
    try {
      const { data, error } = await supabase
        .from('sequences')
        .select('id, name, status, current_step, max_followups, next_send_at, template_id')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch template names
      const templateIds = [...new Set((data || []).map((s) => s.template_id))];
      let templateMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('templates')
          .select('id, name')
          .in('id', templateIds);
        templateMap = Object.fromEntries((templates || []).map((t) => [t.id, t.name]));
      }

      setSequences(
        (data || []).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          current_step: s.current_step,
          max_followups: s.max_followups,
          next_send_at: s.next_send_at,
          template_name: templateMap[s.template_id] || null,
        }))
      );
    } catch {
      setSequences([]);
    } finally {
      setLoadingSeqs(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes })
        .eq('id', lead.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickLog = async (type: 'call' | 'email' | 'note') => {
    if (!lead) return;
    const text = quickNote.trim();
    const labels = { call: '📞 Call', email: '✉️ Email', note: '📝 Note' };
    const stamp = format(new Date(), 'MMM d, yyyy h:mm a');
    const entry = `[${stamp}] ${labels[type]}${text ? ': ' + text : ''}`;
    const updated = entry + (notes ? '\n\n' + notes : '');
    setLogging(true);
    try {
      const updates: Record<string, unknown> = { notes: updated };
      if (type === 'call' || type === 'email') {
        updates.last_outreach_date = new Date().toISOString().split('T')[0];
        if (lead.status === 'new') updates.status = 'contacted';
      }
      const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
      if (error) throw error;
      setNotes(updated);
      setQuickNote('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${labels[type]} logged`);
    } catch {
      toast.error('Failed to log');
    } finally {
      setLogging(false);
    }
  };

  const handleFindInstagram = async () => {
    if (!lead) return;
    setFindingIg(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-instagram', {
        body: {
          businessName: lead.business_name,
          city: lead.city || 'Toronto',
          website: lead.website || '',
          leadId: lead.id,
        },
      });
      if (error) throw error;
      if (data?.instagram_handle) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        toast.success(`Found Instagram: @${data.instagram_handle}`);
      } else {
        toast.info('No Instagram handle found for this business');
      }
    } catch (e) {
      toast.error('Failed to search for Instagram');
      console.error(e);
    } finally {
      setFindingIg(false);
    }
  };

  if (!lead) return null;

  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    completed: 'bg-muted text-muted-foreground border-border',
    replied: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">{lead.business_name}</SheetTitle>
          <div className="flex items-center gap-2 pt-1">
            <StatusBadge status={lead.status} />
            <PlatformBadge platform={lead.platform} />
            {lead.category && (
              <Badge variant="secondary" className="text-xs">
                {lead.category}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Contact Info */}
        <div className="space-y-3 mb-6">
          {lead.owner_name && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{lead.owner_name}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${lead.email}`} className="text-foreground hover:text-primary transition-colors truncate">
                {lead.email}
              </a>
            </div>
          )}
          {lead.phone ? (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${lead.phone}`} className="text-foreground hover:text-primary transition-colors font-medium">
                {lead.phone}
              </a>
            </div>
          ) : (
            <PhoneInlineAdd leadId={lead.id} />
          )}
          {lead.instagram_handle ? (
            <div className="flex items-center gap-2 text-sm">
              <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`https://instagram.com/${normalizeInstagramHandle(lead.instagram_handle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
              >
                @{normalizeInstagramHandle(lead.instagram_handle)}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={handleFindInstagram}
                disabled={findingIg}
              >
                {findingIg ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Searching...</>
                ) : (
                  <><Search className="h-3 w-3 mr-1" /> Find Instagram</>
                )}
              </Button>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                {lead.website}
              </a>
            </div>
          )}
          {(lead.address || lead.city) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{[lead.address, lead.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Outreach Dates */}
        <div className="py-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Outreach</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Last Outreach</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {lead.last_outreach_date
                  ? format(parseISO(lead.last_outreach_date), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-1">Next Outreach</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {lead.next_outreach_date
                  ? format(parseISO(lead.next_outreach_date), 'MMM d, yyyy')
                  : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sequences */}
        <div className="py-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Sequences
          </h3>
          {loadingSeqs ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sequences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enrolled in any sequences.</p>
          ) : (
            <div className="space-y-2">
              {sequences.map((seq) => (
                <div key={seq.id} className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">
                      {seq.name || seq.template_name || 'Unnamed'}
                    </span>
                    <Badge variant="outline" className={`text-xs ${statusColor[seq.status] || ''}`}>
                      {seq.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Step {seq.current_step} / {seq.max_followups}
                    {seq.next_send_at && seq.status === 'active' && (
                      <> · Next send: {format(parseISO(seq.next_send_at), 'MMM d, yyyy h:mm a')}</>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Notes */}
        <div className="py-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
            className="min-h-[120px] resize-none"
          />
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={saving || notes === (lead.notes || '')}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Notes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
