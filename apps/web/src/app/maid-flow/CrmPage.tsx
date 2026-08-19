import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ContactsPage } from "./ContactsPage";
import { CustomersPage } from "./CustomersPage";
import { LeadsPage } from "./LeadsPage";

type CrmTab="customers"|"contacts"|"leads";
const tabs:readonly {id:CrmTab;label:string}[]=[
  {id:"customers",label:"Customers"},
  {id:"contacts",label:"Contacts"},
  {id:"leads",label:"Leads"},
];

export function CrmPage(){
  const[params,setParams]=useSearchParams();
  const active=useMemo<CrmTab>(()=>{const value=params.get("tab");return value==="contacts"||value==="leads"?value:"customers"},[params]);
  function select(tab:CrmTab){setParams(tab==="customers"?{}:{tab});}
  return <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="mx-auto w-full max-w-[1500px]">
    <div className="mb-6 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Maid Flow</span><ChevronRight className="h-3 w-3"/><span className="text-foreground/80">CRM</span></div>
    <header className="border-b border-border pb-0"><div className="pb-5"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Workspace</p><h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">CRM</h1><p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">Customers, contacts and sales opportunities in one operational workspace.</p></div><nav className="flex gap-5 overflow-x-auto" aria-label="CRM sections">{tabs.map((tab)=><button type="button" key={tab.id} onClick={()=>select(tab.id)} aria-current={active===tab.id?"page":undefined} className={`relative h-10 whitespace-nowrap text-xs font-semibold ${active===tab.id?"text-foreground":"text-muted-foreground hover:text-foreground"}`}>{tab.label}{active===tab.id&&<span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"/>}</button>)}</nav></header>
    <div className="pt-5">{active==="customers"?<CustomersPage/>:active==="contacts"?<ContactsPage/>:<LeadsPage/>}</div>
  </div></main>;
}
