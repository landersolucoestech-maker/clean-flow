import type { IntegrationDefinition } from "../domain/integration";

export const integrationFixtures:readonly IntegrationDefinition[]=[
  {id:"integration-google-calendar",provider:"google_calendar",name:"Google Calendar",description:"Calendar synchronization for scheduled cleaning services.",status:"not_connected",capabilities:["Calendar sync","Event reconciliation"]},
  {id:"integration-quickbooks",provider:"quickbooks",name:"QuickBooks",description:"Accounting synchronization for customers, invoices and payments.",status:"not_connected",capabilities:["Customers","Invoices","Payments"]},
  {id:"integration-ringcentral",provider:"ringcentral",name:"RingCentral",description:"SMS communication provider option.",status:"not_connected",capabilities:["SMS","Inbound messages"]},
  {id:"integration-dialpad",provider:"dialpad",name:"Dialpad",description:"Alternative SMS communication provider option.",status:"not_connected",capabilities:["SMS","Inbound messages"]},
  {id:"integration-resend",provider:"resend",name:"Email delivery",description:"Transactional email provider configuration surface.",status:"not_connected",capabilities:["Transactional email"]},
];
