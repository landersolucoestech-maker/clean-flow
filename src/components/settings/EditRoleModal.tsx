import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Save, Loader2 } from "lucide-react";
import { permissionCategories, scheduleVisibilityOptions } from "@/data/permissions";
import { useUpdateRole, Role } from "@/hooks/useRoles";
import { useLanguage } from "@/contexts/LanguageContext";

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

export function EditRoleModal({ open, onOpenChange, role }: EditRoleModalProps) {
  const { t } = useLanguage();
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [scheduleVisibility, setScheduleVisibility] = useState("all_days");

  const updateRoleMutation = useUpdateRole();

  useEffect(() => {
    if (role) {
      setRoleName(role.name);
      setRoleDescription("");
      setSelectedPermissions(role.permissions || []);
      setScheduleVisibility("all_days");
    }
  }, [role]);

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = () => {
    if (!roleName.trim()) {
      toast.error("Digite um nome para a função");
      return;
    }

    if (!role) return;

    updateRoleMutation.mutate({
      id: role.id,
      name: roleName,
      permissions: selectedPermissions,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(`Função "${roleName}" atualizada com sucesso!`);
      },
      onError: (error) => {
        toast.error("Erro ao atualizar função: " + error.message);
      }
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!role) return null;

  // Flatten all permissions from all categories
  const allPermissions = permissionCategories.flatMap(cat => cat.permissions);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Editar Função
          </DialogTitle>
          <DialogDescription>
            Edite o nome, descrição e as permissões da função
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nome da Função</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Ex: Cleaner, Supervisor, Manager..."
                disabled={role.is_system}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Descrição (opcional)</Label>
              <Input
                id="roleDescription"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Descreva as responsabilidades..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <ScrollArea className="h-[400px] pr-4 border rounded-lg">
              <div className="p-2 space-y-2">
                {allPermissions.map((permission) => {
                  if (permission.type === "dropdown") {
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 mr-4">
                          <Label className="font-medium">{permission.label}</Label>
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        </div>
                        <Select value={scheduleVisibility} onValueChange={setScheduleVisibility}>
                          <SelectTrigger className="w-[200px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {scheduleVisibilityOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  const isEnabled = selectedPermissions.includes(permission.id);
                  return (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <Label
                          className="font-medium cursor-pointer"
                          onClick={() => handleTogglePermission(permission.id)}
                        >
                          {permission.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                          {isEnabled ? "ON" : "OFF"}
                        </span>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleTogglePermission(permission.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-primary hover:bg-primary/90"
            disabled={updateRoleMutation.isPending}
          >
            {updateRoleMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t("settings.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
