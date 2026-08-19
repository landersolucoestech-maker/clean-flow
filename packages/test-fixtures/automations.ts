import type { AutomationRule } from "../domain/automation";

export const automationFixtures:readonly AutomationRule[]=[
  {id:"automation-1",name:"On the way notice",trigger:"service_on_the_way",channel:"sms",enabled:true,delayValue:0,delayUnit:"minutes",messageTemplate:"Your Maid Flow team is on the way and will arrive shortly."},
  {id:"automation-2",name:"Service completed follow-up",trigger:"service_completed",channel:"sms",enabled:true,delayValue:15,delayUnit:"minutes",messageTemplate:"Your cleaning is complete. Thank you for choosing Maid Flow."},
  {id:"automation-3",name:"New lead acknowledgement",trigger:"lead_created",channel:"email",enabled:false,delayValue:0,delayUnit:"minutes",messageTemplate:"Thanks for contacting us. Our team will review your cleaning request shortly."},
];
