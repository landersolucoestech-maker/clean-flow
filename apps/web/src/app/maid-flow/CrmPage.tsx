import { ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ContactsPage } from "./ContactsPage";
import { CustomersPage } from "./CustomersPage";
import { LeadsPage } from "./LeadsPage";

type CrmTab = "customers" | "contacts" | "leads";

const tabs: readonly { id: CrmTab; label: string; description: string }[] = [
  { id: "customers", label: "Customers", description: "Active service relationships and customer accounts." },
  { id: "contacts", label: "Contacts", description: "People and businesses known to the company." },
  { id: "leads", label: "Leads", description: "Sales opportunities that have not yet become customers." },
];

function resolveTab(value: string | null): CrmTab {
  return value === "contacts" || value === "leads" ? value : "customers";
}

export function CrmPage() {
  const [params, setParams] = useSearchParams();
  const active = resolveTab(params.get("tab"));
  const activeTab = tabs.find((tab) => tab.id === active)!;

  function select(tab: CrmTab) {
    setParams(tab === "customers" ? {} : { tab });
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Maid Flow</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/80">CRM</span>
        </div>

        <header className="border-b border-border">
          <div className="pb-5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">CRM</p>
            <h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">Customer relationship management</h1>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-muted-foreground">
              Manage customers, contacts and leads from one workspace. These are sections of the same CRM page, not separate application modules.
            </p>
          </div>

          <div className="flex min-w-0 items-end justify-between gap-4">
            <div role="tablist" aria-label="CRM sections" className="flex min-w-0 gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`crm-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.id}
                  aria-controls={`crm-panel-${tab.id}`}
                  onClick={() => select(tab.id)}
                  className={`relative h-11 whitespace-nowrap text-xs font-semibold transition-colors ${
                    active === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {active === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                </button>
              ))}
            </div>
            <p className="hidden pb-3 text-[11px] text-muted-foreground xl:block">{activeTab.description}</p>
          </div>
        </header>

        <section
          id={`crm-panel-${active}`}
          role="tabpanel"
          aria-labelledby={`crm-tab-${active}`}
          className="pt-5"
        >
          {active === "customers" ? <CustomersPage /> : active === "contacts" ? <ContactsPage /> : <LeadsPage />}
        </section>
      </div>
    </main>
  );
}
