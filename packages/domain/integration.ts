import type { EntityId } from "./identity";

export type IntegrationProvider="google_calendar"|"quickbooks"|"ringcentral"|"dialpad"|"resend";
export type IntegrationStatus="not_connected"|"connected"|"attention_required";
export type IntegrationDefinition=Readonly<{
  id:EntityId;
  provider:IntegrationProvider;
  name:string;
  description:string;
  status:IntegrationStatus;
  capabilities:readonly string[];
}>;
