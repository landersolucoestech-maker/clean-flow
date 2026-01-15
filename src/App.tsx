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
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/invoices" element={<Billing />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/integrations" element={<Settings />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/support" element={<Support />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/subscription" element={<AdminSubscription />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              
              <Route path="/leads" element={<Leads />} />
              <Route path="/sync-logs" element={<SyncLogs />} />
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
