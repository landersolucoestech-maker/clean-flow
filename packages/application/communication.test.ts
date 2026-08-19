import { describe, expect, it } from "vitest";
import { composeCommunication } from "./communication";
import { MockCommunicationRepository } from "../data/mock-communication-repository";

describe("communication application",()=>{
  it("requires a message body",async()=>{const repository=new MockCommunicationRepository();await expect(composeCommunication(repository,{contactId:"contact-1",channel:"sms",direction:"outbound",body:"   "})).rejects.toThrow("Message body is required")});
  it("requires a subject for email",async()=>{const repository=new MockCommunicationRepository();await expect(composeCommunication(repository,{contactId:"contact-1",channel:"email",direction:"outbound",body:"Hello"})).rejects.toThrow("Email subject is required")});
});
