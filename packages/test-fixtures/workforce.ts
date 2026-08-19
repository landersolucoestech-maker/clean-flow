import type { StaffMember, Team } from "../domain/team";

export const staffFixtures:readonly StaffMember[]=[
{id:"staff-1",displayName:"Alicia Morgan",email:"alicia@maidflow.example",phone:"+1 (407) 555-0101",role:"cleaning_manager",status:"active",canDrive:true},
{id:"staff-2",displayName:"Daniel Cruz",email:"daniel@maidflow.example",phone:"+1 (407) 555-0102",role:"cleaner",status:"active",canDrive:true},
{id:"staff-3",displayName:"Lucia Ramos",email:"lucia@maidflow.example",phone:"+1 (407) 555-0103",role:"cleaner",status:"active",canDrive:false},
{id:"staff-4",displayName:"Jordan Lee",email:"jordan@maidflow.example",role:"driver",status:"active",canDrive:true},
];
export const teamFixtures:readonly Team[]=[{id:"team-1",name:"Team Magnolia",memberIds:["staff-2","staff-3"],leadMemberId:"staff-2",active:true}];
