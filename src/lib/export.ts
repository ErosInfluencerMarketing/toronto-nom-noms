import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Lead } from '@/types/lead';
import type { Template } from '@/types/template';
import type { Influencer } from '@/hooks/useInfluencers';

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const stamp = () => format(new Date(), 'yyyy-MM-dd');

export function exportLeadsCSV(leads: Lead[], filenamePrefix = 'leads') {
  const headers = [
    'Business Name', 'Owner Name', 'Email', 'Phone', 'Instagram Handle', 'Website',
    'Address', 'City', 'Category', 'Platform', 'Status', 'Email Engagement',
    'Next Outreach Date', 'Last Outreach Date', 'Notes', 'Created At',
  ];
  const rows = leads.map((l) => [
    l.business_name, l.owner_name, l.email, l.phone, l.instagram_handle, l.website,
    l.address, l.city, l.category, l.platform, l.status, l.email_engagement,
    l.next_outreach_date, l.last_outreach_date, l.notes,
    format(new Date(l.created_at), 'yyyy-MM-dd'),
  ]);
  downloadCSV(toCSV(headers, rows), `${filenamePrefix}-${stamp()}.csv`);
  toast.success(`Exported ${leads.length} leads`);
}

export function exportTemplatesCSV(templates: Template[]) {
  const headers = ['Name', 'Platform', 'Channel', 'Subject', 'Message Body', 'Created At'];
  const rows = templates.map((t) => [
    t.name, t.platform, t.channel, t.subject, t.message_body,
    format(new Date(t.created_at), 'yyyy-MM-dd'),
  ]);
  downloadCSV(toCSV(headers, rows), `templates-${stamp()}.csv`);
  toast.success(`Exported ${templates.length} templates`);
}

export function exportInfluencersCSV(influencers: Influencer[]) {
  const headers = [
    'Username', 'Full Name', 'Platform', 'Profile URL', 'Bio', 'Email', 'Website',
    'City', 'Niche', 'Content Type', 'Followers', 'Following', 'Posts',
    'Engagement Rate', 'Avg Likes', 'Avg Comments', 'Contact Method', 'Status',
    'Notes', 'Created At',
  ];
  const rows = influencers.map((i) => [
    i.username, i.full_name, i.platform, i.profile_url, i.bio, i.email, i.website,
    i.city, i.niche, i.content_type, i.followers_count, i.following_count, i.posts_count,
    i.engagement_rate, i.avg_likes, i.avg_comments, i.contact_method, i.status,
    i.notes, format(new Date(i.created_at), 'yyyy-MM-dd'),
  ]);
  downloadCSV(toCSV(headers, rows), `influencers-${stamp()}.csv`);
  toast.success(`Exported ${influencers.length} influencers`);
}

export function exportEverything(leads: Lead[], templates: Template[], influencers: Influencer[]) {
  exportLeadsCSV(leads);
  exportTemplatesCSV(templates);
  exportInfluencersCSV(influencers);
}
