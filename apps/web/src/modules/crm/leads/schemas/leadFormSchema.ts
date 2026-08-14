import { z } from "zod";

export const leadFormSchema = z.object({
  primaryContactName: z.string().min(1, "leads.validation.nameRequired").max(100, "leads.validation.nameTooLong"),
  email: z.string().email("leads.validation.invalidEmail").max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  leadSource: z.string().min(1, "leads.validation.originRequired"),
  serviceType: z.string().min(1, "leads.validation.serviceRequired"),
  stage: z.string().min(1, "leads.validation.stageRequired"),
});
