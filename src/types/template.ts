import { Platform } from './lead';

export type Channel = 'email' | 'instagram';

export interface Template {
  id: string;
  user_id: string;
  name: string;
  platform: Platform;
  channel: Channel;
  subject: string | null;
  message_body: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  name: string;
  platform: Platform;
  channel: Channel;
  subject: string;
  message_body: string;
  attachment_ids?: string[];
}

export const PLACEHOLDERS = [
  { key: '[Business Name]', description: 'The name of the business' },
  { key: '[Owner Name]', description: 'The owner\'s name' },
  { key: '[Example Restaurant]', description: 'An example restaurant reference' },
  { key: '[Instagram Handle]', description: 'The business Instagram handle' },
  { key: '[City]', description: 'The city of the business' },
  { key: '[Category]', description: 'The business category/cuisine type' },
];
