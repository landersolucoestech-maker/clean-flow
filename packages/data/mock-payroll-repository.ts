import type { PayrollRun } from "../domain/payroll";
import type { CreatePayrollRunInput,PayrollRepository,UpdatePayrollRunInput } from "../application/payroll";
export class MockPayrollRepository implements PayrollRepository{
  private records:PayrollRun[];constructor(seed:readonly PayrollRun[]=[]){this.records=[...seed];}
  async list(){return[...this.records].sort((a,b)=>b.periodStart.localeCompare(a.periodStart));}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreatePayrollRunInput){const row:PayrollRun={...input,id:`payroll-${this.records.length+1}`,status:input.status??"draft",createdAt:new Date().toISOString()};this.records.push(row);return row;}
  async update(id:string,input:UpdatePayrollRunInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Payroll run not found");const row:PayrollRun={...this.records[index],...input};this.records[index]=row;return row;}
}
