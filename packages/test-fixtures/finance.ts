import type { Invoice,Payment,Transaction } from "../domain/finance";

export const invoiceFixtures:readonly Invoice[]=[
  {id:"invoice-1",number:"MF-1001",customerId:"customer-1",serviceId:"job-1",status:"sent",issuedAt:"2026-08-18T13:00:00.000Z",dueAt:"2026-08-25T13:00:00.000Z",taxRate:0,lines:[{id:"line-1",description:"Recurring residential cleaning",quantity:1,unitPrice:{amountMinor:27000,currency:"USD"}}]},
  {id:"invoice-2",number:"MF-1002",customerId:"customer-2",serviceId:"job-2",status:"paid",issuedAt:"2026-08-17T14:30:00.000Z",dueAt:"2026-08-24T14:30:00.000Z",taxRate:0,lines:[{id:"line-2",description:"Weekly residential cleaning",quantity:1,unitPrice:{amountMinor:22500,currency:"USD"}}]},
  {id:"invoice-3",number:"MF-1003",customerId:"customer-3",serviceId:"job-3",status:"draft",issuedAt:"2026-08-19T12:00:00.000Z",dueAt:"2026-08-26T12:00:00.000Z",taxRate:0,lines:[{id:"line-3",description:"Commercial office cleaning",quantity:1,unitPrice:{amountMinor:42000,currency:"USD"}}]},
];

export const paymentFixtures:readonly Payment[]=[
  {id:"payment-1",invoiceId:"invoice-2",customerId:"customer-2",amount:{amountMinor:22500,currency:"USD"},method:"zelle",status:"completed",paidAt:"2026-08-18T15:12:00.000Z",reference:"ZEL-82193"},
];

export const transactionFixtures:readonly Transaction[]=[
  {id:"transaction-1",type:"income",category:"Cleaning services",amount:{amountMinor:22500,currency:"USD"},occurredAt:"2026-08-18T15:12:00.000Z",description:"Payment for invoice MF-1002",invoiceId:"invoice-2",paymentId:"payment-1"},
  {id:"transaction-2",type:"expense",category:"Supplies",amount:{amountMinor:8640,currency:"USD"},occurredAt:"2026-08-18T11:40:00.000Z",description:"Cleaning supplies restock"},
  {id:"transaction-3",type:"expense",category:"Fuel",amount:{amountMinor:5790,currency:"USD"},occurredAt:"2026-08-17T17:10:00.000Z",description:"Vehicle fuel"},
];
