import { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Users } from "lucide-react";
import { useStaff } from "@/hooks/useStaff";
import { usePayrollRules, useSavePayrollRules } from "@/hooks/usePayrollRules";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

interface PayrollRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StaffRuleData {
  staffId: string;
  staffName: string;
  team: string | null;
  role: AppRole | null;
  baseValue: number;
}

// Map role enum to display label
const getRoleLabel = (role: AppRole | null): string => {
  if (!role) return "Staff";
  const roleLabels: Record<AppRole, string> = {
    admin: "Admin",
    cleaner: "Cleaner",
    driver: "Driver",
    cleaning_manager: "Cleaning Team Manager",
    office_manager: "Office Manager",
    virtual_assistant: "Virtual Assistant",
  };
  return roleLabels[role] || role;
};

// Get badge variant based on role
const getRoleBadgeVariant = (role: AppRole | null): "default" | "secondary" | "destructive" | "outline" => {
  if (!role) return "secondary";
  switch (role) {
    case "admin":
      return "default";
    case "cleaner":
      return "destructive";
    case "driver":
      return "secondary";
    case "cleaning_manager":
    case "office_manager":
      return "outline";
    case "virtual_assistant":
      return "secondary";
    default:
      return "secondary";
  }
};

export function PayrollRulesModal({ open, onOpenChange }: PayrollRulesModalProps) {
  const { data: staffList = [], isLoading: loadingStaff } = useStaff();
  const { data: payrollRules = [], isLoading: loadingRules } = usePayrollRules();
  const savePayrollRules = useSavePayrollRules();
  
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editedRules, setEditedRules] = useState<Record<string, Partial<StaffRuleData>>>({});

  const isLoading = loadingStaff || loadingRules;

  // Build staff rules data
  const staffRulesData: StaffRuleData[] = useMemo(() => {
    return staffList
      .filter(s => s.is_active)
      .map(staff => {
        const existingRule = payrollRules.find(r => r.staff_id === staff.id);
        const edited = editedRules[staff.id] || {};
        
        // Get role from staff_roles table
        const staffRole = staff.staff_roles?.role ?? null;
        
        return {
          staffId: staff.id,
          staffName: staff.name,
          team: staff.team,
          role: staffRole,
          baseValue: edited.baseValue ?? existingRule?.base_value ?? 0,
        };
      })
      .sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [staffList, payrollRules, editedRules]);

  // Auto-select first staff if none selected
  const selectedStaff = useMemo(() => {
    if (selectedStaffId) {
      return staffRulesData.find(s => s.staffId === selectedStaffId);
    }
    if (staffRulesData.length > 0) {
      return staffRulesData[0];
    }
    return null;
  }, [staffRulesData, selectedStaffId]);

  const handleFieldChange = (staffId: string, field: keyof StaffRuleData, value: number) => {
    setEditedRules(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    const rulesToSave = staffRulesData
      .filter(s => editedRules[s.staffId])
      .map(s => ({
        staff_id: s.staffId,
        base_value: s.baseValue,
        extra_value: 0,
        bonus_weekly: 0,
        bonus_monthly: 0,
        bonus_yearly_1: 0,
        bonus_yearly_2: 0,
        bonus_performance: 0,
        bonus_christmas: 0,
      }));

    if (rulesToSave.length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Não há regras modificadas para salvar.",
      });
      return;
    }

    try {
      await savePayrollRules.mutateAsync(rulesToSave);
      setEditedRules({});
      toast({
        title: "Regras salvas",
        description: `${rulesToSave.length} regra(s) de payroll atualizada(s) com sucesso.`,
      });
    } catch (error) {
      console.error("Error saving payroll rules:", error);
    }
  };

  const hasChanges = Object.keys(editedRules).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold">Regras de Pagamento e Bônus</h2>
            <p className="text-muted-foreground">Configure as regras por funcionário</p>
          </div>
          <Button 
            onClick={handleSaveAll} 
            disabled={!hasChanges || savePayrollRules.isPending}
            className="gap-2"
          >
            {savePayrollRules.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Todas as Regras
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex min-h-[500px]">
            {/* Left column - Staff list */}
            <div className="w-[300px] border-r">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Funcionários</span>
                </div>
              </div>
              <ScrollArea className="h-[450px]">
                <div className="p-2">
                  {staffRulesData.map((staff) => {
                    const isSelected = selectedStaff?.staffId === staff.staffId;
                    
                    return (
                      <button
                        key={staff.staffId}
                        onClick={() => setSelectedStaffId(staff.staffId)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors mb-1",
                          isSelected 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="font-medium">{staff.staffName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(staff.role)} className="text-xs">
                            {getRoleLabel(staff.role)}
                          </Badge>
                          {staff.team && (
                            <span className="text-xs text-muted-foreground">
                              Team {staff.team}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right column - Staff details */}
            <div className="flex-1 p-6">
              {selectedStaff ? (
                <div className="space-y-6">
                  {/* Staff header */}
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-2xl font-semibold">{selectedStaff.staffName}</h3>
                      <Badge variant={getRoleBadgeVariant(selectedStaff.role)}>
                        {getRoleLabel(selectedStaff.role)}
                      </Badge>
                      {selectedStaff.team && (
                        <Badge variant="outline">
                          Team {selectedStaff.team}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Pagamento = Valor por serviço × Quantidade de Jobs
                    </p>
                  </div>

                  {/* Payment section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseValue">Valor por Serviço ($)</Label>
                      <Input
                        id="baseValue"
                        type="number"
                        value={selectedStaff.baseValue}
                        onChange={(e) => handleFieldChange(selectedStaff.staffId, "baseValue", Number(e.target.value))}
                        className="max-w-md"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Formula card */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Fórmula de Cálculo:</h4>
                      <p className="text-sm">
                        <strong>Pagamento Total</strong> = Valor por Serviço × Quantidade de Jobs
                      </p>
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p>• Valor por serviço: <strong>${selectedStaff.baseValue}</strong></p>
                        <p className="text-xs mt-1 italic">
                          Exemplo: 10 jobs = ${selectedStaff.baseValue} × 10 = <strong>${selectedStaff.baseValue * 10}</strong>
                        </p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          * Bônus será adicionado ao clicar em "Calculate Payroll"
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {hasChanges && editedRules[selectedStaff.staffId] && (
                    <p className="text-sm text-amber-600">
                      * Alterações não salvas para este funcionário
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Selecione um funcionário para configurar as regras
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { PayrollRulesModalProps };
