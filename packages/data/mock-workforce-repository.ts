import type { StaffMember, Team } from "../domain/team";
import type { WorkforceRepository } from "../application/workforce";

export class MockWorkforceRepository implements WorkforceRepository {
  constructor(private staff:StaffMember[]=[],private teams:Team[]=[]){this.staff=[...staff];this.teams=[...teams];}
  async listStaff(){return [...this.staff];}
  async listTeams(){return [...this.teams];}
  async createStaff(input:Omit<StaffMember,"id">){const row:StaffMember={...input,id:`staff-${this.staff.length+1}`};this.staff.push(row);return row;}
  async createTeam(input:Omit<Team,"id">){const row:Team={...input,id:`team-${this.teams.length+1}`};this.teams.push(row);return row;}
  async updateStaff(id:string,input:Partial<Omit<StaffMember,"id">>){const index=this.staff.findIndex((row)=>row.id===id);if(index<0)throw new Error("Staff member not found");const row:StaffMember={...this.staff[index],...input};this.staff[index]=row;return row;}
  async updateTeam(id:string,input:Partial<Omit<Team,"id">>){const index=this.teams.findIndex((row)=>row.id===id);if(index<0)throw new Error("Team not found");const row:Team={...this.teams[index],...input};this.teams[index]=row;return row;}
}
