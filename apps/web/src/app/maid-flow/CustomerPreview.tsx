import { useEffect, useState } from "react";
import type { Customer } from "../../../../../packages/domain/crm";
import { MockCustomerRepository } from "../../../../../packages/data/mock-customer-repository";

const repository = new MockCustomerRepository([
  { id: "customer-1", primaryContactId: "contact-1", status: "active", createdAt: "2026-08-18T14:30:00.000Z" },
  { id: "customer-2", primaryContactId: "contact-2", status: "active", createdAt: "2026-08-16T10:15:00.000Z" },
]);

export function CustomerPreview() {
  const [customers, setCustomers] = useState<readonly Customer[]>([]);
  useEffect(() => { void repository.list().then(setCustomers); }, []);
  return (
    <section className="py-6" aria-labelledby="customer-preview-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="customer-preview-title" className="text-sm font-semibold tracking-[-0.01em]">Customer workspace foundation</h2>
          <p className="mt-1 text-xs text-muted-foreground">Frontend-only data adapter proving the replaceable repository boundary.</p>
        </div>
        <button type="button" className="mf-focus-ring h-9 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">New customer</button>
      </div>
      <div className="overflow-hidden border border-border bg-card">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground">
            <tr><th className="px-4 py-2.5">Customer ID</th><th className="px-4 py-2.5">Primary contact</th><th className="px-4 py-2.5">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((customer) => <tr key={customer.id} className="h-11 hover:bg-muted/30"><td className="px-4 font-medium">{customer.id}</td><td className="px-4 text-muted-foreground">{customer.primaryContactId}</td><td className="px-4"><span className="rounded border border-border px-2 py-0.5 text-[11px] font-medium capitalize">{customer.status}</span></td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
