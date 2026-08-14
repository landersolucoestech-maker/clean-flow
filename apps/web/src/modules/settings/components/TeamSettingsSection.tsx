import { T } from "@/shared/components/i18n/T";
import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Edit, Plus, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Staff } from "@/hooks/useStaff";

type Translate = (key: string) => string;

const STAFF_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "cleaner", label: "Cleaner" },
  { value: "driver", label: "Driver" },
  { value: "cleaning_manager", label: "Cleaning Manager Team" },
  { value: "office_manager", label: "Office Manager" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
] as const;

interface TeamSettingsSectionProps {
  t: Translate;
  staffMembers: Staff[];
  isLoadingStaff: boolean;
  teamSearchQuery: string;
  setTeamSearchQuery: Dispatch<SetStateAction<string>>;
  newMemberRole: string;
  setNewMemberRole: Dispatch<SetStateAction<string>>;
  canManageTeam: boolean;
  onCreateUser: () => void;
  onEditStaff: (staff: Staff) => void;
}

function getStaffRole(staff: Staff) {
  return staff.staff_roles?.role || (staff.is_driver ? "driver" : "cleaner");
}

function getRoleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "driver") return "Driver";
  if (role === "cleaning_manager") return "Cleaning Manager Team";
  if (role === "cleaner") return "Cleaner";
  if (role === "office_manager") return "Office Manager";
  if (role === "virtual_assistant") return "Virtual Assistant";
  return role;
}

export function TeamSettingsSection({
  t,
  staffMembers,
  isLoadingStaff,
  teamSearchQuery,
  setTeamSearchQuery,
  newMemberRole,
  setNewMemberRole,
  canManageTeam,
  onCreateUser,
  onEditStaff,
}: TeamSettingsSectionProps) {
  const filteredStaff = staffMembers.filter((staff) => {
    const matchesSearch = !teamSearchQuery || staff.name.toLowerCase().includes(teamSearchQuery.toLowerCase());
    if (newMemberRole === "all") return matchesSearch;
    return matchesSearch && getStaffRole(staff) === newMemberRole;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("settings.manageTeamTitle")}
          </CardTitle>
          <CardDescription>{t("settings.userAccessManagement")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
            <div className="min-w-0 flex-1">
              <Input
                placeholder={t("settings.searchByName")}
                value={teamSearchQuery}
                onChange={(event) => setTeamSearchQuery(event.target.value)}
              />
            </div>
            <Select value={newMemberRole} onValueChange={setNewMemberRole}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder={t("settings.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STAFF_ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManageTeam && (
              <Button onClick={onCreateUser} variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                {t("settings.addTeamMember")}
              </Button>
            )}
          </div>

          <Separator />

          {isLoadingStaff ? (
            <div className="py-8 text-center text-muted-foreground">{t("settings.loadingStaff")}</div>
          ) : (
            <div className="max-h-[500px] space-y-3 overflow-y-auto">
              {filteredStaff.map((staff) => {
                const role = getStaffRole(staff);
                const showTeam = role === "driver" || role === "cleaner";

                return (
                  <div key={staff.id} className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                        <span className="font-medium text-primary">
                          {staff.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{staff.name}</h4>
                        <p className="text-sm text-muted-foreground">{staff.email || t("settings.noEmail")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {staff.payment_method && (
                        <Badge variant="outline" className="border-success/30 bg-success/10 capitalize text-success">
                          {staff.payment_method === "quickbooks" ? "QuickBooks" : staff.payment_method}
                        </Badge>
                      )}
                      {showTeam && (staff.team ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary-light text-primary-dark">
                          Team {staff.team}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          <T k="literal.settings.sem_team.58c9ef63" />
                        </Badge>
                      ))}
                      <Badge variant={role === "driver" ? "default" : "secondary"}>{getRoleLabel(role)}</Badge>
                      <Badge variant={staff.is_active ? "default" : "outline"}>
                        {staff.is_active ? t("common.active") : t("common.inactive")}
                      </Badge>
                      {canManageTeam && (
                        <Button variant="ghost" size="sm" onClick={() => onEditStaff(staff)} aria-label={`Edit ${staff.name}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {staffMembers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">{t("settings.noStaffFound")}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("settings.rolesPermissions")}
          </CardTitle>
          <CardDescription><T k="literal.settings.access_is_enforced_by_the_supported_operatio.9dc2945c" /></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STAFF_ROLE_OPTIONS.map((role) => (
            <Badge key={role.value} variant="secondary">{role.label}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
