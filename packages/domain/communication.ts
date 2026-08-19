import type { EntityId, ISODateTime } from "./identity";

export type CommunicationChannel="sms"|"email";
export type CommunicationDirection="inbound"|"outbound";
export type CommunicationStatus="draft"|"queued"|"sent"|"delivered"|"failed"|"received";

export type CommunicationMessage=Readonly<{
  id:EntityId;
  contactId:EntityId;
  customerId?:EntityId;
  jobId?:EntityId;
  channel:CommunicationChannel;
  direction:CommunicationDirection;
  status:CommunicationStatus;
  subject?:string;
  body:string;
  createdAt:ISODateTime;
}>;
