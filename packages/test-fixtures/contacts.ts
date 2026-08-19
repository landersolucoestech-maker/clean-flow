import type { Contact } from "../domain/crm";

export const contactFixtures: readonly Contact[] = [
  { id: "contact-1", kind: "person", displayName: "Olivia Bennett", firstName: "Olivia", lastName: "Bennett", email: "olivia.bennett@example.com", phone: "+1 (407) 555-0138", preferredLanguage: "en", status: "active", tags: ["Residential"], createdAt: "2026-08-18T14:30:00.000Z" },
  { id: "contact-2", kind: "person", displayName: "Mateo Rivera", firstName: "Mateo", lastName: "Rivera", email: "mateo.rivera@example.com", phone: "+1 (407) 555-0172", preferredLanguage: "es", status: "active", tags: ["Referral"], createdAt: "2026-08-16T10:15:00.000Z" },
  { id: "contact-3", kind: "business", displayName: "Harbor Dental Group", companyName: "Harbor Dental Group", email: "office@harbordental.example", phone: "+1 (407) 555-0194", preferredLanguage: "en", status: "active", tags: ["Commercial"], createdAt: "2026-08-12T09:00:00.000Z" },
  { id: "contact-4", kind: "person", displayName: "Camila Souza", firstName: "Camila", lastName: "Souza", email: "camila.souza@example.com", phone: "+1 (689) 555-0106", preferredLanguage: "pt", status: "archived", tags: [], createdAt: "2026-07-29T17:45:00.000Z" },
  { id: "contact-5", kind: "person", displayName: "Sophia Turner", firstName: "Sophia", lastName: "Turner", email: "sophia.turner@example.com", phone: "+1 (321) 555-0163", preferredLanguage: "en", status: "active", tags: ["Website lead"], createdAt: "2026-08-19T11:20:00.000Z" },
  { id: "contact-6", kind: "business", displayName: "Northstar Pilates", companyName: "Northstar Pilates", email: "hello@northstarpilates.example", phone: "+1 (407) 555-0117", preferredLanguage: "en", status: "active", tags: ["Commercial lead"], createdAt: "2026-08-18T18:10:00.000Z" },
];
