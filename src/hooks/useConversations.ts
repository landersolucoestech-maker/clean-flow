import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread: boolean;
  favorite: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  staff?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    team: string | null;
  } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
}

// Realtime subscription hook for conversations with optional new message callback
function useConversationsRealtime(onUpdate: () => void, onNewMessage?: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          onUpdate();
          // Play sound for updates (new messages update conversations)
          if (payload.eventType === "UPDATE" && onNewMessage) {
            const newData = payload.new as { unread?: boolean };
            if (newData?.unread) {
              onNewMessage();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate, onNewMessage]);
}

// Fetch all customer conversations with customer info and realtime updates
export function useConversations(onNewMessage?: () => void) {
  const queryClient = useQueryClient();

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);

  // Set up realtime subscription with optional sound callback
  useConversationsRealtime(invalidateConversations, onNewMessage);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          customer:customers(id, name, email, phone)
        `)
        .eq("archived", false)
        .not("customer_id", "is", null)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });
}

// Fetch all team conversations with staff info and realtime updates
export function useTeamConversations(onNewMessage?: () => void) {
  const queryClient = useQueryClient();

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
  }, [queryClient]);

  // Set up realtime subscription with optional sound callback
  useConversationsRealtime(invalidateConversations, onNewMessage);

  return useQuery({
    queryKey: ["team-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          staff:staff(id, name, email, phone, team)
        `)
        .eq("archived", false)
        .not("staff_id", "is", null)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });
}

// Realtime subscription hook for messages
function useMessagesRealtime(conversationId: string | null, onUpdate: () => void) {
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, onUpdate]);
}

// Fetch messages for a conversation with realtime updates
export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const invalidateMessages = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
  }, [queryClient, conversationId]);

  // Set up realtime subscription for messages
  useMessagesRealtime(conversationId, invalidateMessages);

  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
}

// Create a new conversation (customer or team)
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { customer_id?: string; staff_id?: string }) => {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return conversation;
    },
    onSuccess: (_, variables) => {
      if (variables.staff_id) {
        queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
  });
}

// Send a message (saves locally and sends via RingCentral)
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      conversation_id: string; 
      content: string; 
      sender_type?: string;
      attachment_url?: string | null;
    }) => {
      // First, get the conversation to find the customer or staff phone
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select(`
          id,
          customer_id,
          staff_id,
          customer:customers(id, phone, phone2),
          staff:staff(id, phone)
        `)
        .eq("id", data.conversation_id)
        .single();

      if (convError) throw convError;

      // Save message to local database
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: data.conversation_id,
          content: data.content,
          sender_type: data.sender_type || "user",
          attachment_url: data.attachment_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: data.content || (data.attachment_url ? '📎 Attachment' : ''),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", data.conversation_id);

      // Get phone number from customer or staff
      const customer = conversation?.customer as { id: string; phone: string | null; phone2: string | null } | null;
      const staff = conversation?.staff as { id: string; phone: string | null } | null;
      const phoneNumber = customer?.phone || customer?.phone2 || staff?.phone;

      if (phoneNumber) {
        try {
          // Get company_id from company_settings
          const { data: companySettings } = await supabase
            .from("company_settings")
            .select("id")
            .limit(1)
            .single();

          if (companySettings?.id) {
            const response = await supabase.functions.invoke("ringcentral-send-message", {
              body: {
                company_id: companySettings.id,
                to_phone: phoneNumber,
                message: data.content,
                attachment_url: data.attachment_url,
              },
            });

            if (response.error) {
              console.error("RingCentral send error:", response.error);
              // Don't throw - message is saved locally even if RC fails
            }
          }
        } catch (rcError) {
          console.error("Failed to send via RingCentral:", rcError);
          // Don't throw - message is saved locally even if RC fails
        }
      }

      return { message, isTeamConversation: !!conversation?.staff_id };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
    },
  });
}

// Toggle favorite
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ favorite })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Mark as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ unread: false })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Delete conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
