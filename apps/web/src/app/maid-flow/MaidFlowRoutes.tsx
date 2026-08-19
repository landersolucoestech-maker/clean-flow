import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { AutomationsPage } from "./AutomationsPage";
import { CommunicationsPage } from "./CommunicationsPage";
import { CompanySettingsPage } from "./CompanySettingsPage";
import { CrmPage } from "./CrmPage";
import { DashboardPage } from "./DashboardPage";
import { IntegrationsPage } from "./IntegrationsPage";
import { InvoicesPage } from "./InvoicesPage";
import { PaymentsPage } from "./PaymentsPage";
import { PayrollPage } from "./PayrollPage";
import { PlatformPage } from "./PlatformPage";
import { ReportsPage } from "./ReportsPage";
import { SchedulePage } from "./SchedulePage";
import { ScheduledServicePage } from "./ScheduledServicePage";
import { SecuritySettingsPage } from "./SecuritySettingsPage";
import { ServiceCatalogPage } from "./ServiceCatalogPage";
import { SettingsPage } from "./SettingsPage";
import { SupportPage } from "./SupportPage";
import { TransactionsPage } from "./TransactionsPage";
import { WorkforcePage } from "./WorkforcePage";

export function MaidFlowRoutes({ fallback }: { fallback: ReactNode }) {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/crm" element={<CrmPage />} />
      <Route path="/operations/schedule" element={<SchedulePage />} />
      <Route path="/operations/schedule/:jobId" element={<ScheduledServicePage />} />
      <Route path="/communications/inbox" element={<CommunicationsPage />} />
      <Route path="/finance/invoices" element={<InvoicesPage />} />
      <Route path="/finance/payments" element={<PaymentsPage />} />
      <Route path="/finance/transactions" element={<TransactionsPage />} />
      <Route path="/finance/payroll" element={<PayrollPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/company" element={<CompanySettingsPage />} />
      <Route path="/settings/team" element={<WorkforcePage />} />
      <Route path="/settings/services" element={<ServiceCatalogPage />} />
      <Route path="/settings/automations" element={<AutomationsPage />} />
      <Route path="/settings/integrations" element={<IntegrationsPage />} />
      <Route path="/settings/security" element={<SecuritySettingsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/platform" element={<PlatformPage />} />
      <Route path="*" element={fallback} />
    </Routes>
  );
}
