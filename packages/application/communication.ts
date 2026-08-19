import type { CommunicationChannel,CommunicationMessage } from "../domain/communication";
import type { Repository } from "../contracts/repository";

export type CreateCommunicationInput=Omit<CommunicationMessage,"id"|"status"|"createdAt">;
export type UpdateCommunicationInput=Partial<Pick<CommunicationMessage,"status">>;
export type CommunicationRepository=Repository<CommunicationMessage,CreateCommunicationInput,UpdateCommunicationInput>;

export async function composeCommunication(repository:CommunicationRepository,input:CreateCommunicationInput){
  if(!input.contactId)throw new Error("Contact is required");
  if(!input.body.trim())throw new Error("Message body is required");
  if(input.channel==="email"&&!input.subject?.trim())throw new Error("Email subject is required");
  return repository.create({...input,body:input.body.trim(),subject:input.subject?.trim()||undefined});
}

export function channelLabel(channel:CommunicationChannel){return channel==="sms"?"SMS":"Email";}
