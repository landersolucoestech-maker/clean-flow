import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotificationType = 
  | "invoice_sent" 
  | "invoice_reminder" 
  | "review_request" 
  | "payment_confirmation"
  | "appointment_reminder"
  | "estimate_sent"
  | "custom";

export interface SendNotificationParams {
  customerId: string;
  customerPhone: string;
  customerName: string;
  message: string;
  notificationType: NotificationType;
  showToast?: boolean;
}

// Helper to format phone number for display
function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function useSendNotificationSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      customerPhone,
      customerName,
      message,
      notificationType,
      showToast = true,
    }: SendNotificationParams) => {
      // 1. Get or create conversation for this customer
      let conversationId: string;

      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .maybeSingle();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({ customer_id: customerId })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;
      }

      // 2. Save message to database
      const { data: savedMessage, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          content: message,
          sender_type: "user",
          read: true,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // 3. Update conversation last message
      await supabase
        .from("conversations")
        .update({
          last_message: message.length > 100 ? message.slice(0, 100) + "..." : message,
          last_message_at: new Date().toISOString(),
          unread: false,
        })
        .eq("id", conversationId);

      // 4. Send SMS via RingCentral
      let smsSent = false;
      try {
        // Get company_id
        const { data: companySettings } = await supabase
          .from("company_settings")
          .select("id")
          .limit(1)
          .single();

        if (companySettings?.id) {
          const response = await supabase.functions.invoke("ringcentral-send-message", {
            body: {
              company_id: companySettings.id,
              to_phone: customerPhone,
              message: message,
            },
          });

          if (response.error) {
            console.error("RingCentral send error:", response.error);
          } else {
            smsSent = true;
            console.log("SMS sent via RingCentral:", response.data);
          }
        }
      } catch (rcError) {
        console.error("Failed to send SMS via RingCentral:", rcError);
      }

      return {
        messageId: savedMessage.id,
        conversationId,
        smsSent,
        customerName,
        notificationType,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
      
      if (variables.showToast) {
        const typeLabels: Record<NotificationType, string> = {
          invoice_sent: "Invoice",
          invoice_reminder: "Lembrete de invoice",
          review_request: "Pedido de review",
          payment_confirmation: "Confirmação de pagamento",
          appointment_reminder: "Lembrete de agendamento",
          estimate_sent: "Estimate",
          custom: "Mensagem",
        };

        const label = typeLabels[data.notificationType] || "Mensagem";
        if (data.smsSent) {
          toast.success(`${label} enviado para ${data.customerName}!`);
        } else {
          toast.info(`${label} salvo (SMS não enviado - verifique RingCentral)`);
        }
      }
    },
    onError: (error) => {
      console.error("Error sending notification SMS:", error);
      toast.error("Erro ao enviar notificação");
    },
  });
}

// Pre-built message templates
export function getNotificationMessage(
  type: NotificationType,
  params: {
    customerName?: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    dueDate?: string;
    companyName?: string;
    paymentLink?: string;
    googleReviewUrl?: string;
    nextdoorReviewUrl?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    estimateNumber?: string;
  }
): string {
  const {
    customerName = "Cliente",
    invoiceNumber = "",
    invoiceAmount = 0,
    dueDate = "",
    companyName = "Nossa Empresa",
    paymentLink = "",
    googleReviewUrl = "",
    nextdoorReviewUrl = "",
    appointmentDate = "",
    appointmentTime = "",
    estimateNumber = "",
  } = params;

  const formattedAmount = invoiceAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Build review links text
  const reviewLinks: string[] = [];
  if (googleReviewUrl) {
    reviewLinks.push(`🌟Google Review: ${googleReviewUrl}`);
  }
  if (nextdoorReviewUrl) {
    reviewLinks.push(`🌟Nextdoor Review: ${nextdoorReviewUrl}`);
  }
  const reviewLinksText = reviewLinks.length > 0
    ? reviewLinks.join("\n\n")
    : "It really helps our small business. Thank you!";

  switch (type) {
    case "invoice_sent":
      return `Hi ${customerName}! Your invoice ${invoiceNumber} for ${formattedAmount} has been sent. Due date: ${dueDate}. Thank you for your business! - ${companyName}`;
    
    case "invoice_reminder":
      return `Hi ${customerName}, this is a friendly reminder that invoice ${invoiceNumber} for ${formattedAmount} is due on ${dueDate}. Please let us know if you have any questions. - ${companyName}`;
    
    case "review_request":
      return `Hi ${customerName}! Thank you for choosing ${companyName}. We'd love to hear your feedback! Could you take a moment to leave us a review?\n\n${reviewLinksText}\n\n- ${companyName}`;
    
    case "payment_confirmation":
      return `Hi ${customerName}! We've received your payment of ${formattedAmount} for invoice ${invoiceNumber}. Thank you! - ${companyName}`;
    
    case "appointment_reminder":
      return `Hi ${customerName}! This is a reminder of your appointment on ${appointmentDate} at ${appointmentTime}. See you soon! - ${companyName}`;
    
    case "estimate_sent":
      return `Hi ${customerName}! Your estimate ${estimateNumber} has been sent. Please review and let us know if you have any questions. - ${companyName}`;
    
    default:
      return "";
  }
}
