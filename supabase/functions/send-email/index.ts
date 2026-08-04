import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  template?: "invoice" | "reminder" | "welcome" | "review_request" | "estimate";
  data?: TemplateData;
}

type TemplateData = Record<string, string | number | boolean | null | undefined>;

const templates = {
  invoice: (data: TemplateData) => ({
    subject: `Invoice #${data.invoiceNumber} from ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a2e;">Invoice #${data.invoiceNumber}</h1>
        <p>Dear ${data.customerName},</p>
        <p>Please find your invoice details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">$${data.amount}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.dueDate}</td>
          </tr>
          ${data.paymentInfo ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Method</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.paymentInfo}</td>
          </tr>
          ` : ''}
        </table>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>${data.companyName}</p>
      </div>
    `,
  }),
  reminder: (data: TemplateData) => ({
    subject: `Reminder: Invoice #${data.invoiceNumber} is ${data.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">Payment Reminder</h1>
        <p>Dear ${data.customerName},</p>
        <p>This is a friendly reminder that invoice #${data.invoiceNumber} for $${data.amount} is ${data.status}.</p>
        ${data.paymentInfo ? `<p><strong>💳 Payment:</strong> ${data.paymentInfo}</p>` : ''}
        <p>Please make payment at your earliest convenience.</p>
        <p>If you have already made payment, please disregard this message.</p>
        <p>Best regards,<br>${data.companyName}</p>
      </div>
    `,
  }),
  welcome: (data: TemplateData) => ({
    subject: `Welcome to ${data.companyName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #27ae60;">Welcome!</h1>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for choosing ${data.companyName} for your cleaning needs!</p>
        <p>We're excited to serve you and ensure your space is always spotless.</p>
        <p>If you have any questions, don't hesitate to reach out.</p>
        <p>Best regards,<br>The ${data.companyName} Team</p>
      </div>
    `,
  }),
  review_request: (data: TemplateData) => ({
    subject: `How was your experience with ${data.companyName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3498db;">We'd Love Your Feedback!</h1>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for choosing ${data.companyName}! We hope you're happy with our service.</p>
        <p>Would you take a moment to leave us a review? Your feedback helps us improve and helps others find quality cleaning services.</p>
        ${data.reviewUrl ? `<p><a href="${data.reviewUrl}" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave a Review</a></p>` : ''}
        <p>Thank you for your support!</p>
        <p>Best regards,<br>${data.companyName}</p>
      </div>
    `,
  }),
  estimate: (data: TemplateData) => ({
    subject: `Your Estimate from ${data.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #9b59b6;">Your Cleaning Estimate</h1>
        <p>Dear ${data.customerName},</p>
        <p>Thank you for your interest in ${data.companyName}!</p>
        <p>Based on the information you provided, here's your estimate:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.serviceType}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Estimated Amount</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">$${data.amount}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Valid Until</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.validUntil}</td>
          </tr>
        </table>
        <p>To schedule your service or ask questions, please reply to this email or call us.</p>
        <p>Best regards,<br>${data.companyName}</p>
      </div>
    `,
  }),
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, html, text, from, replyTo, template, data } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Recipient email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailSubject = subject;
    let emailHtml = html;

    // Use template if specified
    if (template && data && templates[template]) {
      const templateContent = templates[template](data);
      emailSubject = emailSubject || templateContent.subject;
      emailHtml = emailHtml || templateContent.html;
    }

    if (!emailSubject || (!emailHtml && !text)) {
      return new Response(
        JSON.stringify({ error: "Subject and content (html or text) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Resend API directly via fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Broom Connect <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject: emailSubject,
        html: emailHtml,
        text: text,
        reply_to: replyTo,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResponse = await resendResponse.json();

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
