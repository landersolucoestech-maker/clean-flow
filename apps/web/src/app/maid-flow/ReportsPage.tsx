import { ChevronRight } from "lucide-react";
import { buildReportingSnapshot } from "../../../../../packages/application/reporting";
import { customerAccountFixtures } from "../../../../../packages/test-fixtures/customers";
import { leadFixtures } from "../../../../../packages/test-fixtures/leads";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";
import { invoiceFixtures,paymentFixtures,transactionFixtures } from "../../../../../packages/test-fixtures/finance";
import { payrollFixtures } from "../../../../../packages/test-fixtures/payroll";

const snapshot=buildReportingSnapshot({customers:customerAccountFixtures,leads:leadFixtures,schedule:jobFixtures,invoices:invoiceFixtures,payments:paymentFixtures,transactions:transactionFixtures,payroll:payrollFixtures});
const money=(minor:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(minor/100);
const definitions=[
  {name:"Active customers",value:String(snapshot.activeCustomers),definition:"Customer accounts whose current status is active."},
  {name:"Open leads",value:String(snapshot.openLeads),definition:"Leads not currently marked won or lost."},
  {name:"Scheduled services",value:String(snapshot.scheduledServices),definition:"Services currently scheduled, on the way or in progress."},
  {name:"Completed services",value:String(snapshot.completedServices),definition:"Services whose execution status is completed."},
  {name:"Outstanding invoices",value:money(snapshot.outstandingInvoicesMinor),definition:"Invoice totals less completed payments, excluding void invoices."},
  {name:"Recorded payments",value:money(snapshot.recordedPaymentsMinor),definition:"Payments currently recorded with completed status."},
  {name:"Income",value:money(snapshot.incomeMinor),definition:"Transactions explicitly classified as income."},
  {name:"Expenses",value:money(snapshot.expensesMinor),definition:"Transactions explicitly classified as expense."},
  {name:"Payroll due",value:money(snapshot.payrollDueMinor),definition:"Payroll runs that have not reached paid status."},
] as const;

export function ReportsPage(){return <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="mx-auto w-full max-w-[1200px]"><div className="mb-6 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Maid Flow</span><ChevronRight className="h-3 w-3"/><span className="text-foreground/80">Reports</span></div><header className="border-b border-border pb-5"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Insights</p><h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">Reports</h1><p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">Defined operational and financial metrics using the current frontend dataset. No artificial market benchmarks.</p></header><section className="pt-5"><div className="overflow-hidden rounded-md border border-border bg-card"><div className="grid grid-cols-[1fr_auto] border-b border-border bg-muted/45 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground"><span>Metric</span><span>Current value</span></div>{definitions.map((metric)=><div key={metric.name} className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><h2 className="text-xs font-semibold">{metric.name}</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{metric.definition}</p></div><div className="text-sm font-semibold sm:text-right">{metric.value}</div></div>)}</div><div className="mt-5 border-l-2 border-primary/40 bg-primary/[0.04] px-4 py-3 text-xs leading-5 text-muted-foreground">These figures validate product semantics only. Production reporting queries, historical comparisons and cohort logic will be designed with the backend later.</div></section></div></main>}
