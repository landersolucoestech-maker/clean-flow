import type { PayrollRun } from "../domain/payroll";

export const payrollFixtures:readonly PayrollRun[]=[
  {id:"payroll-1",periodStart:"2026-08-10T00:00:00.000Z",periodEnd:"2026-08-16T23:59:59.000Z",status:"approved",createdAt:"2026-08-17T12:00:00.000Z",items:[
    {id:"payroll-item-1",staffId:"staff-1",scheduledServiceId:"job-1",baseAmount:{amountMinor:13500,currency:"USD"},bonusAmount:{amountMinor:1500,currency:"USD"},adjustmentAmount:{amountMinor:0,currency:"USD"}},
    {id:"payroll-item-2",staffId:"staff-2",scheduledServiceId:"job-2",baseAmount:{amountMinor:11250,currency:"USD"},bonusAmount:{amountMinor:0,currency:"USD"},adjustmentAmount:{amountMinor:0,currency:"USD"}},
  ]},
];
