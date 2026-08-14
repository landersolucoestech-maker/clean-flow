export function formatLeadCurrency(value: string): string {
  const numericValue = value.replace(/[^0-9.]/g, "");
  const number = Number.parseFloat(numericValue);
  if (Number.isNaN(number)) return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}
