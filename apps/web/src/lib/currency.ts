/**
 * Format a numeric value as currency using the company's currency setting.
 * Falls back to USD if no currency is provided.
 */
export function formatCurrency(
  value: number,
  currency: string | null | undefined,
  locale?: string
): string {
  const currencyCode = currency || "USD";
  const resolvedLocale = locale || getLocaleForCurrency(currencyCode);

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback if currency code is invalid
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/**
 * Get a reasonable locale for a given currency code.
 */
function getLocaleForCurrency(currency: string): string {
  const currencyLocaleMap: Record<string, string> = {
    USD: "en-US",
    BRL: "pt-BR",
    EUR: "de-DE",
    GBP: "en-GB",
    CAD: "en-CA",
    AUD: "en-AU",
    JPY: "ja-JP",
    MXN: "es-MX",
    ARS: "es-AR",
    CLP: "es-CL",
    COP: "es-CO",
    PEN: "es-PE",
  };
  return currencyLocaleMap[currency] || "en-US";
}
