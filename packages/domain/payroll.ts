import type { EntityId, ISODateTime, Money } from "./identity";

export type PayrollRunStatus="draft"|"approved"|"paid";
export type PayrollItem=Readonly<{
  id:EntityId;
  staffId:EntityId;
  scheduledServiceId?:EntityId;
  baseAmount:Money;
  bonusAmount:Money;
  adjustmentAmount:Money;
  note?:string;
}>;
export type PayrollRun=Readonly<{
  id:EntityId;
  periodStart:ISODateTime;
  periodEnd:ISODateTime;
  status:PayrollRunStatus;
  items:readonly PayrollItem[];
  createdAt:ISODateTime;
}>;
export function payrollItemTotalMinor(item:PayrollItem){return item.baseAmount.amountMinor+item.bonusAmount.amountMinor+item.adjustmentAmount.amountMinor}
export function payrollRunTotalMinor(run:PayrollRun){return run.items.reduce((sum,item)=>sum+payrollItemTotalMinor(item),0)}
