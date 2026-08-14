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

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
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
      if (!customerPhone.trim()) throw new Error(`No phone number available for ${customerName}`);

      let conversationId: string;
      const { data: existingConversation, error: lookupError } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .is("staff_id", null)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({ customer_id: customerId })
          .select("id")
          .single();
        if (conversationError || !newConversation) {
          throw conversationError || new Error("Unable to create customer conversation");
        }
        conversationId = newConversation.id;
      }

      const { data: result, error: deliveryError } = await supabase.functions.invoke("send-conversation-message", {
        body: {
          conversation_id: conversationId,
          content: message,
        },
      });
      if (deliveryError || !result?.success) {
        throw deliveryError || new Error(result?.error || "SMS delivery failed");
      }

      return {
        messageId: String(result.message?.id || ""),
        conversationId,
        smsSent: true,
        provider: typeof result.provider === "string" ? result.provider : "sms",
        customerName,
        customerPhone: formatPhoneForDisplay(customerPhone),
        notificationType,
        showToast,
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
        toast.success(`${label} enviado para ${data.customerName} via ${data.provider === "dialpad" ? "Dialpad" : data.provider === "ringcentral" ? "RingCentral" : "SMS"}!`);
      }
    },
    onError: (error) => {
      console.error("Error sending notification SMS:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar notificação");
    },
  });
}

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
  },
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
  const reviewLinks: string[] = [];
  if (googleReviewUrl) reviewLinks.push(`🌟Google Review: ${googleReviewUrl}`);
  if (nextdoorReviewUrl) reviewLinks.push(`🌟Nextdoor Review: ${nextdoorReviewUrl}`);
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
      return paymentLink ? paymentLink : "";
  }
}
