import { describe,expect,it } from "vitest";
import { createTeam,deactivateStaff } from "./workforce";
import { MockWorkforceRepository } from "../data/mock-workforce-repository";
import { staffFixtures } from "../test-fixtures/workforce";

describe("workforce",()=>{
 it("requires team lead to be a member",async()=>{const repository=new MockWorkforceRepository([...staffFixtures],[]);await expect(createTeam(repository,{name:"Team",memberIds:["staff-2"],leadMemberId:"staff-3",active:true})).rejects.toThrow("Team lead must be a team member")});
 it("deactivates staff instead of deleting history",async()=>{const repository=new MockWorkforceRepository([...staffFixtures],[]);expect((await deactivateStaff(repository,"staff-2")).status).toBe("inactive")});
});
