import type { ServiceAddOn, ServiceDefinition } from "../domain/service";

export const serviceAddOnFixtures: readonly ServiceAddOn[] = [
  { id: "addon-fridge", name: "Inside refrigerator", price: { amountMinor: 4500, currency: "USD" }, active: true },
  { id: "addon-oven", name: "Inside oven", price: { amountMinor: 4500, currency: "USD" }, active: true },
  { id: "addon-windows", name: "Interior windows", price: { amountMinor: 6500, currency: "USD" }, active: true },
];
const recurring = ["weekly", "every_2_weeks", "every_3_weeks", "every_4_weeks"] as const;
export const serviceFixtures: readonly ServiceDefinition[] = [
  { id: "service-regular", name: "Regular Cleaning", category: "residential", defaultDurationMinutes: 180, allowedFrequencies: recurring, addOnIds: ["addon-fridge","addon-oven"], active: true },
  { id: "service-deep", name: "Deep Cleaning", category: "residential", defaultDurationMinutes: 300, allowedFrequencies: ["one_time"], addOnIds: ["addon-fridge","addon-oven","addon-windows"], active: true },
  { id: "service-first", name: "First Cleaning", category: "residential", defaultDurationMinutes: 240, allowedFrequencies: ["one_time"], addOnIds: ["addon-fridge","addon-oven"], active: true },
  { id: "service-one-time", name: "One-Time Cleaning", category: "residential", defaultDurationMinutes: 240, allowedFrequencies: ["one_time"], addOnIds: ["addon-fridge","addon-oven"], active: true },
  { id: "service-move", name: "Move-In / Move-Out Cleaning", category: "specialty", defaultDurationMinutes: 360, allowedFrequencies: ["one_time"], addOnIds: ["addon-fridge","addon-oven","addon-windows"], active: true },
  { id: "service-office", name: "Office Cleaning", category: "commercial", defaultDurationMinutes: 240, allowedFrequencies: ["daily",...recurring], addOnIds: [], active: true },
  { id: "service-commercial", name: "Commercial Cleaning", category: "commercial", defaultDurationMinutes: 300, allowedFrequencies: ["daily",...recurring], addOnIds: [], active: true },
  { id: "service-post-construction", name: "Post-Construction Cleaning", category: "specialty", defaultDurationMinutes: 480, allowedFrequencies: ["one_time"], addOnIds: ["addon-windows"], active: true },
  { id: "service-reason", name: "Cleaning for a Reason", category: "specialty", defaultDurationMinutes: 180, allowedFrequencies: ["one_time"], addOnIds: [], active: true },
];
