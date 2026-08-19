import { useMemo, useState } from "react";
import { ChevronRight, Filter, MoreHorizontal, Plus, Search } from "lucide-react";
import type { Contact, ContactStatus } from "../../../../../packages/domain/crm";
import { MockContactRepository } from "../../../../../packages/data/mock-contact-repository";
import { contactFixtures } from "../../../../../packages/test-fixtures/contacts";

const repository = new MockContactRepository(contactFixtures);

type StatusFilter = "all" | ContactStatus;

function languageLabel(language: Contact["preferredLanguage"]) {
  return language === "pt" ? "Portuguese" : language === "es" ? "Spanish" : "English";
}

export function ContactsPage() {
  const [contacts] = useState<readonly Contact[]>(contactFixtures);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (status !== "all" && contact.status !== status) return false;
      if (!normalized) return true;
      return [contact.displayName, contact.email, contact.phone, contact.companyName, ...contact.tags]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [contacts, query, status]);

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-6 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Maid Flow</span><ChevronRight className="h-3 w-3" /><span>CRM</span><ChevronRight className="h-3 w-3" /><span className="text-foreground/80">Contacts</span>
        </div>

        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-primary">CRM</p>
            <h1 className="text-[26px] font-semibold tracking-[-0.035em] sm:text-[29px]">Contacts</h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted-foreground">People and businesses known to your operation, independent of their lead or customer status.</p>
          </div>
          <button type="button" className="mf-focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" />New contact
          </button>
        </header>

        <section className="pt-5" aria-label="Contact list">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input aria-label="Search contacts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or tag" className="mf-focus-ring h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 items-center rounded-md border border-border bg-card p-0.5" aria-label="Contact status filter">
                {(["active", "archived", "all"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`h-7 rounded px-2.5 text-[11px] font-medium capitalize transition-colors ${status === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{value}</button>)}
              </div>
              <button type="button" aria-label="More filters" className="mf-focus-ring grid h-9 w-9 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"><Filter className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="mb-2 text-[11px] text-muted-foreground">{filtered.length} {filtered.length === 1 ? "contact" : "contacts"}</div>

          <div className="overflow-x-auto border-y border-border bg-card sm:border sm:rounded-md">
            <table className="min-w-[880px] w-full text-left text-[13px]">
              <thead className="border-b border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground">
                <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Phone</th><th className="px-4 py-2.5">Language</th><th className="px-4 py-2.5">Tags</th><th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="group h-12 transition-colors hover:bg-muted/25">
                    <td className="px-4"><div className="font-medium text-foreground">{contact.displayName}</div>{contact.companyName && contact.kind === "person" ? <div className="mt-0.5 text-[11px] text-muted-foreground">{contact.companyName}</div> : null}</td>
                    <td className="px-4 text-muted-foreground capitalize">{contact.kind}</td>
                    <td className="px-4 text-muted-foreground">{contact.email ?? "—"}</td>
                    <td className="px-4 text-muted-foreground">{contact.phone ?? "—"}</td>
                    <td className="px-4 text-muted-foreground">{languageLabel(contact.preferredLanguage)}</td>
                    <td className="px-4"><div className="flex gap-1.5">{contact.tags.length ? contact.tags.map((tag) => <span key={tag} className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>) : <span className="text-muted-foreground">—</span>}</div></td>
                    <td className="px-2"><button type="button" aria-label={`Actions for ${contact.displayName}`} className="mf-focus-ring grid h-8 w-8 place-items-center rounded-md text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={7} className="px-4 py-14 text-center"><p className="text-sm font-medium">No contacts found</p><p className="mt-1 text-xs text-muted-foreground">Adjust your search or status filter.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

void repository;
