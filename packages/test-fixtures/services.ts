import type { ServiceDefinition } from "../domain/service";

export const serviceFixtures: readonly ServiceDefinition[] = [
  { id: "service-regular", name: "Regular Cleaning", category: "residential", defaultDurationMinutes: 180, active: true },
  { id: "service-deep", name: "Deep Cleaning", category: "residential", defaultDurationMinutes: 300, active: true },
  { id: "service-first", name: "First Cleaning", category: "residential", defaultDurationMinutes: 240, active: true },
  { id: "service-one-time", name: "One-Time Cleaning", category: "residential", defaultDurationMinutes: 240, active: true },
  { id: "service-move", name: "Move-In / Move-Out Cleaning", category: "specialty", defaultDurationMinutes: 360, active: true },
  { id: "service-office", name: "Office Cleaning", category: "commercial", defaultDurationMinutes: 240, active: true },
  { id: "service-commercial", name: "Commercial Cleaning", category: "commercial", defaultDurationMinutes: 300, active: true },
  { id: "service-post-construction", name: "Post-Construction Cleaning", category: "specialty", defaultDurationMinutes: 480, active: true },
  { id: "service-reason", name: "Cleaning for a Reason", category: "specialty", defaultDurationMinutes: 180, active: true },
];
