import { T } from "@/shared/components/i18n/T";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Plus, Trash2, Settings2, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useJobs, Job } from "@/hooks/useJobs";
import { useStaff } from "@/hooks/useStaff";
import { usePayrollRules, PayrollRule, useSavePayrollRules } from "@/hooks/usePayrollRules";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/currency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { resolveAssignedPayrollStaff, shouldIncludePayrollJobStatus } from "../utils/payrollAssignment";

interface EmployeePayrollData {
  staffId: string;
  staffName: string;
  jobs: Array<{
    jobId: string;
    customerName: string;
    serviceType: string;
    amount: number;
    hoursWorked: number;
    date: string;
  }>;
  totalJobsAmount: number;
  totalHoursWorked: number;
  // From payroll rules
  baseValue: number;
  extraValue: number;
  bonusWeekly: number;
  bonusMonthly: number;
  bonusYearly1: number;
  bonusYearly2: number;
  bonusPerformance: number;
  bonusChristmas: number;
  // Calculated
  totalBonus: number;
  finalValue: number;
  // Manual bonuses added in modal
  manualBonuses: Array<{
    id: string;
    type: string;
    description: string;
    value: number;
  }>;
}

interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  baseValue: number;
  bonuses: Array<{
    id: string;
    type: string;
    description: string;
    value: number;
  }>;
  totalBonus: number;
  finalValue: number;
}

interface ExistingPayrollRecord {
  id: string;
  staff_id: string | null;
  employee_name: string;
  bonus: number;
  period_start: string;
  period_end: string;
}

interface CalculatePayrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: Date;
  endDate: Date;
  onConfirm: (calculations: PayrollCalculation[]) => void;
  existingRecords?: ExistingPayrollRecord[];
}

const bonusTypes = [
  "Bônus da Semana",
  "Bônus Mensal",
  "Bônus de Um Ano",
  "Bônus de Performance",
  "Bônus de Natal",
  "Outro"
];

export function CalculatePayrollModal({
  open,
  onOpenChange,
  startDate,
  endDate,
  onConfirm,
  existingRecords = []
}: CalculatePayrollModalProps) {
  const { data: jobs = [], isLoading: loadingJobs } = useJobs();
  const { data: staffList = [], isLoading: loadingStaff } = useStaff();
  const { data: payrollRules = [], isLoading: loadingRules } = usePayrollRules();
  const { data: companySettings } = useCompanySettings();
  const companyCurrency = companySettings?.currency || "USD";
  const savePayrollRules = useSavePayrollRules();

  const [employeeData, setEmployeeData] = useState<EmployeePayrollData[]>([]);
  const [editingRulesFor, setEditingRulesFor] = useState<string | null>(null);
  const [addingBonusFor, setAddingBonusFor] = useState<string | null>(null);
  const [newBonusType, setNewBonusType] = useState("");
  const [newBonusDescription, setNewBonusDescription] = useState("");
  const [newBonusValue, setNewBonusValue] = useState("");
  const [includeNonCompleted, setIncludeNonCompleted] = useState(false);

  const periodStr = `${format(startDate, "MM/dd/yyyy")} - ${format(endDate, "MM/dd/yyyy")}`;
  const periodStartISO = format(startDate, "yyyy-MM-dd");
  const periodEndISO = format(endDate, "yyyy-MM-dd");

  const isLoading = loadingJobs || loadingStaff || loadingRules;

  // Calculate employee data from jobs (completed or all based on toggle)
  useEffect(() => {
    if (isLoading || !open) return;

    const rulesByStaffId = new Map<string, PayrollRule>();
    payrollRules.forEach((r) => rulesByStaffId.set(r.staff_id, r));

    // Filter jobs within the selected period
    const filteredJobs = jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      
      if (!shouldIncludePayrollJobStatus(job.status, includeNonCompleted)) return false;

      // scheduled_date might be ISO; keep YYYY-MM-DD
      const jobDate = job.scheduled_date.slice(0, 10);
      return jobDate >= periodStartISO && jobDate <= periodEndISO;
    });

    // Group by staff
    const staffMap = new Map<string, EmployeePayrollData>();

    for (const job of filteredJobs) {
      const assignedList = job.staff_assigned || [];
      if (assignedList.length === 0) continue;

      const customerName = job.customer?.name || "Unknown";
      const serviceType = job.service_type || "General Cleaning";
      const hoursWorked = job.duration_minutes ? job.duration_minutes / 60 : 0;

      // Resolve staff list from staff_assigned (supports UUIDs, names, and team numbers)
      const resolved = assignedList.flatMap((assignedValue) => resolveAssignedPayrollStaff(assignedValue, staffList));
      const uniqueStaff = Array.from(new Map(resolved.map((s) => [s.id, s])).values());
      if (uniqueStaff.length === 0) continue;

      const hoursPerStaff = hoursWorked / uniqueStaff.length;

      for (const staffMember of uniqueStaff) {
        const rules = rulesByStaffId.get(staffMember.id);
        const unitValue = rules?.base_value || 0; // value per service/job

        const existing = staffMap.get(staffMember.id);
        const jobData = {
          jobId: job.id,
          customerName,
          serviceType,
          amount: unitValue,
          hoursWorked: hoursPerStaff,
          date: job.scheduled_date?.slice(0, 10) || "",
        };

        if (existing) {
          existing.jobs.push(jobData);
          existing.totalJobsAmount += unitValue;
          existing.totalHoursWorked += jobData.hoursWorked;
        } else {
          staffMap.set(staffMember.id, {
            staffId: staffMember.id,
            staffName: staffMember.name,
            jobs: [jobData],
            totalJobsAmount: unitValue,
            totalHoursWorked: jobData.hoursWorked,
            // From payroll rules
            baseValue: unitValue,
            extraValue: rules?.extra_value || 0,
            bonusWeekly: rules?.bonus_weekly || 0,
            bonusMonthly: rules?.bonus_monthly || 0,
            bonusYearly1: rules?.bonus_yearly_1 || 0,
            bonusYearly2: rules?.bonus_yearly_2 || 0,
            bonusPerformance: rules?.bonus_performance || 0,
            bonusChristmas: rules?.bonus_christmas || 0,
            // Calculated
            totalBonus: 0,
            finalValue: 0,
            manualBonuses: [],
          });
        }
      }
    }

    // Load existing bonuses from saved payroll records for this period
    const existingBonusByStaffId = new Map<string, number>();
    const periodRecords = existingRecords.filter(
      (r) => r.period_start === periodStartISO && r.period_end === periodEndISO
    );
    
    for (const record of periodRecords) {
      if (record.staff_id && record.bonus > 0) {
        const currentBonus = existingBonusByStaffId.get(record.staff_id) || 0;
        existingBonusByStaffId.set(record.staff_id, currentBonus + record.bonus);
      }
    }

    // Calculate totals and load saved bonuses
    const data = Array.from(staffMap.values()).map((emp) => {
      const rulesBonusTotal =
        emp.bonusWeekly +
        emp.bonusMonthly +
        emp.bonusYearly1 +
        emp.bonusYearly2 +
        emp.bonusPerformance +
        emp.bonusChristmas;
      
      // Check if there's an existing saved bonus for this employee
      const savedBonus = existingBonusByStaffId.get(emp.staffId) || 0;
      
      // If there's a saved bonus, add it as a manual bonus so user can edit it
      const initialManualBonuses: typeof emp.manualBonuses = savedBonus > 0
        ? [{ id: `saved-bonus-${emp.staffId}`, type: "Bônus Salvo", description: "Bônus previamente salvo", value: savedBonus }]
        : [];
      
      const manualBonusTotal = initialManualBonuses.reduce((sum, b) => sum + b.value, 0);
      const totalBonus = rulesBonusTotal + manualBonusTotal;

      // Total = (unitValue * qtd jobs) + extra + bonuses
      const finalValue = emp.totalJobsAmount + emp.extraValue + totalBonus;

      return {
        ...emp,
        manualBonuses: initialManualBonuses,
        totalBonus,
        finalValue,
    };
    });

    setEmployeeData(data);
  }, [open, jobs, staffList, payrollRules, existingRecords, isLoading, periodStartISO, periodEndISO, includeNonCompleted]);

  const recalculateTotals = (data: EmployeePayrollData[]): EmployeePayrollData[] => {
    return data.map((emp) => {
      const rulesBonusTotal =
        emp.bonusWeekly +
        emp.bonusMonthly +
        emp.bonusYearly1 +
        emp.bonusYearly2 +
        emp.bonusPerformance +
        emp.bonusChristmas;
      const manualBonusTotal = emp.manualBonuses.reduce((sum, b) => sum + b.value, 0);
      const totalBonus = rulesBonusTotal + manualBonusTotal;

      const finalValue = emp.totalJobsAmount + emp.extraValue + totalBonus;

      return {
        ...emp,
        totalBonus,
        finalValue,
      };
    });
  };

  const handleUpdateRule = (staffId: string, field: keyof EmployeePayrollData, value: number) => {
    setEmployeeData((prev) =>
      recalculateTotals(
        prev.map((emp) => (emp.staffId === staffId ? { ...emp, [field]: value } : emp))
      )
    );
  };

  const handleSaveRules = async (staffId: string) => {
    const emp = employeeData.find((e) => e.staffId === staffId);
    if (!emp) return;

    try {
      await savePayrollRules.mutateAsync([
        {
          staff_id: staffId,
          base_value: emp.baseValue,
          extra_value: emp.extraValue,
          bonus_weekly: emp.bonusWeekly,
          bonus_monthly: emp.bonusMonthly,
          bonus_yearly_1: emp.bonusYearly1,
          bonus_yearly_2: emp.bonusYearly2,
          bonus_performance: emp.bonusPerformance,
          bonus_christmas: emp.bonusChristmas,
        },
      ]);
      setEditingRulesFor(null);
    } catch (error) {
      console.error("Error saving rules:", error);
    }
  };

  const handleAddBonus = (staffId: string) => {
    if (!newBonusType || !newBonusValue) {
      toast({
        title: "Erro",
        description: "Preencha tipo e valor do bônus.",
        variant: "destructive",
      });
      return;
    }

    const numericValue = parseFloat(newBonusValue.replace(",", "."));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido.",
        variant: "destructive",
      });
      return;
    }

    const newBonus = {
      id: `bonus-${Date.now()}`,
      type: newBonusType,
      description: newBonusDescription || newBonusType,
      value: numericValue,
    };

    setEmployeeData((prev) =>
      recalculateTotals(
        prev.map((emp) =>
          emp.staffId === staffId
            ? { ...emp, manualBonuses: [...emp.manualBonuses, newBonus] }
            : emp
        )
      )
    );

    setAddingBonusFor(null);
    setNewBonusType("");
    setNewBonusDescription("");
    setNewBonusValue("");
  };

  const handleRemoveBonus = (staffId: string, bonusId: string) => {
    setEmployeeData((prev) =>
      recalculateTotals(
        prev.map((emp) =>
          emp.staffId === staffId
            ? { ...emp, manualBonuses: emp.manualBonuses.filter((b) => b.id !== bonusId) }
            : emp
        )
      )
    );
  };

  const totalPayroll = employeeData.reduce((sum, c) => sum + c.finalValue, 0);

  const handleDownloadExcel = async () => {
    const { default: XLSX } = await import("xlsx-js-style");
    const workbook = XLSX.utils.book_new();

    const border = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    employeeData.forEach((emp) => {
      const allRows: (string | number)[][] = [
        ["", "", "", "", "PAYROLL"],
        ["", "", "", "", emp.staffName],
        ["", "", "", "", periodStr],
        ["", "", "", "", ""],
        ["Data", "Cliente", "Serviço", "Horas", "Valor"],
      ];

      emp.jobs.forEach((job) => {
        allRows.push([
          job.date,
          job.customerName,
          job.serviceType,
          job.hoursWorked.toFixed(2),
          job.amount,
        ]);
      });

      allRows.push(["", "", "", "", ""]);
      allRows.push(["Total Jobs", "", "", emp.totalHoursWorked.toFixed(2), emp.totalJobsAmount]);
      allRows.push(["Valor Base", "", "", "", emp.baseValue]);
      allRows.push(["Valor Extra", "", "", "", emp.extraValue]);
      allRows.push(["Total Bônus", "", "", "", emp.totalBonus]);
      allRows.push(["VALOR FINAL", "", "", "", emp.finalValue]);

      const worksheet = XLSX.utils.aoa_to_sheet(allRows);

      for (let row = 0; row <= 2; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: row === 0, sz: row === 0 ? 14 : 11 },
            alignment: { horizontal: "left", vertical: "center" },
          };
        }
      }

      worksheet["!cols"] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 20 },
        { wch: 10 },
        { wch: 15 },
      ];

      const sheetName = emp.staffName.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `payroll_calculation_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({
      title: "Download iniciado",
      description: "Arquivo Excel gerado com sucesso.",
    });
  };

  const handleConfirm = () => {
    const calculations: PayrollCalculation[] = employeeData.map((emp) => ({
      employeeId: emp.staffId,
      employeeName: emp.staffName,
      baseValue: emp.totalJobsAmount + emp.extraValue,
      bonuses: emp.manualBonuses,
      totalBonus: emp.totalBonus,
      finalValue: emp.finalValue,
    }));

    onConfirm(calculations);
    onOpenChange(false);
    toast({
      title: "Payroll calculado",
      description: `${calculations.length} registros criados para o período ${periodStr}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Calcular Payroll - {periodStr}</DialogTitle>
        </DialogHeader>

        {/* Option to include non-completed jobs */}
        <div className="flex items-center space-x-2 py-2 px-1 border-b">
          <Checkbox
            id="includeNonCompleted"
            checked={includeNonCompleted}
            onCheckedChange={(checked) => setIncludeNonCompleted(checked === true)}
          />
          <label
            htmlFor="includeNonCompleted"
            className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
          >
            Incluir jobs não finalizados (agendados/em andamento)
            {includeNonCompleted && (
              <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <T k="literal.payroll.modo_fechamento_antecipado.6806f003" />
              </span>
            )}
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground"><T k="literal.payroll.carregando_dados.423bd789" /></span>
          </div>
        ) : employeeData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum job {includeNonCompleted ? "agendado ou completado" : "completado"} encontrado no período selecionado.</p>
            <p className="text-sm mt-2">
              {includeNonCompleted 
                ? "Jobs com status 'Scheduled', 'In Progress' ou 'Completed' são considerados."
                : "Apenas jobs com status 'Completed' são considerados. Ative a opção acima para incluir jobs não finalizados."}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[55vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]"><T k="payroll.employee" /></TableHead>
                    <TableHead className="w-[80px]"><T k="audit.jobs" /></TableHead>
                    <TableHead className="w-[120px]"><T k="literal.payroll.valor_jobs.a4875f04" /></TableHead>
                    <TableHead><T k="literal.payroll.bonus.ad1b0b12" /></TableHead>
                    <TableHead className="w-[120px]"><T k="literal.payroll.valor_final.d0ad230b" /></TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeData.map((emp) => (
                    <TableRow key={emp.staffId}>
                      <TableCell className="font-medium">{emp.staffName}</TableCell>
                      <TableCell>{emp.jobs.length}</TableCell>
                      <TableCell>{formatCurrency(emp.totalJobsAmount, companyCurrency)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {emp.manualBonuses.map((bonus) => (
                            <div
                              key={bonus.id}
                              className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded"
                            >
                              <span className="flex-1">
                                <strong>{bonus.type}</strong>: {formatCurrency(bonus.value, companyCurrency)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemoveBonus(emp.staffId, bonus.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}

                          {addingBonusFor === emp.staffId ? (
                            <div className="space-y-2 p-2 border rounded bg-background">
                              <Select value={newBonusType} onValueChange={setNewBonusType}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Tipo de bônus" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {bonusTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Descrição (opcional)"
                                value={newBonusDescription}
                                onChange={(e) => setNewBonusDescription(e.target.value)}
                                className="h-8"
                              />
                              <Input
                                placeholder="Valor"
                                value={newBonusValue}
                                onChange={(e) => setNewBonusValue(e.target.value)}
                                className="h-8"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAddBonus(emp.staffId)}>
                                  <T k="common.add" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingBonusFor(null)}
                                >
                                  <T k="common.cancel" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setAddingBonusFor(emp.staffId)}
                            >
                              <Plus className="h-3 w-3" /> <T k="literal.payroll.bonus.ad1b0b12" />
                            </Button>
                          )}

                          {emp.totalBonus > 0 && (
                            <div className="text-xs text-success font-medium">
                              Total: +${emp.totalBonus.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        {formatCurrency(emp.finalValue, companyCurrency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setEditingRulesFor(editingRulesFor === emp.staffId ? null : emp.staffId)
                          }
                          title="Configurar regras"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Rules Editor */}
              {editingRulesFor && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">
                      Regras de Pagamento -{" "}
                      {employeeData.find((e) => e.staffId === editingRulesFor)?.staffName}
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => handleSaveRules(editingRulesFor)}
                      disabled={savePayrollRules.isPending}
                    >
                      {savePayrollRules.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Salvar Regras
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.valor_base.488dc823" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.baseValue || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "baseValue", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.valor_extra.ae5e4ad2" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.extraValue || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "extraValue", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.bonus_semanal.1191d68d" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusWeekly || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusWeekly", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.bonus_mensal.2ad9f51f" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusMonthly || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusMonthly", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bônus 1º Ano</Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusYearly1 || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusYearly1", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bônus 2º Ano</Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusYearly2 || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusYearly2", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.bonus_performance.9558b111" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusPerformance || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusPerformance", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs"><T k="literal.payroll.bonus_natal.e4e20bd8" /></Label>
                      <Input
                        type="number"
                        value={
                          employeeData.find((e) => e.staffId === editingRulesFor)?.bonusChristmas || 0
                        }
                        onChange={(e) =>
                          handleUpdateRule(editingRulesFor, "bonusChristmas", parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="space-y-1">
                <div className="text-lg font-semibold">
                  <T k="literal.payroll.total_payroll.9b79ebb0" /> <span className="text-primary">{formatCurrency(totalPayroll, companyCurrency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {employeeData.length} funcionário(s) • Atualizado em tempo real
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <T k="common.cancel" />
              </Button>
              <Button variant="outline" onClick={handleDownloadExcel} className="gap-2">
                <Download className="w-4 h-4" />
                <T k="payroll.downloadExcel" />
              </Button>
              <Button onClick={handleConfirm}><T k="literal.payroll.confirmar_payroll.a54b568f" /></Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { PayrollCalculation };
