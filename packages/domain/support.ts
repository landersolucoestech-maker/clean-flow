import type { EntityId,ISODateTime } from "./identity";
export type SupportTicketStatus="open"|"in_progress"|"resolved";
export type SupportTicketPriority="low"|"normal"|"high";
export type SupportTicket=Readonly<{id:EntityId;subject:string;category:string;priority:SupportTicketPriority;status:SupportTicketStatus;createdAt:ISODateTime;messages:readonly Readonly<{id:EntityId;author:"customer"|"support";body:string;createdAt:ISODateTime}>[]}>;
