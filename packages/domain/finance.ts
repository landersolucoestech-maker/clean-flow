import type { EntityId, ISODateTime, Money } from "./identity";

export type InvoiceStatus="draft"|"sent"|"partially_paid"|"paid"|"overdue"|"void";
export type PaymentMethod="card"|"ach"|"zelle"|"venmo"|"cash"|"check"|"other";
export type PaymentStatus="pending"|"completed"|"failed"|"refunded";
export type TransactionType="income"|"expense";

export type InvoiceLine=Readonly<{id:EntityId;description:string;quantity:number;unitPrice:Money}>;
export type Invoice=Readonly<{
  id:EntityId;
  number:string;
  customerId:EntityId;
  serviceId?:EntityId;
  status:InvoiceStatus;
  issuedAt:ISODateTime;
  dueAt:ISODateTime;
  lines:readonly InvoiceLine[];
  taxRate:number;
  notes?:string;
}>;

export type Payment=Readonly<{
  id:EntityId;
  invoiceId:EntityId;
  customerId:EntityId;
  amount:Money;
  method:PaymentMethod;
  status:PaymentStatus;
  paidAt:ISODateTime;
  reference?:string;
}>;

export type Transaction=Readonly<{
  id:EntityId;
  type:TransactionType;
  category:string;
  amount:Money;
  occurredAt:ISODateTime;
  description:string;
  invoiceId?:EntityId;
  paymentId?:EntityId;
}>;

export function invoiceSubtotalMinor(invoice:Invoice){return invoice.lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice.amountMinor,0)}
export function invoiceTaxMinor(invoice:Invoice){return Math.round(invoiceSubtotalMinor(invoice)*invoice.taxRate)}
export function invoiceTotalMinor(invoice:Invoice){return invoiceSubtotalMinor(invoice)+invoiceTaxMinor(invoice)}
