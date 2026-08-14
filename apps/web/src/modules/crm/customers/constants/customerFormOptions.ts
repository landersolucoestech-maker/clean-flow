import { FREQUENCY_OPTIONS } from "@/lib/serviceEnums";

export const CUSTOMER_FREQUENCY_OPTIONS = FREQUENCY_OPTIONS.map((frequency) => ({
  value: frequency,
  label: frequency,
}));

export const CUSTOMER_PAYMENT_METHODS = [
  { value: "quickbooks", label: "QuickBooks (QB)" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
] as const;

export const CUSTOMER_DAYS_OF_WEEK = [
  { value: "monday", key: "days.monday" },
  { value: "tuesday", key: "days.tuesday" },
  { value: "wednesday", key: "days.wednesday" },
  { value: "thursday", key: "days.thursday" },
  { value: "friday", key: "days.friday" },
  { value: "saturday", key: "days.saturday" },
  { value: "sunday", key: "days.sunday" },
] as const;
