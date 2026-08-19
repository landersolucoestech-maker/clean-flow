import type { Invoice, InvoiceLine, InvoiceStatus, Payment, Transaction } from "../domain/finance";
import type { Repository } from "../contracts/repository";

export type CreateInvoiceInput=Omit<Invoice,"id"|"number">;
export type UpdateInvoiceInput=Partial<Omit<Invoice,"id"|"number">>;
export type InvoiceRepository=Repository<Invoice,CreateInvoiceInput,UpdateInvoiceInput>;
export type CreatePaymentInput=Omit<Payment,"id">;
export type UpdatePaymentInput=Partial<Omit<Payment,"id">>;
export type PaymentRepository=Repository<Payment,CreatePaymentInput,UpdatePaymentInput>;
export type CreateTransactionInput=Omit<Transaction,"id">;
export type UpdateTransactionInput=Partial<Omit<Transaction,"id">>;
export type TransactionRepository=Repository<Transaction,CreateTransactionInput,UpdateTransactionInput>;

const invoiceTransitions:Readonly<Record<InvoiceStatus,readonly InvoiceStatus[]>>={
  draft:["sent","void"],
  sent:["partially_paid","paid","overdue","void"],
  partially_paid:["paid","overdue","void"],
  overdue:["partially_paid","paid","void"],
  paid:[],
  void:[],
};

function validateLines(lines:readonly InvoiceLine[]){if(!lines.length)throw new Error("Invoice requires at least one line");for(const line of lines){if(!line.description.trim())throw new Error("Invoice line description is required");if(line.quantity<=0)throw new Error("Invoice line quantity must be greater than zero");if(line.unitPrice.amountMinor<0)throw new Error("Invoice line price cannot be negative");}}

export function canTransitionInvoiceStatus(current:InvoiceStatus,next:InvoiceStatus){return current===next||invoiceTransitions[current].includes(next)}
export function nextInvoiceStatuses(current:InvoiceStatus){return invoiceTransitions[current]}
export async function createInvoice(repository:InvoiceRepository,input:CreateInvoiceInput){if(!input.customerId)throw new Error("Customer is required");validateLines(input.lines);if(input.taxRate<0||input.taxRate>1)throw new Error("Tax rate must be between 0 and 1");if(new Date(input.dueAt).getTime()<new Date(input.issuedAt).getTime())throw new Error("Due date cannot be before issue date");return repository.create(input)}
export async function updateInvoiceStatus(repository:InvoiceRepository,id:string,status:Invoice["status"]){const current=await repository.getById(id);if(!current)throw new Error("Invoice not found");if(!canTransitionInvoiceStatus(current.status,status))throw new Error(`Invalid invoice status transition: ${current.status} -> ${status}`);if(current.status===status)return current;return repository.update(id,{status})}
export async function createPayment(repository:PaymentRepository,input:CreatePaymentInput){if(!input.invoiceId||!input.customerId)throw new Error("Invoice and customer are required");if(input.amount.amountMinor<=0)throw new Error("Payment amount must be greater than zero");return repository.create(input)}
export async function createTransaction(repository:TransactionRepository,input:CreateTransactionInput){if(!input.category.trim())throw new Error("Transaction category is required");if(!input.description.trim())throw new Error("Transaction description is required");if(input.amount.amountMinor<=0)throw new Error("Transaction amount must be greater than zero");return repository.create({...input,category:input.category.trim(),description:input.description.trim()})}
