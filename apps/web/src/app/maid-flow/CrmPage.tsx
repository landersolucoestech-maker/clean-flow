import { useSearchParams } from "react-router-dom";
import { ContactsPage } from "./ContactsPage";
import { CustomersPage } from "./CustomersPage";
import { LeadsPage } from "./LeadsPage";

type CrmTab = "customers" | "contacts" | "leads";

const tabs: readonly { id: CrmTab; label: string }[] = [
  { id: "customers", label: "Customers" },
  { id: "contacts", label: "Contacts" },
  { id: "leads", label: "Leads" },
];

function resolveTab(value: string | null): CrmTab {
  return value === "contacts" || value === "leads" ? value : "customers";
}

export function CrmPage() {
  const [params, setParams] = useSearchParams();
  const active = resolveTab(params.get("tab"));

  function select(tab: CrmTab) {
    setParams(tab === "customers" ? {} : { tab }, { replace: true });
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="border-b border-border">
          <div className="pb-5">
            <h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">CRM</h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">
              Manage customer accounts, contacts and sales leads in one workspace.
            </p>
          </div>

          <nav className="flex min-w-0 gap-7 overflow-x-auto" role="tablist" aria-label="CRM">
            {tabs.map((tab) => {
              const selected = active === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`crm-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`crm-panel-${tab.id}`}
                  onClick={() => select(tab.id)}
                  className={`relative h-11 whitespace-nowrap text-[13px] font-semibold transition-colors ${
                    selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {selected ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
                </button>
              );
            })}
          </nav>
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
