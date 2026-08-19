import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin, Navigation, Play, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { Job, JobStatus } from "../../../../../packages/domain/job";
import { canTransitionJobStatus, updateJobStatus } from "../../../../../packages/application/job";
import { customerAccountFixtures } from "../../../../../packages/test-fixtures/customers";
import { serviceFixtures } from "../../../../../packages/test-fixtures/services";
import { staffFixtures, teamFixtures } from "../../../../../packages/test-fixtures/workforce";
import { maidFlowRepositories } from "./repositories";

const repository=maidFlowRepositories.jobs;
const money=(minor:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(minor/100);
const statusLabel=(status:JobStatus)=>status.replaceAll("_"," ");
const nextPrimary:Partial<Record<JobStatus,{status:JobStatus;label:string}>>={
  scheduled:{status:"on_the_way",label:"Mark on the way"},
  on_the_way:{status:"in_progress",label:"Start job"},
  in_progress:{status:"completed",label:"Complete job"},
};

export function JobExecutionPage(){
  const { jobId }=useParams();
  const [job,setJob]=useState<Job|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{let active=true;void repository.getById(jobId??"").then((row)=>{if(active){setJob(row);setLoading(false)}});return()=>{active=false}},[jobId]);

  const account=useMemo(()=>job?customerAccountFixtures.find((row)=>row.customer.id===job.customerId):undefined,[job]);
  const location=useMemo(()=>job?account?.locations.find((row)=>row.id===job.locationId):undefined,[account,job]);
  const service=useMemo(()=>job?serviceFixtures.find((row)=>row.id===job.serviceId):undefined,[job]);
  const assignment=useMemo(()=>{if(!job)return"";if(job.assignedTeamId)return teamFixtures.find((row)=>row.id===job.assignedTeamId)?.name??"Unknown team";return job.assignedStaffIds.map((id)=>staffFixtures.find((row)=>row.id===id)?.displayName??id).join(", ")||"Unassigned"},[job]);

  async function transition(next:JobStatus){if(!job||!canTransitionJobStatus(job.status,next))return;setSaving(true);setError(null);try{setJob(await updateJobStatus(repository,job.id,next))}catch(cause){setError(cause instanceof Error?cause.message:"Unable to update job")}finally{setSaving(false)}}

  if(loading)return <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1200px]"><div className="h-7 w-52 animate-pulse rounded bg-muted"/><div className="mt-6 h-64 animate-pulse rounded-md bg-muted"/></div></main>;
  if(!job)return <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1200px]"><Link to="/operations/jobs" className="inline-flex items-center gap-2 text-xs font-semibold text-primary"><ArrowLeft className="h-3.5 w-3.5"/>Back to jobs</Link><div className="mt-8 rounded-md border border-border bg-card p-8"><h1 className="text-xl font-semibold">Job not found</h1><p className="mt-2 text-sm text-muted-foreground">The requested job is not available in the current frontend dataset.</p></div></div></main>;

  const primary=nextPrimary[job.status];
  const address=location?`${location.street1}, ${location.city}, ${location.state} ${location.postalCode}`:"Unknown location";
  return <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="mx-auto w-full max-w-[1200px]">
    <div className="mb-6 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Maid Flow</span><ChevronRight className="h-3 w-3"/><span>Operations</span><ChevronRight className="h-3 w-3"/><Link to="/operations/jobs" className="hover:text-foreground">Jobs</Link><ChevronRight className="h-3 w-3"/><span className="text-foreground/80">Execution</span></div>
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"><div><Link to="/operations/jobs" className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5"/>Back to jobs</Link><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Job execution</p><h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">{account?.primaryContact.displayName??"Unknown customer"}</h1><p className="mt-1.5 text-[13px] text-muted-foreground">{service?.name??"Unknown service"} · {new Date(job.startsAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</p></div><span className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[11px] font-semibold capitalize">{statusLabel(job.status)}</span></header>

    <div className="grid gap-5 pt-5 lg:grid-cols-[1.35fr_.65fr]">
      <section className="space-y-5">
        <div className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Service details</h2></div><dl className="grid gap-5 p-5 sm:grid-cols-2"><div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Service</dt><dd className="mt-1 text-sm font-medium">{service?.name??"Unknown service"}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</dt><dd className="mt-1 text-sm font-medium">{job.durationMinutes} minutes</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Price</dt><dd className="mt-1 text-sm font-medium">{money(job.price.amountMinor)}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assignment</dt><dd className="mt-1 text-sm font-medium">{assignment}</dd></div></dl></div>
        <div className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Location</h2></div><div className="p-5"><div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted"><MapPin className="h-4 w-4"/></div><div><p className="text-sm font-semibold">{location?.name??"Service location"}</p><p className="mt-1 text-xs text-muted-foreground">{address}</p></div></div></div></div>
        <div className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Instructions</h2></div><div className="p-5"><p className="text-sm leading-6 text-foreground/85">{job.instructions||"No customer-facing instructions were added to this job."}</p>{job.internalNotes&&<div className="mt-4 border-t border-border pt-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</p><p className="mt-1.5 text-sm text-foreground/85">{job.internalNotes}</p></div>}</div></div>
      </section>

      <aside className="space-y-5"><div className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Execution</h2><p className="mt-1 text-[11px] text-muted-foreground">Advance the job only through valid operational states.</p></div><div className="space-y-3 p-5">{primary&&<button type="button" disabled={saving} onClick={()=>void transition(primary.status)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60">{job.status==="scheduled"?<Navigation className="h-4 w-4"/>:job.status==="on_the_way"?<Play className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}{saving?"Updating…":primary.label}</button>}{canTransitionJobStatus(job.status,"cancelled")&&job.status!=="cancelled"&&<button type="button" disabled={saving} onClick={()=>void transition("cancelled")} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-60"><XCircle className="h-3.5 w-3.5"/>Cancel job</button>}{(job.status==="completed"||job.status==="cancelled")&&<div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">This job is in a terminal state and cannot be reopened from the execution screen.</div>}{error&&<div role="alert" className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</div>}</div></div>
        <div className="rounded-md border border-border bg-card p-5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status path</p><ol className="mt-3 space-y-2 text-xs"><li className={job.status==="scheduled"?"font-semibold text-foreground":"text-muted-foreground"}>1. Scheduled</li><li className={job.status==="on_the_way"?"font-semibold text-foreground":"text-muted-foreground"}>2. On the way</li><li className={job.status==="in_progress"?"font-semibold text-foreground":"text-muted-foreground"}>3. In progress</li><li className={job.status==="completed"?"font-semibold text-foreground":"text-muted-foreground"}>4. Completed</li></ol></div>
      </aside>
    </div>
  </div></main>;
}
