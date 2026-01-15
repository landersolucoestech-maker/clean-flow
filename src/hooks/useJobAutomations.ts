import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "./useCompanySettings";

export type AutomationTrigger = "on_our_way" | "started" | "finished";

interface TriggerAutomationParams {
  trigger: AutomationTrigger;
  customerId: string;
  customerPhone: string;
  customerName: string;
  jobDate?: string;
  jobTime?: string;
}

// Replace message variables with actual values
function replaceMessageVariables(
  message: string,
  params: {
    customerName: string;
    companyName: string;
    jobDate?: string;
    jobTime?: string;
  }
): string {
  return message
    .replace(/{ClientName}/g, params.customerName)
    .replace(/{CompanyName}/g, params.companyName)
    .replace(/{JobDate}/g, params.jobDate || "")
    .replace(/{JobTime}/g, params.jobTime || "");
}

// Hook to get automation config for a specific trigger
function useAutomationConfig(triggerType: string) {
  return useQuery({
    queryKey: ["automation-config", triggerType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("trigger_type", triggerType)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useJobAutomations() {
  const { data: companySettings } = useCompanySettings();

  return useMutation({
    mutationFn: async (params: TriggerAutomationParams) => {
      const { trigger, customerId, customerPhone, customerName, jobDate, jobTime } = params;

      // Get automation config from database
      const { data: automation, error: configError } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("trigger_type", trigger)
        .maybeSingle();

      if (configError) {
        console.error("Error fetching automation config:", configError);
        throw configError;
      }

      if (!automation || !automation.enabled) {
        console.log(`Automation for trigger "${trigger}" is disabled or not found`);
        return { sent: false, reason: "automation_disabled" };
      }

      if (!customerPhone) {
        console.log("No customer phone available for automation");
        return { sent: false, reason: "no_phone" };
      }

      const companyName = companySettings?.trade_name || companySettings?.legal_name || "Our Company";

      // Replace variables in the message
      const message = replaceMessageVariables(automation.message, {
        customerName,
        companyName,
        jobDate,
        jobTime,
      });

      // Get or create conversation
      let conversationId: string;
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({ customer_id: customerId })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;
      }

      // Save message to database
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content: message,
          sender_type: "user",
          read: true,
        });

      if (msgError) throw msgError;

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: message.length > 100 ? message.slice(0, 100) + "..." : message,
          last_message_at: new Date().toISOString(),
          unread: false,
        })
        .eq("id", conversationId);

      // Send SMS via RingCentral
      let smsSent = false;
      try {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("id")
          .limit(1)
          .single();

        if (settings?.id) {
          const response = await supabase.functions.invoke("ringcentral-send-message", {
            body: {
              company_id: settings.id,
              to_phone: customerPhone,
              message: message,
            },
          });

          if (!response.error) {
            smsSent = true;
            console.log(`Automation SMS sent for trigger "${trigger}" to ${customerName}`);
          } else {
            console.error("RingCentral send error:", response.error);
          }
        }
      } catch (rcError) {
        console.error("Failed to send SMS via RingCentral:", rcError);
      }

      return {
        sent: true,
        smsSent,
        trigger,
        customerName,
        conversationId,
      };
    },
    onSuccess: (data) => {
      if (data.sent && data.smsSent) {
        console.log(`✓ Automation "${data.trigger}" SMS sent to ${data.customerName}`);
      }
    },
    onError: (error) => {
      console.error("Automation error:", error);
    },
  });
}

// Map status types to automation triggers
export function getAutomationTrigger(statusType: string): AutomationTrigger | null {
  switch (statusType) {
    case "on_our_way":
      return "on_our_way";
    case "cleaning_now":
      return "started";
    case "cleaning_done":
      return "finished";
    default:
      return null;
  }
}
