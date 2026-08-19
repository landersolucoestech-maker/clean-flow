export type EntityId = string;
export type ISODateTime = string;
export type CurrencyCode = "USD";

export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

export const maidFlowProduct = {
  name: "Maid Flow",
  namespace: "maid-flow",
} as const;
