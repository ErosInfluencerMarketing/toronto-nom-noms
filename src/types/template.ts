import { Platform } from './lead';

export interface Template {
  id: string;
  user_id: string;
  name: string;
  platform: Platform;
  message_body: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  name: string;
  platform: Platform;
  message_body: string;
}

export const PLACEHOLDERS = [
  { key: '[Business Name]', description: 'The name of the business' },
  { key: '[Owner Name]', description: 'The owner\'s name' },
  { key: '[Example Restaurant]', description: 'An example restaurant reference' },
  { key: '[Instagram Handle]', description: 'The business Instagram handle' },
];
