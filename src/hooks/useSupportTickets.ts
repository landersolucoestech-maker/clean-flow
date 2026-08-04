import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "billing" | "technical" | "feature_request" | "general" | "account" | "integration";
export type TicketUpdate = Partial<Pick<SupportTicket, "status" | "assigned_to" | "resolved_at" | "closed_at" | "updated_at">>;

export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string | null;
  is_staff_reply: boolean;
  message: string;
  attachments: unknown[];
  created_at: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}

export interface CreateMessageData {
  ticket_id: string;
  message: string;
}

export function useSupportTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get company ID (single-tenant fallback for now)
  const getCompanyId = async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("id")
      .limit(1)
      .single();
    return data?.id;
  };

  // Fetch all tickets for the company
  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const companyId = await getCompanyId();
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  // Fetch messages for a specific ticket
  const useTicketMessages = (ticketId: string | null) => {
    return useQuery({
      queryKey: ["ticket-messages", ticketId],
      queryFn: async () => {
        if (!ticketId) return [];

        const { data, error } = await supabase
          .from("support_ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return data as TicketMessage[];
      },
      enabled: !!ticketId,
    });
  };

  // Create a new ticket
  const createTicketMutation = useMutation({
    mutationFn: async (data: CreateTicketData) => {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error("Company not found");

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert([{
          company_id: companyId,
          user_id: companyId, // Using company_id as user_id until auth is implemented
          ticket_number: "TEMP", // Will be overwritten by database trigger
          subject: data.subject,
          description: data.description,
          priority: data.priority,
          category: data.category,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create initial message
      await supabase.from("support_ticket_messages").insert([{
        ticket_id: ticket.id,
        user_id: companyId,
        is_staff_reply: false,
        message: data.description,
      }]);

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Ticket criado",
        description: "Seu ticket foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket.",
        variant: "destructive",
      });
      console.error("Error creating ticket:", error);
    },
  });

  // Add message to ticket
  const addMessageMutation = useMutation({
    mutationFn: async (data: CreateMessageData) => {
      const companyId = await getCompanyId();

      const { data: message, error } = await supabase
        .from("support_ticket_messages")
        .insert([{
          ticket_id: data.ticket_id,
          user_id: companyId,
          is_staff_reply: false,
          message: data.message,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update ticket timestamp
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.ticket_id);

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
      console.error("Error adding message:", error);
    },
  });

  // Update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const updates: TicketUpdate = { status };
      
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      } else if (status === "closed") {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({
        title: "Status atualizado",
        description: "O status do ticket foi atualizado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    },
  });

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    error: ticketsQuery.error,
    useTicketMessages,
    createTicket: createTicketMutation.mutate,
    isCreating: createTicketMutation.isPending,
    addMessage: addMessageMutation.mutate,
    isAddingMessage: addMessageMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}
