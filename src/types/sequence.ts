export type SequenceStatus = 'active' | 'paused' | 'completed' | 'replied';

export interface SequenceStep {
  id?: string;
  template_id: string;
  step_number: number;
  delay_days: number;
}

export interface Sequence {
  id: string;
  user_id: string;
  lead_id: string;
  template_id: string;
  max_followups: number;
  interval_days: number;
  current_step: number;
  status: SequenceStatus;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
  steps?: SequenceStep[];
}

export interface SequenceFormData {
  lead_ids: string[];
  steps: { template_id: string; delay_days: number }[];
}
