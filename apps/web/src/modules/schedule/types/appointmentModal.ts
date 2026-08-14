export interface PrefilledData {
  customer?: string;
  address?: string;
  service?: string;
  serviceType?: string;
  amount?: string;
  estimateId?: string;
}

export interface EditJobData {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  team: string;
  status: string;
  duration: string;
  amount: string;
  address: string;
  notes: string;
  additionalNotes: string;
}

export interface AppointmentModalAppointment {
  id: string | number;
  time: string;
  customer: string;
  customerId?: string;
  address: string;
  service: string;
  description?: string;
  title?: string;
  staff: string;
  status: string;
  duration: string;
  date?: string;
  team?: string;
  amount?: number | string;
  notes?: string;
  additionalNotes?: string;
  feedback?: string;
  timeStarted?: string;
  timeFinished?: string;
  onOurWayTime?: string;
  paymentMethod?: string;
}

export interface CreatedJobData {
  customer: string;
  address: string;
  serviceType: string;
  frequency?: string;
  amount: number;
  date: string;
  time: string;
  staffMembers: string[];
  status: string;
  duration: string;
  notes: string;
  additionalNotes: string;
  generateRecurring?: boolean;
}

export interface UpdatedJobData {
  id: string;
  customer: string;
  address: string;
  serviceType: string;
  amount: number;
  date: string;
  time: string;
  staffMembers: string[];
  status: string;
  duration: string;
  notes: string;
  additionalNotes: string;
}

export interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentModalAppointment | null;
  mode: "create" | "view" | "edit";
  prefilledData?: PrefilledData;
  editJobData?: EditJobData | null;
  onJobCreated?: (jobData: CreatedJobData) => void;
  onJobUpdated?: (jobData: UpdatedJobData) => void;
  onJobDeleted?: (jobId: string) => void;
  onRequestEdit?: (appointment: AppointmentModalAppointment) => void;
}
