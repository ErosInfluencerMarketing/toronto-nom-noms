export type Platform = 'eros' | 'noms';
export type LeadStatus = 'new' | 'contacted' | 'demo_booked' | 'onboarded';
export type EmailEngagement = 'none' | 'sent' | 'opened' | 'clicked' | 'replied';

export interface Lead {
  id: string;
  user_id: string;
  assigned_user_id: string | null;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  website: string | null;
  address: string | null;
  category: string | null;
  city: string | null;
  platform: Platform;
  status: LeadStatus;
  next_outreach_date: string | null;
  last_outreach_date: string | null;
  notes: string | null;
  created_at: string;
  email_engagement: EmailEngagement;
  updated_at: string;
}

export interface LeadFormData {
  business_name: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  instagram_handle?: string;
  website?: string;
  address?: string;
  category?: string;
  city?: string;
  platform: Platform;
  status: LeadStatus;
  next_outreach_date?: string;
  notes?: string;
}
