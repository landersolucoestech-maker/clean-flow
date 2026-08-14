import type { Customer } from "@/hooks/useCustomers";

interface CustomerJobSummary {
  status: string;
  scheduled_date?: string | null;
}

interface CustomerInvoiceSummary {
  status: string;
  total?: number | string | null;
}

export interface InactiveCustomerInfo {
  date: string | null;
  reason: string | null;
}

export function formatCustomerDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getCustomerStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
    case "paid":
      return "bg-success/10 text-success hover:bg-success/15";
    case "scheduled":
    case "sent":
      return "bg-primary-light text-primary hover:bg-primary/15";
    case "in-progress":
    case "on-the-way":
      return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20";
    case "cancelled":
    case "overdue":
      return "bg-destructive/10 text-destructive hover:bg-destructive/15";
    case "draft":
    case "open":
    case "pending payment":
      return "bg-warning/10 text-warning-foreground hover:bg-warning/15";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getCustomerLastServiceDate(
  jobs: CustomerJobSummary[],
  fallback: string | null | undefined,
): string | null | undefined {
  const lastCompletedJob = jobs
    .filter((job) => job.status.toLowerCase() === "completed")
    .sort((a, b) => {
      const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return dateB - dateA;
    })[0];

  return lastCompletedJob?.scheduled_date || fallback;
}

export function getCustomerTotalRevenue(invoices: CustomerInvoiceSummary[]): number {
  return invoices
    .filter((invoice) => invoice.status.toLowerCase() === "paid")
    .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
}

export function parseInactiveCustomerInfo(customer: Customer | null): InactiveCustomerInfo | null {
  if (customer?.status !== "Inactive" || !customer.additional_info) return null;

  const dateMatch = customer.additional_info.match(/Inactive since: ([^|]+)/);
  const reasonMatch = customer.additional_info.match(/Reason: (.+)/);

  return {
    date: dateMatch ? dateMatch[1].trim() : null,
    reason: reasonMatch ? reasonMatch[1].trim() : null,
  };
}
