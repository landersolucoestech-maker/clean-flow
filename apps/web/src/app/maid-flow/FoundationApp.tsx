import { useMemo, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Bell, ChevronRight, Menu, Search, X } from "lucide-react";
import { allNavigationItems, navigationGroups } from "./navigation";
import { ContactsPage } from "./ContactsPage";

const placeholderCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/": {
    eyebrow: "Foundation preview",
    title: "Maid Flow",
    description: "The new frontend foundation is active. Functional modules will be rebuilt one at a time on top of this system.",
  },
  "/crm/customers": { eyebrow: "CRM", title: "Customers", description: "Customer accounts, service locations, preferences and relationship history." },
  "/crm/leads": { eyebrow: "CRM", title: "Leads", description: "Sales opportunities, qualification, activities and conversion workflow." },
  "/crm/estimates": { eyebrow: "CRM", title: "Estimates", description: "Structured service proposals separated from leads and customers." },
  "/operations/schedule": { eyebrow: "Operations", title: "Schedule", description: "Operational planning view for jobs, teams, availability and recurring work." },
  "/operations/jobs": { eyebrow: "Operations", title: "Jobs", description: "The operational source of truth for scheduled and completed cleaning work." },
  "/communications/inbox": { eyebrow: "Communications", title: "Inbox", description: "Customer and team conversations with delivery-aware messaging workflows." },
  "/finance/invoices": { eyebrow: "Finance", title: "Invoices", description: "Professional billing workflows, statuses and customer balances." },
  "/finance/payments": { eyebrow: "Finance", title: "Payments", description: "Payment records and reconciliation views independent from invoices." },
  "/finance/transactions": { eyebrow: "Finance", title: "Transactions", description: "Operational financial activity with clear categories and traceable origins." },
  "/finance/payroll": { eyebrow: "Finance", title: "Payroll", description: "Payroll runs, job allocations, adjustments and employee statements." },
  "/reports": { eyebrow: "Insights", title: "Reports", description: "Defined operational and financial metrics without artificial benchmark scoring." },
  "/settings": { eyebrow: "Administration", title: "Settings", description: "Company, team, services, notifications, automations and integration settings." },
  "/support": { eyebrow: "Help", title: "Support", description: "Product support and ticket workflows." },
  "/platform": { eyebrow: "Platform", title: "Platform administration", description: "Separate SaaS administration for companies, support and audit activity." },
};

function MaidFlowMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-[11px] font-semibold tracking-[-0.02em] text-white">MF</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-[-0.015em] text-white">Maid Flow</p>
        <p className="truncate text-[11px] text-slate-400">Operations workspace</p>
      </div>
    </div>
  );
}

function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <aside className={mobile ? "flex h-full w-full flex-col bg-[hsl(var(--sidebar-background))]" : "hidden h-screen w-[248px] shrink-0 flex-col bg-[hsl(var(--sidebar-background))] lg:flex"}>
      <div className="flex h-16 items-center border-b border-white/[0.07] px-4"><MaidFlowMark /></div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3" aria-label="Primary navigation">
        {navigationGroups.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className={index === 0 ? "" : "mt-5"}>
            {group.label && <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path} onClick={onNavigate} className={`group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${active ? "bg-white/[0.09] font-medium text-white" : "text-slate-300 hover:bg-white/[0.055] hover:text-white"}`}>
                    <Icon className={`h-[15px] w-[15px] ${active ? "text-emerald-300" : "text-slate-500 group-hover:text-slate-300"}`} strokeWidth={1.8} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.07] p-3">
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-white/[0.05]" type="button">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-700 text-[10px] font-semibold text-slate-100">AM</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-100">Admin preview</p><p className="truncate text-[10px] text-slate-500">Frontend persona</p></div>
        </button>
      </div>
    </aside>
  );
}

function PagePlaceholder() {
  const location = useLocation();
  const content = placeholderCopy[location.pathname] ?? placeholderCopy["/"];
  const current = allNavigationItems.find((item) => item.path === location.pathname);

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-6 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"><span>Maid Flow</span><ChevronRight className="h-3 w-3" /><span className="truncate text-foreground/80">{current?.label ?? "Foundation"}</span></div>
        <header className="border-b border-border pb-5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">{content.eyebrow}</p>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-foreground sm:text-[29px]">{content.title}</h1>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-muted-foreground">{content.description}</p>
        </header>
        <section className="py-8"><div className="max-w-4xl border-l-2 border-primary/35 pl-5"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Current phase</p><h2 className="mt-2 text-base font-semibold tracking-[-0.015em] text-foreground">Frontend foundation only</h2><p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">This route is intentionally a structural placeholder. Its functional module will be designed, implemented and validated independently before it becomes part of the finished product.</p></div></section>
      </div>
    </main>
  );
}

function ApplicationFrame() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const activeLabel = useMemo(() => allNavigationItems.find((item) => item.path === location.pathname)?.label ?? "Maid Flow", [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} type="button" /><div className="relative h-full w-[280px] max-w-[86vw] shadow-2xl"><button aria-label="Close navigation" className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)} type="button"><X className="h-4 w-4" /></button><Sidebar mobile onNavigate={() => setMobileOpen(false)} /></div></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button aria-label="Open navigation" className="mr-3 grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-muted-foreground lg:hidden" onClick={() => setMobileOpen(true)} type="button"><Menu className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium tracking-[-0.01em] text-foreground">{activeLabel}</p></div>
          <div className="flex items-center gap-1.5"><button aria-label="Search" className="hidden h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted sm:flex" type="button"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Search</span><kbd className="ml-2 hidden rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[9px] text-muted-foreground md:inline">⌘K</kbd></button><button aria-label="Notifications" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" type="button"><Bell className="h-[15px] w-[15px]" /></button></div>
        </header>
        <Routes><Route path="/crm/contacts" element={<ContactsPage />} /><Route path="*" element={<PagePlaceholder />} /></Routes>
      </div>
    </div>
  );
}

export function FoundationApp() {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  return <BrowserRouter basename={baseUrl || undefined}><ApplicationFrame /></BrowserRouter>;
}
