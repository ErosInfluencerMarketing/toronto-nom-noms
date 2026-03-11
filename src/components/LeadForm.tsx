import { useState, useEffect } from 'react';
import { Lead, LeadFormData, Platform, LeadStatus } from '@/types/lead';
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
import { z } from 'zod';

const leadSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(100),
  owner_name: z.string().max(100).optional(),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  instagram_handle: z.string().max(50).optional(),
  platform: z.enum(['eros', 'noms']),
  status: z.enum(['new', 'contacted', 'demo_booked', 'onboarded']),
  city: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  next_outreach_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

interface LeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeadFormData) => void;
  lead?: Lead | null;
  isLoading?: boolean;
}

export function LeadForm({ open, onOpenChange, onSubmit, lead, isLoading }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    business_name: '',
    owner_name: '',
    email: '',
    instagram_handle: '',
    platform: 'eros',
    status: 'new',
    next_outreach_date: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lead) {
      setFormData({
        business_name: lead.business_name,
        owner_name: lead.owner_name || '',
        email: lead.email || '',
        instagram_handle: lead.instagram_handle || '',
        platform: lead.platform,
        status: lead.status,
        next_outreach_date: lead.next_outreach_date || '',
        notes: lead.notes || '',
      });
    } else {
      setFormData({
        business_name: '',
        owner_name: '',
        email: '',
        instagram_handle: '',
        platform: 'eros',
        status: 'new',
        next_outreach_date: '',
        notes: '',
      });
    }
    setErrors({});
  }, [lead, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = leadSchema.safeParse(formData);
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
    
    const cleanedData: LeadFormData = {
      ...formData,
      email: formData.email || undefined,
      owner_name: formData.owner_name || undefined,
      instagram_handle: formData.instagram_handle || undefined,
      next_outreach_date: formData.next_outreach_date || undefined,
      notes: formData.notes || undefined,
    };
    
    onSubmit(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="bg-secondary border-border"
              placeholder="Enter business name"
            />
            {errors.business_name && (
              <p className="text-xs text-destructive">{errors.business_name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="owner_name">Owner Name</Label>
            <Input
              id="owner_name"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              className="bg-secondary border-border"
              placeholder="Enter owner name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-secondary border-border"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instagram_handle">Instagram</Label>
              <Input
                id="instagram_handle"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value.replace('@', '') })}
                className="bg-secondary border-border"
                placeholder="@handle"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: LeadStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="demo_booked">Demo Booked</SelectItem>
                  <SelectItem value="onboarded">Onboarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="next_outreach_date">Next Outreach Date</Label>
            <Input
              id="next_outreach_date"
              type="date"
              value={formData.next_outreach_date}
              onChange={(e) => setFormData({ ...formData, next_outreach_date: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-secondary border-border min-h-[80px]"
              placeholder="Add any notes..."
            />
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
              {isLoading ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
