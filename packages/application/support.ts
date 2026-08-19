import type { SupportTicket } from "../domain/support";
import type { Repository } from "../contracts/repository";
export type CreateSupportTicketInput=Omit<SupportTicket,"id"|"createdAt"|"status"|"messages"> & {message:string};
export type UpdateSupportTicketInput=Partial<Omit<SupportTicket,"id"|"createdAt">>;
export type SupportRepository=Repository<SupportTicket,CreateSupportTicketInput,UpdateSupportTicketInput>;
export async function createSupportTicket(repository:SupportRepository,input:CreateSupportTicketInput){if(!input.subject.trim())throw new Error("Subject is required");if(!input.message.trim())throw new Error("Message is required");return repository.create({...input,subject:input.subject.trim(),message:input.message.trim()})}
