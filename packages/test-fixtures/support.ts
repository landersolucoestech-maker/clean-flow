import type { SupportTicket } from "../domain/support";
export const supportFixtures:readonly SupportTicket[]=[
{id:"ticket-1",subject:"QuickBooks connection question",category:"Integrations",priority:"normal",status:"open",createdAt:"2026-08-18T13:20:00.000Z",messages:[{id:"ticket-message-1",author:"customer",body:"We need to understand which invoice fields will sync once accounting integration is available.",createdAt:"2026-08-18T13:20:00.000Z"}]},
{id:"ticket-2",subject:"Schedule workflow clarification",category:"Operations",priority:"low",status:"resolved",createdAt:"2026-08-12T10:00:00.000Z",messages:[{id:"ticket-message-2",author:"customer",body:"How should recurring services appear in the weekly schedule?",createdAt:"2026-08-12T10:00:00.000Z"},{id:"ticket-message-3",author:"support",body:"Each generated occurrence appears as a scheduled service while the recurrence rule remains separate.",createdAt:"2026-08-12T11:15:00.000Z"}]},
];
