export type FrontendPersonaId =
  | "admin"
  | "office_manager"
  | "cleaning_manager"
  | "virtual_assistant"
  | "cleaner"
  | "driver"
  | "platform_admin";

export const frontendPersonas = [
  { id: "admin", label: "Admin" },
  { id: "office_manager", label: "Office Manager" },
  { id: "cleaning_manager", label: "Cleaning Manager" },
  { id: "virtual_assistant", label: "Virtual Assistant" },
  { id: "cleaner", label: "Cleaner" },
  { id: "driver", label: "Driver" },
  { id: "platform_admin", label: "Platform Admin" },
] as const;
