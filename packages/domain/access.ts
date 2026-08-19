export type MaidFlowRole="admin"|"office_manager"|"cleaning_manager"|"virtual_assistant"|"cleaner"|"driver"|"platform_admin";
export type MaidFlowPermission=
  |"crm.read"|"crm.manage"
  |"schedule.read"|"schedule.manage"|"schedule.execute"
  |"communications.read"|"communications.send"
  |"finance.read"|"finance.manage"
  |"payroll.read"|"payroll.manage"
  |"team.manage"|"settings.manage"|"platform.manage";

export const rolePermissions:Readonly<Record<MaidFlowRole,readonly MaidFlowPermission[]>>={
  admin:["crm.read","crm.manage","schedule.read","schedule.manage","schedule.execute","communications.read","communications.send","finance.read","finance.manage","payroll.read","payroll.manage","team.manage","settings.manage"],
  office_manager:["crm.read","crm.manage","schedule.read","schedule.manage","communications.read","communications.send","finance.read","finance.manage","payroll.read","payroll.manage","team.manage","settings.manage"],
  cleaning_manager:["crm.read","schedule.read","schedule.manage","schedule.execute","communications.read","communications.send","team.manage"],
  virtual_assistant:["crm.read","crm.manage","schedule.read","schedule.manage","communications.read","communications.send"],
  cleaner:["schedule.read","schedule.execute","communications.read"],
  driver:["schedule.read","schedule.execute","communications.read"],
  platform_admin:["platform.manage"],
};
