export interface PayrollRecord {
  id: string;
  period: string;
  periodStartISO: string;
  periodEndISO: string;
  employeeName: string;
  staffId: string | null;
  cleaningType: string;
  client: string;
  baseValue: number;
  bonus: number;
  paymentType:
    | "Direct Deposit"
    | "Check"
    | "Cash"
    | "QuickBooks"
    | "zelle"
    | "quickbooks"
    | "check"
    | "cash"
    | string;
  status: "Pending" | "Paid" | "Overdue";
  jobIdShort?: string | null;
}

export interface PayrollListRow {
  id: string;
  period: string;
  periodStartISO: string;
  periodEndISO: string;
  employeeName: string;
  staffId: string | null;
  jobCount: number;
  unitValue: number;
  bonus: number;
  value: number;
  paymentType: PayrollRecord["paymentType"];
  status: PayrollRecord["status"];
  recordIds: string[];
}

export type PayrollSortField = "period" | "employeeName" | "baseValue" | "status";
export type PayrollSortDirection = "asc" | "desc";
