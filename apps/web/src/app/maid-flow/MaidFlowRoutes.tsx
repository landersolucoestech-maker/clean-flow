import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { ContactsPage } from "./ContactsPage";
import { CustomersPage } from "./CustomersPage";
import { LeadsPage } from "./LeadsPage";

export function MaidFlowRoutes({ fallback }: { fallback: ReactNode }) {
  return (
    <Routes>
      <Route path="/crm/contacts" element={<ContactsPage />} />
      <Route path="/crm/customers" element={<CustomersPage />} />
      <Route path="/crm/leads" element={<LeadsPage />} />
      <Route path="*" element={fallback} />
    </Routes>
  );
}
