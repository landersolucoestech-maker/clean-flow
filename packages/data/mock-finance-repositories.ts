import type { Invoice,Payment,Transaction } from "../domain/finance";
import type { CreateInvoiceInput,CreatePaymentInput,CreateTransactionInput,InvoiceRepository,PaymentRepository,TransactionRepository,UpdateInvoiceInput,UpdatePaymentInput,UpdateTransactionInput } from "../application/finance";

export class MockInvoiceRepository implements InvoiceRepository{
  private records:Invoice[];
  constructor(seed:readonly Invoice[]=[]){this.records=[...seed];}
  async list(){return[...this.records];}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreateInvoiceInput){const row:Invoice={...input,id:`invoice-${this.records.length+1}`,number:`MF-${String(1001+this.records.length)}`};this.records.push(row);return row;}
  async update(id:string,input:UpdateInvoiceInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Invoice not found");const row:Invoice={...this.records[index],...input};this.records[index]=row;return row;}
}

export class MockPaymentRepository implements PaymentRepository{
  private records:Payment[];
  constructor(seed:readonly Payment[]=[]){this.records=[...seed];}
  async list(){return[...this.records];}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreatePaymentInput){const row:Payment={...input,id:`payment-${this.records.length+1}`};this.records.push(row);return row;}
  async update(id:string,input:UpdatePaymentInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Payment not found");const row:Payment={...this.records[index],...input};this.records[index]=row;return row;}
}

export class MockTransactionRepository implements TransactionRepository{
  private records:Transaction[];
  constructor(seed:readonly Transaction[]=[]){this.records=[...seed];}
  async list(){return[...this.records].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreateTransactionInput){const row:Transaction={...input,id:`transaction-${this.records.length+1}`};this.records.push(row);return row;}
  async update(id:string,input:UpdateTransactionInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Transaction not found");const row:Transaction={...this.records[index],...input};this.records[index]=row;return row;}
}
