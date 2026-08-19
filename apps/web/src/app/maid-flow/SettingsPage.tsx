import { Bot, ChevronRight, Plug, ShieldCheck, SlidersHorizontal, UsersRound, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  { title: "Company", description: "Business identity, locale, currency and operating preferences.", path: "/settings/company", icon: SlidersHorizontal },
  { title: "Team", description: "Staff members, roles and operational teams.", path: "/settings/team", icon: UsersRound },
  { title: "Services", description: "Service catalog, durations, allowed frequencies and add-ons.", path: "/settings/services", icon: Wrench },
  { title: "Automations", description: "Triggers, timing and message templates for repeatable customer workflows.", path: "/settings/automations", icon: Bot },
  { title: "Integrations", description: "Connected services, connection state and provider configuration.", path: "/settings/integrations", icon: Plug },
  { title: "Security", description: "Access control, roles and security preferences.", path: "/settings/security", icon: ShieldCheck },
] as const;

export function SettingsPage() {
  return <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="mx-auto w-full max-w-[1100px]"><div className="mb-6 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Maid Flow</span><ChevronRight className="h-3 w-3"/><span className="text-foreground/80">Settings</span></div><header className="border-b border-border pb-5"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">Administration</p><h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">Settings</h1><p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">Configuration for the company, workforce, operating catalog and connected services.</p></header><section className="divide-y divide-border pt-3">{sections.map(({title,description,path,icon:Icon})=><Link key={path} to={path} className="group flex min-h-20 items-center gap-4 px-1 py-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground"><Icon className="h-4 w-4"/></div><div className="min-w-0 flex-1"><div className="text-sm font-medium group-hover:text-primary">{title}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></Link>)}</section></div></main>;
}
