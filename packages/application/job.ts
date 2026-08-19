import type { Job, JobStatus } from "../domain/job";
import type { ServiceDefinition, ServiceFrequency } from "../domain/service";
import { isFrequencyAllowed } from "../domain/service";
import type { Repository } from "../contracts/repository";

export type CreateJobInput = Omit<Job,"id"|"status"> & { status?: JobStatus; serviceFrequency?: ServiceFrequency };
export type UpdateJobInput = Partial<Omit<Job,"id">>;
export type JobRepository = Repository<Job,CreateJobInput,UpdateJobInput>;

export async function createJob(repository:JobRepository,input:CreateJobInput,service:ServiceDefinition){
  if(!input.customerId||!input.locationId) throw new Error("Customer and service location are required");
  if(input.durationMinutes<=0) throw new Error("Job duration must be greater than zero");
  if(input.price.amountMinor<0) throw new Error("Job price cannot be negative");
  if(!service.active) throw new Error("Inactive services cannot be scheduled");
  if(input.serviceFrequency&&!isFrequencyAllowed(service,input.serviceFrequency)) throw new Error("Frequency is not allowed for this service");
  return repository.create(input);
}

export async function updateJobStatus(repository:JobRepository,id:string,status:JobStatus){return repository.update(id,{status});}
