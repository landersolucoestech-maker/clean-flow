import type { AutomationRule } from "../domain/automation";
import type { Repository } from "../contracts/repository";

export type CreateAutomationInput=Omit<AutomationRule,"id">;
export type UpdateAutomationInput=Partial<Omit<AutomationRule,"id">>;
export type AutomationRepository=Repository<AutomationRule,CreateAutomationInput,UpdateAutomationInput>;

export async function createAutomation(repository:AutomationRepository,input:CreateAutomationInput){
  if(!input.name.trim())throw new Error("Automation name is required");
  if(input.delayValue<0)throw new Error("Automation delay cannot be negative");
  if(!input.messageTemplate.trim())throw new Error("Message template is required");
  return repository.create({...input,name:input.name.trim(),messageTemplate:input.messageTemplate.trim()});
}

export async function setAutomationEnabled(repository:AutomationRepository,id:string,enabled:boolean){return repository.update(id,{enabled});}
