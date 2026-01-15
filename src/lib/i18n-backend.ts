/**
 * Backend i18n utilities for edge functions and automated messages
 * This module provides consistent date/currency formatting and message templates
 */

export type SupportedLanguage = "en" | "pt" | "es";

const LOCALES: Record<SupportedLanguage, string> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

/**
 * Format a date string based on language preference
 */
export function formatDate(
  dateStr: string,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(dateStr);
    const locale = LOCALES[language] || LOCALES.en;
    
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };

    return date.toLocaleDateString(locale, defaultOptions);
  } catch {
    return dateStr;
  }
}

/**
 * Format a date in short format (dd/MM/yyyy or MM/dd/yyyy based on locale)
 */
export function formatDateShort(dateStr: string, language: SupportedLanguage): string {
  try {
    const date = new Date(dateStr);
    const locale = LOCALES[language] || LOCALES.en;
    
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format currency based on language/locale
 */
export function formatCurrency(
  amount: number,
  language: SupportedLanguage,
  currency: string = "USD"
): string {
  const locale = LOCALES[language] || LOCALES.en;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Standard message templates for automations
 */
export const MESSAGE_TEMPLATES = {
  // Job reminder messages
  job_reminder: {
    en: "Hi {ClientName}, this is a friendly reminder about your cleaning appointment scheduled for {JobDate}. If you have any questions, please contact us. Thank you! - {CompanyName}",
    pt: "Olá {ClientName}, este é um lembrete amigável sobre sua limpeza agendada para {JobDate}. Se tiver alguma dúvida, entre em contato. Obrigado! - {CompanyName}",
    es: "Hola {ClientName}, este es un recordatorio amable sobre su cita de limpieza programada para {JobDate}. Si tiene alguna pregunta, contáctenos. ¡Gracias! - {CompanyName}",
  },
  
  // On our way messages
  on_our_way: {
    en: "Hi {ClientName}, our team is on the way to your location. We'll be there shortly! - {CompanyName}",
    pt: "Olá {ClientName}, nossa equipe está a caminho do seu endereço. Chegaremos em breve! - {CompanyName}",
    es: "Hola {ClientName}, nuestro equipo va camino a su ubicación. ¡Llegaremos pronto! - {CompanyName}",
  },
  
  // Job started messages
  job_started: {
    en: "Hi {ClientName}, we have started cleaning your property. We'll let you know when we're done! - {CompanyName}",
    pt: "Olá {ClientName}, começamos a limpeza do seu imóvel. Avisaremos quando terminarmos! - {CompanyName}",
    es: "Hola {ClientName}, hemos comenzado a limpiar su propiedad. ¡Le avisaremos cuando terminemos! - {CompanyName}",
  },
  
  // Job finished messages
  job_finished: {
    en: "Hi {ClientName}, we have finished cleaning your property. Thank you for choosing us! We hope you enjoy your clean space. - {CompanyName}",
    pt: "Olá {ClientName}, terminamos a limpeza do seu imóvel. Obrigado por nos escolher! Esperamos que aproveite seu espaço limpo. - {CompanyName}",
    es: "Hola {ClientName}, hemos terminado de limpiar su propiedad. ¡Gracias por elegirnos! Esperamos que disfrute su espacio limpio. - {CompanyName}",
  },
  
  // Invoice reminder messages
  invoice_reminder: {
    en: "Hi {ClientName}, this is a reminder about invoice {InvoiceNumber} for {Amount}. {PaymentInfo}Thank you! - {CompanyName}",
    pt: "Olá {ClientName}, este é um lembrete sobre a fatura {InvoiceNumber} no valor de {Amount}. {PaymentInfo}Obrigado! - {CompanyName}",
    es: "Hola {ClientName}, este es un recordatorio sobre la factura {InvoiceNumber} por {Amount}. {PaymentInfo}¡Gracias! - {CompanyName}",
  },
  
  // Invoice overdue messages
  invoice_overdue: {
    en: "Hi {ClientName}, invoice {InvoiceNumber} for {Amount} is overdue. {PaymentInfo}Please pay as soon as possible. Thank you! - {CompanyName}",
    pt: "Olá {ClientName}, a fatura {InvoiceNumber} no valor de {Amount} está vencida. {PaymentInfo}Por favor, efetue o pagamento o mais rápido possível. Obrigado! - {CompanyName}",
    es: "Hola {ClientName}, la factura {InvoiceNumber} por {Amount} está vencida. {PaymentInfo}Por favor, pague lo antes posible. ¡Gracias! - {CompanyName}",
  },
  
  // Payment info templates
  payment_zelle: {
    en: "Pay via Zelle: {PaymentKey}. ",
    pt: "Pague via Zelle: {PaymentKey}. ",
    es: "Pague via Zelle: {PaymentKey}. ",
  },
  
  payment_venmo: {
    en: "Pay via Venmo: {PaymentKey}. ",
    pt: "Pague via Venmo: {PaymentKey}. ",
    es: "Pague via Venmo: {PaymentKey}. ",
  },
  
  // Review request messages
  review_request: {
    en: "Hi {ClientName}, thank you for choosing {CompanyName}! We'd love to hear about your experience. Please leave us a review: {ReviewLink}",
    pt: "Olá {ClientName}, obrigado por escolher {CompanyName}! Adoraríamos saber sobre sua experiência. Por favor, deixe-nos uma avaliação: {ReviewLink}",
    es: "Hola {ClientName}, ¡gracias por elegir {CompanyName}! Nos encantaría conocer su experiencia. Por favor, déjenos una reseña: {ReviewLink}",
  },
};

/**
 * Get a message template for a specific type and language
 */
export function getMessageTemplate(
  type: keyof typeof MESSAGE_TEMPLATES,
  language: SupportedLanguage
): string {
  const templates = MESSAGE_TEMPLATES[type];
  return templates[language] || templates.en;
}

/**
 * Replace variables in a message template
 */
export function replaceMessageVariables(
  message: string,
  variables: Record<string, string>
): string {
  let result = message;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(regex, value || "");
  }
  
  return result;
}

/**
 * Get the payment info string based on customer's preferred payment method
 * @param paymentMethod - Customer's preferred payment method (zelle, venmo, etc.)
 * @param zelleKey - Company's Zelle payment key
 * @param venmoKey - Company's Venmo payment key
 * @param language - Language for the message
 * @returns Formatted payment info string or empty string if no matching method
 */
export function getPaymentInfo(
  paymentMethod: string | null | undefined,
  zelleKey: string | null | undefined,
  venmoKey: string | null | undefined,
  language: SupportedLanguage
): string {
  if (!paymentMethod) return "";
  
  const method = paymentMethod.toLowerCase();
  
  if (method === "zelle" && zelleKey) {
    const template = MESSAGE_TEMPLATES.payment_zelle[language] || MESSAGE_TEMPLATES.payment_zelle.en;
    return template.replace("{PaymentKey}", zelleKey);
  }
  
  if (method === "venmo" && venmoKey) {
    const template = MESSAGE_TEMPLATES.payment_venmo[language] || MESSAGE_TEMPLATES.payment_venmo.en;
    return template.replace("{PaymentKey}", venmoKey);
  }
  
  return "";
}

/**
 * Determine the language to use for a customer message
 * Priority: customer.preferred_language > company.preferred_language > 'en'
 */
export function resolveMessageLanguage(
  customerLanguage: string | null | undefined,
  companyLanguage: string | null | undefined
): SupportedLanguage {
  const validLanguages: SupportedLanguage[] = ["en", "pt", "es"];
  
  if (customerLanguage && validLanguages.includes(customerLanguage as SupportedLanguage)) {
    return customerLanguage as SupportedLanguage;
  }
  
  if (companyLanguage && validLanguages.includes(companyLanguage as SupportedLanguage)) {
    return companyLanguage as SupportedLanguage;
  }
  
  return "en";
}
