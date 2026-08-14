export interface AppointmentDetailsAppointment {
  id: string | number;
  time: string;
  customer: string;
  customerId?: string;
  customerPhone?: string;
  address: string;
  service: string;
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

export interface JobNote {
  id: string;
  text: string;
  author: string;
}

export interface FeedbackEntry {
  id: string;
  text: string;
  author: string;
  date: string;
}

export interface AppointmentTimeValues {
  onOurWay: string;
  jobStarted: string;
  jobFinished: string;
}
