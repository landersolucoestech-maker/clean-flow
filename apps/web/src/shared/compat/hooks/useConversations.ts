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
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
  staff?: { id: string; name: string; email: string | null; phone: string | null; team: string | null } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
  delivery_status?: "pending" | "sent" | "failed" | "received";
  delivery_error?: string | null;
  delivery_attempts?: number;
  ringcentral_message_id?: string | null;
}

function useConversationsRealtime(onUpdate: () => void, onNewMessage?: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, (payload) => {
        onUpdate();
        if (payload.eventType === "UPDATE" && onNewMessage) {
          const next = payload.new as { unread?: boolean };
          if (next?.unread) onNewMessage();
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [onUpdate, onNewMessage]);
}

export function useConversations(onNewMessage?: () => void) {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);
  useConversationsRealtime(invalidate, onNewMessage);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, customer:customers(id, name, email, phone)")
        .eq("archived", false)
        .not("customer_id", "is", null)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useTeamConversations(onNewMessage?: () => void) {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
  }, [queryClient]);
  useConversationsRealtime(invalidate, onNewMessage);

  return useQuery({
    queryKey: ["team-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, staff:staff(id, name, email, phone, team)")
        .eq("archived", false)
        .not("staff_id", "is", null)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });
}

function useMessagesRealtime(conversationId: string | null, onUpdate: () => void) {
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, onUpdate)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, onUpdate]);
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    if (conversationId) queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
  }, [queryClient, conversationId]);
  useMessagesRealtime(conversationId, invalidate);

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
      return data as unknown as Message[];
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { customer_id?: string; staff_id?: string }) => {
      const { data: conversation, error } = await supabase.from("conversations").insert(data).select().single();
      if (error) throw error;
      return conversation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.staff_id ? "team-conversations" : "conversations"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      conversation_id: string;
      content: string;
      sender_type?: string;
      attachment_url?: string | null;
    }) => {
      const { data: result, error } = await supabase.functions.invoke("send-conversation-message", {
        body: {
          conversation_id: data.conversation_id,
          content: data.content,
          attachment_url: data.attachment_url || null,
        },
      });
      if (error || !result?.success) {
        throw error || new Error(result?.error || "Message delivery failed");
      }
      return { message: result.message as Message, isTeamConversation: false };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) => {
      const { error } = await supabase.from("conversations").update({ favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.from("conversations").update({ unread: false }).eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conversations").update({ archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["team-conversations"] });
    },
  });
}
