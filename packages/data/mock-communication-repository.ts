import type { CommunicationMessage } from "../domain/communication";
import type { CommunicationRepository,CreateCommunicationInput,UpdateCommunicationInput } from "../application/communication";

export class MockCommunicationRepository implements CommunicationRepository{
  private records:CommunicationMessage[];
  constructor(seed:readonly CommunicationMessage[]=[]){this.records=[...seed];}
  async list(){return[...this.records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
  async create(input:CreateCommunicationInput){const row:CommunicationMessage={...input,id:`communication-${this.records.length+1}`,status:input.direction==="inbound"?"received":"draft",createdAt:new Date().toISOString()};this.records.push(row);return row;}
  async update(id:string,input:UpdateCommunicationInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Communication not found");const row:CommunicationMessage={...this.records[index],...input};this.records[index]=row;return row;}
}
