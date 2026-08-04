import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmailTemplate = "invoice" | "reminder" | "welcome" | "review_request" | "estimate";

interface SendEmailParams {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  template?: EmailTemplate;
  data?: Record<string, unknown>;
}

interface EmailResponse {
  id: string;
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async (params: SendEmailParams): Promise<EmailResponse> => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: params,
      });

      if (error) {
        console.error("Email send error:", error);
        throw new Error(error.message || "Failed to send email");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Email sent successfully!");
    },
    onError: (error: Error) => {
      console.error("Email error:", error);
      toast.error(`Failed to send email: ${error.message}`);
    },
  });
}

// Utility hook for sending invoice emails
export function useSendInvoiceEmail() {
  const { mutateAsync: sendEmail, isPending } = useSendEmail();

  const sendInvoiceEmail = async (params: {
    customerEmail: string;
    customerName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    companyName: string;
    replyTo?: string;
  }) => {
    return sendEmail({
      to: params.customerEmail,
      template: "invoice",
      replyTo: params.replyTo,
      data: {
        customerName: params.customerName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount.toFixed(2),
        dueDate: params.dueDate,
        companyName: params.companyName,
      },
    });
  };

  return { sendInvoiceEmail, isPending };
}

// Utility hook for sending reminder emails
export function useSendReminderEmail() {
  const { mutateAsync: sendEmail, isPending } = useSendEmail();

  const sendReminderEmail = async (params: {
    customerEmail: string;
    customerName: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    companyName: string;
  }) => {
    return sendEmail({
      to: params.customerEmail,
      template: "reminder",
      data: {
        customerName: params.customerName,
        invoiceNumber: params.invoiceNumber,
        amount: params.amount.toFixed(2),
        status: params.status,
        companyName: params.companyName,
      },
    });
  };

  return { sendReminderEmail, isPending };
}

// Utility hook for sending review request emails
export function useSendReviewRequestEmail() {
  const { mutateAsync: sendEmail, isPending } = useSendEmail();

  const sendReviewRequestEmail = async (params: {
    customerEmail: string;
    customerName: string;
    companyName: string;
    reviewUrl?: string;
  }) => {
    return sendEmail({
      to: params.customerEmail,
      template: "review_request",
      data: {
        customerName: params.customerName,
        companyName: params.companyName,
        reviewUrl: params.reviewUrl,
      },
    });
  };

  return { sendReviewRequestEmail, isPending };
}

// Utility hook for sending estimate emails
export function useSendEstimateEmail() {
  const { mutateAsync: sendEmail, isPending } = useSendEmail();

  const sendEstimateEmail = async (params: {
    customerEmail: string;
    customerName: string;
    serviceType: string;
    amount: number;
    validUntil: string;
    companyName: string;
  }) => {
    return sendEmail({
      to: params.customerEmail,
      template: "estimate",
      data: {
        customerName: params.customerName,
        serviceType: params.serviceType,
        amount: params.amount.toFixed(2),
        validUntil: params.validUntil,
        companyName: params.companyName,
      },
    });
  };

  return { sendEstimateEmail, isPending };
}
