import type { Job, JobStatus } from "../domain/job";
import type { ServiceDefinition, ServiceFrequency } from "../domain/service";
import { isFrequencyAllowed } from "../domain/service";
import type { Repository } from "../contracts/repository";

export type CreateJobInput = Omit<Job,"id"|"status"> & { status?: JobStatus; serviceFrequency?: ServiceFrequency };
export type UpdateJobInput = Partial<Omit<Job,"id">>;
export type JobRepository = Repository<Job,CreateJobInput,UpdateJobInput>;

const allowedStatusTransitions:Readonly<Record<JobStatus,readonly JobStatus[]>>={
  scheduled:["on_the_way","cancelled"],
  on_the_way:["in_progress","cancelled"],
  in_progress:["completed","cancelled"],
  completed:[],
  cancelled:[],
};

export function canTransitionJobStatus(current:JobStatus,next:JobStatus){return current===next||allowedStatusTransitions[current].includes(next)}

export async function createJob(repository:JobRepository,input:CreateJobInput,service:ServiceDefinition){
  if(!input.customerId||!input.locationId) throw new Error("Customer and service location are required");
  if(input.durationMinutes<=0) throw new Error("Job duration must be greater than zero");
  if(input.price.amountMinor<0) throw new Error("Job price cannot be negative");
  if(!service.active) throw new Error("Inactive services cannot be scheduled");
  if(input.serviceFrequency&&!isFrequencyAllowed(service,input.serviceFrequency)) throw new Error("Frequency is not allowed for this service");
  return repository.create(input);
}

export async function updateJobStatus(repository:JobRepository,id:string,status:JobStatus){
  const current=await repository.getById(id);
  if(!current) throw new Error("Job not found");
  if(!canTransitionJobStatus(current.status,status)) throw new Error(`Invalid job status transition: ${current.status} -> ${status}`);
  if(current.status===status)return current;
  return repository.update(id,{status});
}
