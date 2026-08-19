import type { AutomationRule } from "../domain/automation";
import type { AutomationRepository,CreateAutomationInput,UpdateAutomationInput } from "../application/automation";

export class MockAutomationRepository implements AutomationRepository{
  private records:AutomationRule[];
  constructor(seed:readonly AutomationRule[]=[]){this.records=[...seed];}
  async list(){return[...this.records];}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreateAutomationInput){const row:AutomationRule={...input,id:`automation-${this.records.length+1}`};this.records.push(row);return row;}
  async update(id:string,input:UpdateAutomationInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Automation not found");const row:AutomationRule={...this.records[index],...input};this.records[index]=row;return row;}
}
