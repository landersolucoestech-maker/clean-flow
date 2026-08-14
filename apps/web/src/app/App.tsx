import { lazy, Suspense } from "react";
import { Toaster } from "../shared/components/ui/toaster";
import { Toaster as Sonner } from "../shared/components/ui/sonner";
import { TooltipProvider } from "../shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./providers/LanguageContext";
import { QuickBooksSyncProvider } from "../modules/billing/providers/QuickBooksSyncProvider";
import { AuthenticatedRoute, PlatformAdminRoute } from "../modules/auth/RouteGuards";

const HomePage = lazy(() => import("./HomePage"));
const Auth = lazy(() => import("../modules/auth/AuthPage").then(({ Auth }) => ({ default: Auth })));
const Customers = lazy(() => import("../modules/crm/customers/CustomersPage").then(({ Customers }) => ({ default: Customers })));
const Leads = lazy(() => import("../modules/crm/leads/LeadsPage").then(({ Leads }) => ({ default: Leads })));
const Contacts = lazy(() => import("../modules/crm/contacts/ContactsPage").then(({ Contacts }) => ({ default: Contacts })));
const Schedule = lazy(() => import("../modules/schedule/SchedulePage").then(({ Schedule }) => ({ default: Schedule })));
const Billing = lazy(() => import("../modules/billing/BillingPage").then(({ Billing }) => ({ default: Billing })));
const Transactions = lazy(() => import("../modules/transactions/TransactionsPage").then(({ Transactions }) => ({ default: Transactions })));
const Communications = lazy(() => import("../modules/communications/CommunicationsPage").then(({ Communications }) => ({ default: Communications })));
const Rules = lazy(() => import("../modules/transactions/RulesPage").then(({ Rules }) => ({ default: Rules })));
const Reports = lazy(() => import("../modules/reports/ReportsPage").then(({ Reports }) => ({ default: Reports })));
const Settings = lazy(() => import("../modules/settings/SettingsPage").then(({ Settings }) => ({ default: Settings })));
const Support = lazy(() => import("../modules/support/SupportPage").then(({ Support }) => ({ default: Support })));
const Payroll = lazy(() => import("../modules/payroll/PayrollPage").then(({ Payroll }) => ({ default: Payroll })));
const SyncLogs = lazy(() => import("../modules/settings/SyncLogsPage").then(({ SyncLogs }) => ({ default: SyncLogs })));
const AdminDashboard = lazy(() => import("../modules/admin/pages/AdminDashboard").then(({ AdminDashboard }) => ({ default: AdminDashboard })));
const AdminClients = lazy(() => import("../modules/admin/pages/AdminClients").then(({ AdminClients }) => ({ default: AdminClients })));
const AdminAuth = lazy(() => import("../modules/admin/pages/AdminAuth").then(({ AdminAuth }) => ({ default: AdminAuth })));
const AdminLogs = lazy(() => import("../modules/admin/pages/AdminLogs").then(({ AdminLogs }) => ({ default: AdminLogs })));
const AdminSupport = lazy(() => import("../modules/admin/pages/AdminSupport").then(({ AdminSupport }) => ({ default: AdminSupport })));
const RingCentralCallback = lazy(() => import("../modules/communications/RingCentralCallbackPage"));
const DialpadCallback = lazy(() => import("../modules/communications/DialpadCallbackPage"));
const GoogleCallback = lazy(() => import("../modules/settings/GoogleCallbackPage"));
const NotFound = lazy(() => import("./NotFoundPage"));
const Setup = lazy(() => import("../modules/auth/SetupPage").then(({ Setup }) => ({ default: Setup })));
const SetPassword = lazy(() => import("../modules/auth/SetPasswordPage").then(({ SetPassword }) => ({ default: SetPassword })));

const queryClient = new QueryClient();
const OPERATIONAL_ROLES = ["admin", "office_manager", "cleaning_manager", "virtual_assistant"] as const;
const FINANCE_ROLES = ["admin", "office_manager"] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <QuickBooksSyncProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>}>
              <Routes>
                <Route path="/" element={<AuthenticatedRoute><HomePage /></AuthenticatedRoute>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/setup" element={<AuthenticatedRoute allowUnconfigured><Setup /></AuthenticatedRoute>} />
                <Route path="/set-password" element={<AuthenticatedRoute><SetPassword /></AuthenticatedRoute>} />
                <Route path="/schedule" element={<AuthenticatedRoute><Schedule /></AuthenticatedRoute>} />

                <Route path="/crm" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Navigate to="/crm/customers" replace /></AuthenticatedRoute>} />
                <Route path="/crm/customers" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Customers /></AuthenticatedRoute>} />
                <Route path="/crm/leads" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Leads /></AuthenticatedRoute>} />
                <Route path="/crm/contacts" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Contacts /></AuthenticatedRoute>} />
                <Route path="/customers" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Navigate to="/crm/customers" replace /></AuthenticatedRoute>} />
                <Route path="/leads" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Navigate to="/crm/leads" replace /></AuthenticatedRoute>} />

                <Route path="/invoices" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Billing /></AuthenticatedRoute>} />
                <Route path="/transactions" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Transactions /></AuthenticatedRoute>} />
                <Route path="/rules" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Rules /></AuthenticatedRoute>} />
                <Route path="/communications" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Communications /></AuthenticatedRoute>} />
                <Route path="/reports" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Reports /></AuthenticatedRoute>} />
                <Route path="/settings" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
                <Route path="/integrations" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Settings /></AuthenticatedRoute>} />
                <Route path="/payroll" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><Payroll /></AuthenticatedRoute>} />
                <Route path="/support" element={<AuthenticatedRoute><Support /></AuthenticatedRoute>} />
                <Route path="/admin" element={<PlatformAdminRoute><AdminDashboard /></PlatformAdminRoute>} />
                <Route path="/admin/clients" element={<PlatformAdminRoute><AdminClients /></PlatformAdminRoute>} />
                <Route path="/admin/auth" element={<AdminAuth />} />
                <Route path="/admin/logs" element={<PlatformAdminRoute><AdminLogs /></PlatformAdminRoute>} />
                <Route path="/admin/support" element={<PlatformAdminRoute><AdminSupport /></PlatformAdminRoute>} />
                <Route path="/sync-logs" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><SyncLogs /></AuthenticatedRoute>} />
                <Route path="/integrations/ringcentral/callback" element={<RingCentralCallback />} />
                <Route path="/integrations/dialpad/callback" element={<DialpadCallback />} />
                <Route path="/integrations/google/callback" element={<GoogleCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QuickBooksSyncProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
