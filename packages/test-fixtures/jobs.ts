import type { Job } from "../domain/job";
export const jobFixtures:readonly Job[]=[
{id:"job-1",customerId:"customer-1",serviceId:"service-regular",locationId:"location-1",startsAt:"2026-08-20T13:00:00.000Z",durationMinutes:180,price:{amountMinor:27000,currency:"USD"},assignedTeamId:"team-1",assignedStaffIds:[],status:"scheduled",recurrence:{type:"weekly",interval:2,weekdays:["thu"]},instructions:"Gate code in customer profile."},
{id:"job-2",customerId:"customer-2",serviceId:"service-regular",locationId:"location-2",startsAt:"2026-08-20T16:30:00.000Z",durationMinutes:150,price:{amountMinor:22500,currency:"USD"},assignedStaffIds:["staff-2"],status:"scheduled",recurrence:{type:"weekly",interval:1,weekdays:["thu"]}},
{id:"job-3",customerId:"customer-3",serviceId:"service-commercial",locationId:"location-3",startsAt:"2026-08-21T22:00:00.000Z",durationMinutes:240,price:{amountMinor:42000,currency:"USD"},assignedTeamId:"team-1",assignedStaffIds:[],status:"scheduled",recurrence:{type:"weekly",interval:1,weekdays:["fri"]}},
];
