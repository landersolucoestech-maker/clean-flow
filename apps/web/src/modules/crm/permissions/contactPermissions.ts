const CUSTOMER_TO_CONTACT_PERMISSION = {
  "customers.view": "contacts.view",
  "customers.create": "contacts.create",
  "customers.edit": "contacts.edit",
  "customers.delete": "contacts.delete",
} as const;

export function deriveContactPermissions(permissions: string[]): string[] {
  if (permissions.includes("*")) return permissions;

  const derived = Object.entries(CUSTOMER_TO_CONTACT_PERMISSION)
    .filter(([customerPermission]) => permissions.includes(customerPermission))
    .map(([, contactPermission]) => contactPermission);

  return Array.from(new Set([...permissions, ...derived]));
}
