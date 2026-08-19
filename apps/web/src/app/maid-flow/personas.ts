export type PersonaId =
  | "admin"
  | "office_manager"
  | "cleaning_manager"
  | "virtual_assistant"
  | "cleaner"
  | "driver"
  | "platform_admin";

export type Permission =
  | "crm.read"
  | "crm.manage"
  | "operations.read"
  | "operations.manage"
  | "finance.read"
  | "finance.manage"
  | "settings.manage"
  | "platform.manage";

export type Persona = Readonly<{
  id: PersonaId;
  label: string;
  description: string;
  permissions: readonly Permission[];
}>;

export const personas: readonly Persona[] = [
  { id: "admin", label: "Admin", description: "Full company workspace access", permissions: ["crm.read", "crm.manage", "operations.read", "operations.manage", "finance.read", "finance.manage", "settings.manage"] },
  { id: "office_manager", label: "Office Manager", description: "CRM, scheduling and finance operations", permissions: ["crm.read", "crm.manage", "operations.read", "operations.manage", "finance.read"] },
  { id: "cleaning_manager", label: "Cleaning Manager", description: "Field operations and team scheduling", permissions: ["crm.read", "operations.read", "operations.manage"] },
  { id: "virtual_assistant", label: "Virtual Assistant", description: "Customer and lead administration", permissions: ["crm.read", "crm.manage", "operations.read"] },
  { id: "cleaner", label: "Cleaner", description: "Assigned work and execution", permissions: ["operations.read"] },
  { id: "driver", label: "Driver", description: "Assigned routes and jobs", permissions: ["operations.read"] },
  { id: "platform_admin", label: "Platform Admin", description: "Maid Flow platform administration", permissions: ["platform.manage"] },
];

export function can(persona: Persona, permission: Permission) {
  return persona.permissions.includes(permission);
}
