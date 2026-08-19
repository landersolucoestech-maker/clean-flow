import type { CustomerAccount } from "./customer-account";
import type { Lead } from "../domain/crm";
import type { Job } from "../domain/job";
import type { Invoice,Payment,Transaction } from "../domain/finance";
import type { PayrollRun } from "../domain/payroll";
import { invoiceTotalMinor } from "../domain/finance";
import { payrollRunTotalMinor } from "../domain/payroll";

export type ReportingSnapshot=Readonly<{
  activeCustomers:number;
  openLeads:number;
  scheduledServices:number;
  completedServices:number;
  outstandingInvoicesMinor:number;
  recordedPaymentsMinor:number;
  incomeMinor:number;
  expensesMinor:number;
  payrollDueMinor:number;
}>;

export function buildReportingSnapshot(input:{customers:readonly CustomerAccount[];leads:readonly Lead[];schedule:readonly Job[];invoices:readonly Invoice[];payments:readonly Payment[];transactions:readonly Transaction[];payroll:readonly PayrollRun[]}):ReportingSnapshot{
  const paidByInvoice=new Map<string,number>();for(const payment of input.payments){if(payment.status!=="completed")continue;paidByInvoice.set(payment.invoiceId,(paidByInvoice.get(payment.invoiceId)??0)+payment.amount.amountMinor)}
  const outstandingInvoicesMinor=input.invoices.filter((invoice)=>invoice.status!=="void").reduce((sum,invoice)=>sum+Math.max(0,invoiceTotalMinor(invoice)-(paidByInvoice.get(invoice.id)??0)),0);
  return{
    activeCustomers:input.customers.filter((row)=>row.customer.status==="active").length,
    openLeads:input.leads.filter((lead)=>lead.stage!=="won"&&lead.stage!=="lost").length,
    scheduledServices:input.schedule.filter((row)=>row.status==="scheduled"||row.status==="on_the_way"||row.status==="in_progress").length,
    completedServices:input.schedule.filter((row)=>row.status==="completed").length,
    outstandingInvoicesMinor,
    recordedPaymentsMinor:input.payments.filter((row)=>row.status==="completed").reduce((sum,row)=>sum+row.amount.amountMinor,0),
    incomeMinor:input.transactions.filter((row)=>row.type==="income").reduce((sum,row)=>sum+row.amount.amountMinor,0),
    expensesMinor:input.transactions.filter((row)=>row.type==="expense").reduce((sum,row)=>sum+row.amount.amountMinor,0),
    payrollDueMinor:input.payroll.filter((row)=>row.status!=="paid").reduce((sum,row)=>sum+payrollRunTotalMinor(row),0),
  };
}
