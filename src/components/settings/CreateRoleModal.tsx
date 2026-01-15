import { useState } from "react";
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
import { Shield, Plus, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { permissionCategories, scheduleVisibilityOptions } from "@/data/permissions";
import { useCreateRole } from "@/hooks/useRoles";

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleModal({ open, onOpenChange }: CreateRoleModalProps) {
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [scheduleVisibility, setScheduleVisibility] = useState("all_days");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const createRoleMutation = useCreateRole();

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategoryPermissionCount = (categoryId: string) => {
    const category = permissionCategories.find(c => c.id === categoryId);
    if (!category) return { selected: 0, total: 0 };
    const selected = category.permissions.filter(p => selectedPermissions.includes(p.id)).length;
    return { selected, total: category.permissions.length };
  };

  const handleSubmit = () => {
    if (!roleName.trim()) {
      toast.error("Digite um nome para a função");
      return;
    }

    createRoleMutation.mutate({
      name: roleName,
      permissions: selectedPermissions,
    }, {
      onSuccess: () => {
        setRoleName("");
        setRoleDescription("");
        setSelectedPermissions([]);
        setScheduleVisibility("all_days");
        setExpandedCategories([]);
        onOpenChange(false);
        toast.success(`Função "${roleName}" criada com sucesso!`);
      },
      onError: (error) => {
        toast.error("Erro ao criar função: " + error.message);
      }
    });
  };

  const handleClose = () => {
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setScheduleVisibility("all_days");
    setExpandedCategories([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Nova Função
          </DialogTitle>
          <DialogDescription>
            Defina o nome, descrição e as permissões para a nova função
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
                {permissionCategories.map((category) => {
                  const { selected, total } = getCategoryPermissionCount(category.id);
                  const isExpanded = expandedCategories.includes(category.id);

                  return (
                    <Collapsible
                      key={category.id}
                      open={isExpanded}
                      onOpenChange={() => handleToggleCategory(category.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-medium">{category.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {selected}/{total} ativas
                          </span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-4 mt-2 space-y-2">
                          {category.permissions.map((permission) => {
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
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-primary hover:bg-primary/90"
            disabled={createRoleMutation.isPending}
          >
            {createRoleMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Criar Função
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
