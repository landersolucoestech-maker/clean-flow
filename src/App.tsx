import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QuickBooksSyncProvider } from "@/components/providers/QuickBooksSyncProvider";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import { Customers } from "./pages/Customers";
import { Schedule } from "./pages/Schedule";
import { Billing } from "./pages/Billing";
import { Transactions } from "./pages/Transactions";
import { Leads } from "./pages/Leads";
import { Communications } from "./pages/Communications";
import { Rules } from "./pages/Rules";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Support } from "./pages/Support";
import {
  AdminDashboard,
  AdminClients,
  AdminAuth,
  AdminLogs,
  AdminSettings,
  AdminSubscription,
  AdminSupport,
} from "./pages/admin";

import { Payroll } from "./pages/Payroll";

import { SyncLogs } from "./pages/SyncLogs";
import RingCentralCallback from "./pages/RingCentralCallback";
import GoogleCallback from "./pages/GoogleCallback";
import NotFound from "./pages/NotFound";
import { AuthenticatedRoute, PlatformAdminRoute } from "@/components/auth/RouteGuards";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <QuickBooksSyncProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthenticatedRoute><Index /></AuthenticatedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/schedule" element={<AuthenticatedRoute><Schedule /></AuthenticatedRoute>} />
              <Route path="/customers" element={<AuthenticatedRoute><Customers /></AuthenticatedRoute>} />
              <Route path="/invoices" element={<AuthenticatedRoute><Billing /></AuthenticatedRoute>} />
              <Route path="/transactions" element={<AuthenticatedRoute><Transactions /></AuthenticatedRoute>} />
              <Route path="/rules" element={<AuthenticatedRoute><Rules /></AuthenticatedRoute>} />
              <Route path="/communications" element={<AuthenticatedRoute><Communications /></AuthenticatedRoute>} />
              <Route path="/reports" element={<AuthenticatedRoute><Reports /></AuthenticatedRoute>} />
              <Route path="/settings" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
              <Route path="/integrations" element={<AuthenticatedRoute><Settings /></AuthenticatedRoute>} />
              <Route path="/payroll" element={<AuthenticatedRoute><Payroll /></AuthenticatedRoute>} />
              <Route path="/support" element={<AuthenticatedRoute><Support /></AuthenticatedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<PlatformAdminRoute><AdminDashboard /></PlatformAdminRoute>} />
              <Route path="/admin/clients" element={<PlatformAdminRoute><AdminClients /></PlatformAdminRoute>} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route path="/admin/logs" element={<PlatformAdminRoute><AdminLogs /></PlatformAdminRoute>} />
              <Route path="/admin/settings" element={<PlatformAdminRoute><AdminSettings /></PlatformAdminRoute>} />
              <Route path="/admin/subscription" element={<PlatformAdminRoute><AdminSubscription /></PlatformAdminRoute>} />
              <Route path="/admin/support" element={<PlatformAdminRoute><AdminSupport /></PlatformAdminRoute>} />
              
              <Route path="/leads" element={<AuthenticatedRoute><Leads /></AuthenticatedRoute>} />
              <Route path="/sync-logs" element={<AuthenticatedRoute><SyncLogs /></AuthenticatedRoute>} />
              <Route path="/integrations/ringcentral/callback" element={<RingCentralCallback />} />
              <Route path="/integrations/google/callback" element={<GoogleCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QuickBooksSyncProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
