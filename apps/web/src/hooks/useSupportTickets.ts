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

type RpcResult<T> = { data: T | null; error: unknown };

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const result = await supabase.rpc(name as never, args as never) as unknown as RpcResult<T>;
  if (result.error || !result.data) throw result.error || new Error(`${name} returned no data`);
  return result.data;
}

export function useSupportTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
  });

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

  const createTicketMutation = useMutation({
    mutationFn: async (data: CreateTicketData) => callRpc<SupportTicket>("create_support_ticket_atomic", {
      ticket_subject: data.subject,
      ticket_description: data.description,
      ticket_priority: data.priority,
      ticket_category: data.category,
    }),
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

  const addMessageMutation = useMutation({
    mutationFn: async (data: CreateMessageData) => callRpc<TicketMessage>("add_support_ticket_message_atomic", {
      target_ticket_id: data.ticket_id,
      message_body: data.message,
    }),
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
