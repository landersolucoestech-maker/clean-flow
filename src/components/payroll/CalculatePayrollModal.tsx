import { useState, useMemo, useEffect, useCallback } from "react";
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
import XLSX from "xlsx-js-style";
import { useJobs, Job } from "@/hooks/useJobs";
import { useStaff, Staff } from "@/hooks/useStaff";
import { usePayrollRules, PayrollRule, useSavePayrollRules } from "@/hooks/usePayrollRules";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/currency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  // Helper functions
  const normalizeName = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const findStaffFromAssignedValue = useCallback((assignedValue: string): Staff[] => {
    if (!assignedValue) return [];

    const raw = assignedValue.trim();

    // 1) If staff_assigned stores staff IDs (UUID)
    if (isUuid(raw)) {
      const staff = staffList.find((s) => s.id === raw);
      return staff ? [staff] : [];
    }

    // 2) Team number / "Team 1" fallback
    const teamMatch = raw.match(/^team\s*(\d+)$/i) || raw.match(/^(\d+)$/);
    if (teamMatch) {
      const teamNumber = teamMatch[1];
      return staffList.filter((s) => s.is_active && s.team === teamNumber);
    }

    // 3) Exact name match
    const a = normalizeName(raw);
    if (!a) return [];

    const exactMatch = staffList.find((s) => normalizeName(s.name) === a);
    if (exactMatch) return [exactMatch];

    // 4) Fuzzy name match
    let best: { staff: Staff; score: number } | null = null;

    for (const s of staffList) {
      const sn = normalizeName(s.name);
      if (!sn) continue;

      let score = 0;
      if (sn.includes(a)) score += 50;
      if (a.includes(sn)) score += 30;

      const aTokens = a.split(" ");
      const sTokens = new Set(sn.split(" "));
      const tokenMatches = aTokens.filter((t) => sTokens.has(t)).length;
      score += tokenMatches * 6;

      if (aTokens.length === 1 && sTokens.has(aTokens[0])) score += 25;

      if (!best || score > best.score) best = { staff: s, score };
    }

    return best && best.score >= 15 ? [best.staff] : [];
  }, [staffList]);

  // Calculate employee data from jobs (completed or all based on toggle)
  useEffect(() => {
    if (isLoading || !open) return;

    const isCompletedStatus = (status: string | null) => {
      if (!status) return false;
      const s = status.toLowerCase().trim();
      return (
        s.includes("completed") ||
        s.includes("finished") ||
        s.includes("done") ||
        s.includes("conclu") ||
        s.includes("finaliz")
      );
    };

    const isScheduledOrInProgress = (status: string | null) => {
      if (!status) return false;
      const s = status.toLowerCase().trim();
      return (
        s.includes("scheduled") ||
        s.includes("agendado") ||
        s.includes("in_progress") ||
        s.includes("em_andamento") ||
        s.includes("on_our_way") ||
        s.includes("a_caminho") ||
        s.includes("cleaning")
      );
    };

    const rulesByStaffId = new Map<string, PayrollRule>();
    payrollRules.forEach((r) => rulesByStaffId.set(r.staff_id, r));

    // Filter jobs within the selected period
    const filteredJobs = jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      
      // Check if job should be included based on status
      const isCompleted = isCompletedStatus(job.status);
      const isInProgress = isScheduledOrInProgress(job.status);
      
      // If includeNonCompleted is true, include both completed and scheduled/in-progress jobs
      // Otherwise, only include completed jobs
      if (!includeNonCompleted && !isCompleted) return false;
      if (includeNonCompleted && !isCompleted && !isInProgress) return false;

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
      const resolved = assignedList.flatMap((assignedValue) => findStaffFromAssignedValue(assignedValue));
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
  }, [open, jobs, staffList, payrollRules, existingRecords, isLoading, periodStartISO, periodEndISO, includeNonCompleted, findStaffFromAssignedValue]);

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

  const handleDownloadExcel = () => {
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
                Modo fechamento antecipado
              </span>
            )}
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando dados...</span>
          </div>
        ) : employeeData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
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
                    <TableHead className="w-[180px]">Team Member</TableHead>
                    <TableHead className="w-[80px]">Jobs</TableHead>
                    <TableHead className="w-[120px]">Valor Jobs</TableHead>
                    <TableHead>Bônus</TableHead>
                    <TableHead className="w-[120px]">Valor Final</TableHead>
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
                                  Adicionar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingBonusFor(null)}
                                >
                                  Cancelar
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
                              <Plus className="h-3 w-3" /> Bônus
                            </Button>
                          )}

                          {emp.totalBonus > 0 && (
                            <div className="text-xs text-green-600 font-medium">
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
                      <Label className="text-xs">Valor Base</Label>
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
                      <Label className="text-xs">Valor Extra</Label>
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
                      <Label className="text-xs">Bônus Semanal</Label>
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
                      <Label className="text-xs">Bônus Mensal</Label>
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
                      <Label className="text-xs">Bônus Performance</Label>
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
                      <Label className="text-xs">Bônus Natal</Label>
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
                  Total Payroll: <span className="text-primary">{formatCurrency(totalPayroll, companyCurrency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {employeeData.length} funcionário(s) • Atualizado em tempo real
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={handleDownloadExcel} className="gap-2">
                <Download className="w-4 h-4" />
                Download Excel
              </Button>
              <Button onClick={handleConfirm}>Confirmar Payroll</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { PayrollCalculation };
