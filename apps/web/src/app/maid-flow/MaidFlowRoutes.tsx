import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CrmPage } from "./CrmPage";
import { JobExecutionPage } from "./JobExecutionPage";
import { SchedulePage } from "./SchedulePage";
import { ServiceCatalogPage } from "./ServiceCatalogPage";
import { SettingsPage } from "./SettingsPage";
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
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/team" element={<WorkforcePage />} />
      <Route path="/settings/services" element={<ServiceCatalogPage />} />
      <Route path="*" element={fallback} />
    </Routes>
  );
}
