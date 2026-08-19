import type { PayrollRun,PayrollRunStatus } from "../domain/payroll";
import type { Repository } from "../contracts/repository";

export type CreatePayrollRunInput=Omit<PayrollRun,"id"|"createdAt"|"status"> & {status?:PayrollRunStatus};
export type UpdatePayrollRunInput=Partial<Omit<PayrollRun,"id"|"createdAt">>;
export type PayrollRepository=Repository<PayrollRun,CreatePayrollRunInput,UpdatePayrollRunInput>;

export async function createPayrollRun(repository:PayrollRepository,input:CreatePayrollRunInput){if(new Date(input.periodEnd).getTime()<new Date(input.periodStart).getTime())throw new Error("Payroll period end cannot be before start");if(!input.items.length)throw new Error("Payroll run requires at least one item");for(const item of input.items){if(!item.staffId)throw new Error("Payroll item requires staff");if(item.baseAmount.amountMinor<0)throw new Error("Base amount cannot be negative");}return repository.create(input)}
export async function updatePayrollRunStatus(repository:PayrollRepository,id:string,status:PayrollRunStatus){const current=await repository.getById(id);if(!current)throw new Error("Payroll run not found");const allowed:Record<PayrollRunStatus,readonly PayrollRunStatus[]>={draft:["approved"],approved:["paid"],paid:[]};if(current.status===status)return current;if(!allowed[current.status].includes(status))throw new Error(`Invalid payroll transition: ${current.status} -> ${status}`);return repository.update(id,{status})}
