import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { ContactsPage } from "./ContactsPage";
import { CustomersPage } from "./CustomersPage";
import { LeadsPage } from "./LeadsPage";
import { EstimatesPage } from "./EstimatesPage";
import { ServiceCatalogPage } from "./ServiceCatalogPage";
import { SettingsPage } from "./SettingsPage";
import { WorkforcePage } from "./WorkforcePage";

export function MaidFlowRoutes({ fallback }: { fallback: ReactNode }) {
  return (
    <Routes>
      <Route path="/crm/contacts" element={<ContactsPage />} />
      <Route path="/crm/customers" element={<CustomersPage />} />
      <Route path="/crm/leads" element={<LeadsPage />} />
      <Route path="/crm/estimates" element={<EstimatesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/team" element={<WorkforcePage />} />
      <Route path="/settings/services" element={<ServiceCatalogPage />} />
      <Route path="*" element={fallback} />
    </Routes>
  );
}
