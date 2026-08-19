import { describe,expect,it } from "vitest";
import { updatePayrollRunStatus } from "./payroll";
import { MockPayrollRepository } from "../data/mock-payroll-repository";
import { payrollFixtures } from "../test-fixtures/payroll";

describe("payroll application",()=>{
  it("allows approved payroll to become paid",async()=>{const repository=new MockPayrollRepository(payrollFixtures);const row=await updatePayrollRunStatus(repository,"payroll-1","paid");expect(row.status).toBe("paid")});
  it("does not reopen a paid payroll run",async()=>{const paid={...payrollFixtures[0],id:"payroll-paid",status:"paid" as const};const repository=new MockPayrollRepository([paid]);await expect(updatePayrollRunStatus(repository,"payroll-paid","draft")).rejects.toThrow("Invalid payroll transition")});
});
