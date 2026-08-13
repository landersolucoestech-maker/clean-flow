import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QuickBooksSyncProvider } from "@/components/providers/QuickBooksSyncProvider";
import { AuthenticatedRoute, PlatformAdminRoute } from "../modules/auth/RouteGuards";

const HomePage = lazy(() => import("./HomePage"));
const Auth = lazy(() => import("@/pages/Auth").then(({ Auth }) => ({ default: Auth })));
const Customers = lazy(() => import("@/pages/Customers").then(({ Customers }) => ({ default: Customers })));
const Schedule = lazy(() => import("@/pages/Schedule").then(({ Schedule }) => ({ default: Schedule })));
const Billing = lazy(() => import("@/pages/Billing").then(({ Billing }) => ({ default: Billing })));
const Transactions = lazy(() => import("@/pages/Transactions").then(({ Transactions }) => ({ default: Transactions })));
const Leads = lazy(() => import("@/pages/Leads").then(({ Leads }) => ({ default: Leads })));
const Communications = lazy(() => import("@/pages/Communications").then(({ Communications }) => ({ default: Communications })));
const Rules = lazy(() => import("@/pages/Rules").then(({ Rules }) => ({ default: Rules })));
const Reports = lazy(() => import("@/pages/Reports").then(({ Reports }) => ({ default: Reports })));
const Settings = lazy(() => import("@/pages/Settings").then(({ Settings }) => ({ default: Settings })));
const Support = lazy(() => import("@/pages/Support").then(({ Support }) => ({ default: Support })));
const Payroll = lazy(() => import("@/pages/Payroll").then(({ Payroll }) => ({ default: Payroll })));
const SyncLogs = lazy(() => import("@/pages/SyncLogs").then(({ SyncLogs }) => ({ default: SyncLogs })));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then(({ AdminDashboard }) => ({ default: AdminDashboard })));
const AdminClients = lazy(() => import("@/pages/admin/AdminClients").then(({ AdminClients }) => ({ default: AdminClients })));
const AdminAuth = lazy(() => import("@/pages/admin/AdminAuth").then(({ AdminAuth }) => ({ default: AdminAuth })));
const AdminLogs = lazy(() => import("@/pages/admin/AdminLogs").then(({ AdminLogs }) => ({ default: AdminLogs })));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport").then(({ AdminSupport }) => ({ default: AdminSupport })));
const RingCentralCallback = lazy(() => import("@/pages/RingCentralCallback"));
const GoogleCallback = lazy(() => import("@/pages/GoogleCallback"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Setup = lazy(() => import("@/pages/Setup").then(({ Setup }) => ({ default: Setup })));
const SetPassword = lazy(() => import("@/pages/SetPassword").then(({ SetPassword }) => ({ default: SetPassword })));

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
                <Route path="/customers" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Customers /></AuthenticatedRoute>} />
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
                <Route path="/leads" element={<AuthenticatedRoute allowedRoles={OPERATIONAL_ROLES}><Leads /></AuthenticatedRoute>} />
                <Route path="/sync-logs" element={<AuthenticatedRoute allowedRoles={FINANCE_ROLES}><SyncLogs /></AuthenticatedRoute>} />
                <Route path="/integrations/ringcentral/callback" element={<RingCentralCallback />} />
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
