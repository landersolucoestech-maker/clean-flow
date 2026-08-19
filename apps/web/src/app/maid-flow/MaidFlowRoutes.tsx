import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AutomationsPage } from "./AutomationsPage";
import { CommunicationsPage } from "./CommunicationsPage";
import { CrmPage } from "./CrmPage";
import { InvoicesPage } from "./InvoicesPage";
import { JobExecutionPage } from "./JobExecutionPage";
import { PaymentsPage } from "./PaymentsPage";
import { PayrollPage } from "./PayrollPage";
import { SchedulePage } from "./SchedulePage";
import { ServiceCatalogPage } from "./ServiceCatalogPage";
import { SettingsPage } from "./SettingsPage";
import { TransactionsPage } from "./TransactionsPage";
import { WorkforcePage } from "./WorkforcePage";

export function MaidFlowRoutes({ fallback }: { fallback: ReactNode }) {
  return (
    <Routes>
      <Route path="/crm" element={<CrmPage />} />
      <Route path="/crm/customers" element={<Navigate replace to="/crm" />} />
      <Route path="/crm/contacts" element={<Navigate replace to="/crm?tab=contacts" />} />
      <Route path="/crm/leads" element={<Navigate replace to="/crm?tab=leads" />} />
      <Route path="/operations/schedule" element={<SchedulePage />} />
      <Route path="/operations/schedule/:jobId" element={<JobExecutionPage />} />
      <Route path="/communications/inbox" element={<CommunicationsPage />} />
      <Route path="/finance/invoices" element={<InvoicesPage />} />
      <Route path="/finance/payments" element={<PaymentsPage />} />
      <Route path="/finance/transactions" element={<TransactionsPage />} />
      <Route path="/finance/payroll" element={<PayrollPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/team" element={<WorkforcePage />} />
      <Route path="/settings/services" element={<ServiceCatalogPage />} />
      <Route path="/settings/automations" element={<AutomationsPage />} />
      <Route path="*" element={fallback} />
    </Routes>
  );
}
