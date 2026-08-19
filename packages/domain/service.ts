import type { EntityId, Money } from "./identity";

export type ServiceCategory = "residential" | "commercial" | "specialty";
export type ServiceFrequency = "one_time" | "daily" | "weekly" | "every_2_weeks" | "every_3_weeks" | "every_4_weeks";
export type ServiceAddOn = Readonly<{ id: EntityId; name: string; price?: Money; active: boolean }>;
export type ServiceDefinition = Readonly<{
  id: EntityId;
  name: string;
  category: ServiceCategory;
  defaultDurationMinutes: number;
  basePrice?: Money;
  allowedFrequencies: readonly ServiceFrequency[];
  addOnIds: readonly EntityId[];
  active: boolean;
}>;

export const serviceFrequencies: readonly ServiceFrequency[] = ["one_time", "daily", "weekly", "every_2_weeks", "every_3_weeks", "every_4_weeks"];
export const recurringFrequencies: readonly ServiceFrequency[] = ["daily", "weekly", "every_2_weeks", "every_3_weeks", "every_4_weeks"];

export function isFrequencyAllowed(service: ServiceDefinition, frequency: ServiceFrequency) {
  return service.allowedFrequencies.includes(frequency);
}
