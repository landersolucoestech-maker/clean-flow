import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket, TicketUpdate } from "@/hooks/useSupportTickets";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type AdminTicket = SupportTicket & {
  company_settings: { trade_name: string | null; legal_name: string } | null;
};

export interface PlatformAdmin {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, JsonValue>;
  ip_address: string | null;
  created_at: string;
}

export interface CompanyWithStats {
  id: string;
  legal_name: string;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  // Stats
  customers_count?: number;
  jobs_count?: number;
  staff_count?: number;
}

export function usePlatformAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all companies (tenants)
  const companiesQuery = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyWithStats[];
    },
  });

  // Fetch platform admins
  const adminsQuery = useQuery({
    queryKey: ["platform-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlatformAdmin[];
    },
  });

  // Fetch platform logs
  const logsQuery = useQuery({
    queryKey: ["platform-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as PlatformLog[];
    },
  });

  // Fetch global stats
  const statsQuery = useQuery({
    queryKey: ["admin-global-stats"],
    queryFn: async () => {
      const [companies, customers, jobs, invoices, tickets] = await Promise.all([
        supabase.from("company_settings").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalCompanies: companies.count || 0,
        totalCustomers: customers.count || 0,
        totalJobs: jobs.count || 0,
        totalInvoices: invoices.count || 0,
        totalTickets: tickets.count || 0,
      };
    },
  });

  // Fetch all support tickets (for admin support view)
  const allTicketsQuery = useQuery({
    queryKey: ["admin-all-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, company_settings(trade_name, legal_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminTicket[];
    },
  });

  // Create platform log
  const logActionMutation = useMutation({
    mutationFn: async (logData: {
      action: string;
      entity_type: string;
      entity_id?: string;
      details?: Record<string, JsonValue>;
    }) => {
      const { error } = await supabase.from("platform_logs").insert([{
        action: logData.action,
        entity_type: logData.entity_type,
        entity_id: logData.entity_id,
        details: logData.details || {},
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-logs"] });
    },
  });

  // Update company status
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ companyId, updates }: { companyId: string; updates: Partial<CompanyWithStats> }) => {
      const { error } = await supabase
        .from("company_settings")
        .update(updates)
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast({
        title: "Empresa atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a empresa.",
        variant: "destructive",
      });
    },
  });

  // Update ticket (admin reply, status change)
  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: string; updates: TicketUpdate }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-tickets"] });
      toast({
        title: "Ticket atualizado",
        description: "O ticket foi atualizado com sucesso.",
      });
    },
  });

  // Add staff reply to ticket
  const addStaffReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { error } = await supabase.from("support_ticket_messages").insert([{
        ticket_id: ticketId,
        is_staff_reply: true,
        message,
      }]);

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      await supabase
        .from("support_tickets")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", ticketId)
        .eq("status", "open");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-messages"] });
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada ao cliente.",
      });
    },
  });

  return {
    // Companies
    companies: companiesQuery.data || [],
    isLoadingCompanies: companiesQuery.isLoading,
    updateCompany: updateCompanyMutation.mutate,
    
    // Admins
    admins: adminsQuery.data || [],
    isLoadingAdmins: adminsQuery.isLoading,
    
    // Logs
    logs: logsQuery.data || [],
    isLoadingLogs: logsQuery.isLoading,
    logAction: logActionMutation.mutate,
    
    // Stats
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    
    // Tickets
    allTickets: allTicketsQuery.data || [],
    isLoadingTickets: allTicketsQuery.isLoading,
    updateTicket: updateTicketMutation.mutate,
    addStaffReply: addStaffReplyMutation.mutate,
  };
}
