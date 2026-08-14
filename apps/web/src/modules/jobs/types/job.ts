export interface Job {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  service_type: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  duration_text?: string | null;
  staff_assigned: string[] | null;
  status: string;
  amount: number | null;
  address: string | null;
  notes: string | null;
  additional_notes?: string | null;
  feedback?: string | null;
  time_started?: string | null;
  time_finished?: string | null;
  on_our_way_time?: string | null;
  payment_status?: string | null;
  invoice_status?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    frequency: string | null;
    payment_method: string | null;
  };
}

export interface JobFormData {
  customer_id: string;
  title: string;
  description?: string;
  service_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  duration_text?: string;
  staff_assigned?: string[];
  status: string;
  amount?: number;
  address?: string;
  notes?: string;
  additional_notes?: string;
  isFromLead?: boolean;
  lead_id?: string;
  generateRecurring?: boolean;
}
