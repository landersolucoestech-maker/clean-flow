import type { EntityId } from "./identity";

export type AutomationTrigger="service_scheduled"|"service_on_the_way"|"service_started"|"service_completed"|"invoice_due"|"lead_created";
export type AutomationChannel="sms"|"email";
export type AutomationDelayUnit="minutes"|"hours"|"days";

export type AutomationRule=Readonly<{
  id:EntityId;
  name:string;
  trigger:AutomationTrigger;
  channel:AutomationChannel;
  enabled:boolean;
  delayValue:number;
  delayUnit:AutomationDelayUnit;
  messageTemplate:string;
}>;
