import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  synced_conversations: number;
  synced_messages: number;
  skipped_no_customer: number;
  total_rc_messages: number;
}

export function useRingCentralSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();

  const getCompanyId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("company_settings")
      .select("id")
      .limit(1)
      .single();
    return data?.id || null;
  };

  const syncMessages = async (daysBack: number = 30) => {
    setIsSyncing(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) {
        toast.error("Company not configured");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("ringcentral-sync-messages", {
        body: {
          company_id: companyId,
          days_back: daysBack,
        },
      });

      if (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync messages");
        return null;
      }

      if (data.error) {
        toast.error(data.error);
        return null;
      }

      setLastSyncResult(data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });

      toast.success(
        `Synced ${data.synced_messages} messages from ${data.synced_conversations} conversations`
      );

      return data as SyncResult;
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync messages");
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncMessages,
    isSyncing,
    lastSyncResult,
  };
}
