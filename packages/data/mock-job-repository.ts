import type { Job } from "../domain/job";
import type { CreateJobInput,JobRepository,UpdateJobInput } from "../application/job";
export class MockJobRepository implements JobRepository{
 private records:Job[];constructor(seed:readonly Job[]=[]){this.records=[...seed];}
 async list(){return[...this.records];}async getById(id:string){return this.records.find((row)=>row.id===id)??null;}
 async create(input:CreateJobInput){const{serviceFrequency:_frequency,...rest}=input;const row:Job={...rest,id:`job-${this.records.length+1}`,status:input.status??"scheduled"};this.records.push(row);return row;}
 async update(id:string,input:UpdateJobInput){const index=this.records.findIndex((row)=>row.id===id);if(index<0)throw new Error("Job not found");const row:Job={...this.records[index],...input};this.records[index]=row;return row;}
}
