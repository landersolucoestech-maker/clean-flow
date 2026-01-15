import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save, Loader2 } from "lucide-react";
import { useUpdateRole } from "@/hooks/useRoles";
import { PERMISSION_CATEGORIES } from "@/stores/permissions.store";
import { useLanguage } from "@/contexts/LanguageContext";

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system?: boolean;
  scheduleVisibility?: string;
}

interface ViewPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

const scheduleVisibilityOptions = [
  { value: "today_tomorrow_6pm", label: "Today + Tomorrow at 6pm" },
  { value: "all_days", label: "All Days" },
  { value: "current_week", label: "Current Week" },
];

export function ViewPermissionsModal({ open, onOpenChange, role }: ViewPermissionsModalProps) {
  const { t } = useLanguage();
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [scheduleVisibility, setScheduleVisibility] = useState<string>("all_days");
  const [hasChanges, setHasChanges] = useState(false);
  const updateRole = useUpdateRole();

  // Initialize permissions when role changes
  useEffect(() => {
    if (role) {
      setEditedPermissions([...role.permissions]);
      setScheduleVisibility(role.scheduleVisibility || "all_days");
      setHasChanges(false);
    }
  }, [role]);

  if (!role) return null;

  // All roles are now editable
  const isReadOnly = false;

  const hasPermission = (permissionKey: string) => {
    if (editedPermissions.includes("*")) return true;
    return editedPermissions.includes(permissionKey);
  };

  const togglePermission = (permissionKey: string) => {
    if (isReadOnly) return;
    
    setEditedPermissions(prev => {
      const newPermissions = prev.includes(permissionKey)
        ? prev.filter(p => p !== permissionKey)
        : [...prev, permissionKey];
      setHasChanges(true);
      return newPermissions;
    });
  };

  const handleSave = () => {
    updateRole.mutate(
      { id: role.id, permissions: editedPermissions },
      {
        onSuccess: () => {
          setHasChanges(false);
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setEditedPermissions([...role.permissions]);
    setHasChanges(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permissões: {role.name}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly 
              ? "Esta role possui acesso total e não pode ser editada"
              : "Clique nos switches para ativar/desativar permissões"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={editedPermissions.includes("*") ? "default" : "secondary"}>
            {editedPermissions.includes("*") 
              ? "Acesso Total" 
              : `${editedPermissions.length} permissões ativas`
            }
          </Badge>
          {role.is_system && (
            <Badge variant="outline">Role do Sistema</Badge>
          )}
          {hasChanges && (
            <Badge variant="destructive">Alterações não salvas</Badge>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {PERMISSION_CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="sticky top-0 bg-background py-2 border-b">
                  <h3 className="font-semibold text-sm">{category.label}</h3>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                
                <div className="space-y-2 pl-2">
                  {category.permissions.map((permission) => {
                    const isEnabled = hasPermission(permission.key);
                    
                    return (
                      <div
                        key={permission.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isEnabled ? "bg-primary/5 border-primary/20" : "bg-card"
                        }`}
                      >
                        <div className="flex-1">
                          <Label className="font-medium text-sm">{permission.label}</Label>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                            {isEnabled ? "ON" : "OFF"}
                          </span>
                          <Switch 
                            checked={isEnabled} 
                            disabled={isReadOnly}
                            onCheckedChange={() => togglePermission(permission.key)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Schedule Visibility - Special permission */}
            <div className="space-y-2">
              <div className="sticky top-0 bg-background py-2 border-b">
                <h3 className="font-semibold text-sm">Visibilidade da Agenda</h3>
                <p className="text-xs text-muted-foreground">Controle quais dias são visíveis na agenda</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="font-medium text-sm">Dias visíveis</Label>
                    <p className="text-xs text-muted-foreground">Quais dias o usuário pode ver na agenda</p>
                  </div>
                  <Select 
                    value={scheduleVisibility} 
                    onValueChange={(value) => {
                      setScheduleVisibility(value);
                      setHasChanges(true);
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleVisibilityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {!isReadOnly && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateRole.isPending}
            >
              {updateRole.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("settings.saveChanges")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
