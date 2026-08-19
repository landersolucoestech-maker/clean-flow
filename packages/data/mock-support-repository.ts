import type { SupportTicket } from "../domain/support";
import type { CreateSupportTicketInput,SupportRepository,UpdateSupportTicketInput } from "../application/support";
export class MockSupportRepository implements SupportRepository{
 private records:SupportTicket[];constructor(seed:readonly SupportTicket[]=[]){this.records=[...seed];}
 async list(){return[...this.records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
 async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
 async create(input:CreateSupportTicketInput){const now=new Date().toISOString();const row:SupportTicket={id:`ticket-${this.records.length+1}`,subject:input.subject,category:input.category,priority:input.priority,status:"open",createdAt:now,messages:[{id:`ticket-message-${Date.now()}`,author:"customer",body:input.message,createdAt:now}]};this.records.push(row);return row;}
 async update(id:string,input:UpdateSupportTicketInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Support ticket not found");const row:SupportTicket={...this.records[index],...input};this.records[index]=row;return row;}
}
