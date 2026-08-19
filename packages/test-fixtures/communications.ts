import type { CommunicationMessage } from "../domain/communication";

export const communicationFixtures:readonly CommunicationMessage[]=[
  {id:"communication-1",contactId:"contact-1",customerId:"customer-1",channel:"sms",direction:"inbound",status:"received",body:"Hi, can we move Thursday's cleaning to Friday morning?",createdAt:"2026-08-19T14:05:00.000Z"},
  {id:"communication-2",contactId:"contact-1",customerId:"customer-1",channel:"sms",direction:"outbound",status:"delivered",body:"Absolutely. We are checking Friday availability and will confirm shortly.",createdAt:"2026-08-19T14:08:00.000Z"},
  {id:"communication-3",contactId:"contact-2",customerId:"customer-2",channel:"email",direction:"outbound",status:"sent",subject:"Your upcoming Maid Flow service",body:"Your next recurring cleaning is scheduled for Monday at 9:00 AM.",createdAt:"2026-08-18T18:15:00.000Z"},
  {id:"communication-4",contactId:"contact-3",customerId:"customer-3",channel:"sms",direction:"inbound",status:"received",body:"The office will be accessible after 6 PM. Front desk has the key instructions.",createdAt:"2026-08-18T16:42:00.000Z"},
];
