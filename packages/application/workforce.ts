import type { StaffMember, Team } from "../domain/team";

export interface WorkforceRepository {
  listStaff(): Promise<readonly StaffMember[]>;
  listTeams(): Promise<readonly Team[]>;
  createStaff(input: Omit<StaffMember,"id">): Promise<StaffMember>;
  createTeam(input: Omit<Team,"id">): Promise<Team>;
  updateStaff(id:string,input:Partial<Omit<StaffMember,"id">>): Promise<StaffMember>;
  updateTeam(id:string,input:Partial<Omit<Team,"id">>): Promise<Team>;
}

export async function createTeam(repository:WorkforceRepository,input:Omit<Team,"id">){
  if(!input.name.trim()) throw new Error("Team name is required");
  if(input.leadMemberId&&!input.memberIds.includes(input.leadMemberId)) throw new Error("Team lead must be a team member");
  return repository.createTeam(input);
}

export async function deactivateStaff(repository:WorkforceRepository,id:string){return repository.updateStaff(id,{status:"inactive"});}
