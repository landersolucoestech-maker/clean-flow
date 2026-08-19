import { describe,expect,it } from "vitest";
import { createInvoice,createPayment } from "./finance";
import { MockInvoiceRepository,MockPaymentRepository } from "../data/mock-finance-repositories";

describe("finance application",()=>{
  it("rejects an invoice without line items",async()=>{const repository=new MockInvoiceRepository();await expect(createInvoice(repository,{customerId:"customer-1",status:"draft",issuedAt:"2026-08-19T12:00:00.000Z",dueAt:"2026-08-20T12:00:00.000Z",taxRate:0,lines:[]})).rejects.toThrow("at least one line")});
  it("rejects zero-value payments",async()=>{const repository=new MockPaymentRepository();await expect(createPayment(repository,{invoiceId:"invoice-1",customerId:"customer-1",amount:{amountMinor:0,currency:"USD"},method:"card",status:"completed",paidAt:"2026-08-19T12:00:00.000Z"})).rejects.toThrow("greater than zero")});
});
