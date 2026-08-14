import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CalendarIcon, Download, Calculator, Search, ChevronUp, ChevronDown, Check, ChevronsUpDown, X, Loader2, MoreHorizontal, Send, FileDown, Eye, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isWithinInterval, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { CalculatePayrollModal, PayrollCalculation } from "@/components/payroll/CalculatePayrollModal";
import { PayrollRulesModal } from "@/components/payroll/PayrollRulesModal";
import { usePayrollRecords, useCreatePayrollRecords, useUpdatePayrollStatus, useDeletePayrollRecords, PayrollRecord as DBPayrollRecord } from "@/hooks/usePayrollRecords";
import { usePayrollRules } from "@/hooks/usePayrollRules";
import { useStaff } from "@/hooks/useStaff";
import { useLanguage } from "@/contexts/useLanguage";
import { useJobs } from "@/hooks/useJobs";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { formatCurrency } from "@/lib/currency";
import { getErrorMessage } from "@/lib/errors";
import type { PayrollListRow, PayrollRecord, PayrollSortDirection, PayrollSortField } from "./types/payrollView";
import { buildPayrollListRows, isCompletedJobStatus, isUuid, normalizePayrollName, sortPayrollRecords } from "./utils/payrollView";
import { fetchExistingPayrollRecordKeys, fetchPayrollRecordsForPeriod, sendPayrollStatementSms, updatePayrollRecordValues } from "./services/payrollDataService";

const PayrollPDFPreviewModal = lazy(() =>
  import("@/components/payroll/PayrollPDFPreviewModal").then(({ PayrollPDFPreviewModal }) => ({
    default: PayrollPDFPreviewModal,
  })),
);


export function Payroll() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [sortField, setSortField] = useState<PayrollSortField>("period");
  const [sortDirection, setSortDirection] = useState<PayrollSortDirection>("desc");
  
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [calculateModalOpen, setCalculateModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [showClearButton, setShowClearButton] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // PDF Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<PayrollListRow | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Bulk SMS sending state
  const [isSendingBulkSMS, setIsSendingBulkSMS] = useState(false);
  const [bulkSMSProgress, setBulkSMSProgress] = useState({ sent: 0, total: 0 });
  
  // Generate from jobs state
  const [isGeneratingFromJobs, setIsGeneratingFromJobs] = useState(false);

  // Fetch data from database
  const { data: dbPayrollRecords = [], isLoading: isLoadingPayroll } = usePayrollRecords();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff();
  const { data: jobsList = [], isLoading: isLoadingJobs } = useJobs();
  const { data: payrollRules = [] } = usePayrollRules();
  const { data: companySettings } = useCompanySettings();
  const companyCurrency = companySettings?.currency || "USD";
  const createPayrollRecords = useCreatePayrollRecords();
  const updatePayrollStatus = useUpdatePayrollStatus();
  const deletePayrollRecords = useDeletePayrollRecords();

  // Map staff_id -> base_value from payroll rules
  const staffBaseValueMap = useMemo(() => {
    const map = new Map<string, number>();
    payrollRules.forEach((rule) => {
      map.set(rule.staff_id, rule.base_value);
    });
    return map;
  }, [payrollRules]);

  // Map staff_id -> payment_method from staff list
  const staffPaymentMethodMap = useMemo(() => {
    const map = new Map<string, string>();
    staffList.forEach((staff) => {
      if (staff.payment_method) {
        map.set(staff.id, staff.payment_method);
      }
    });
    return map;
  }, [staffList]);

  // Transform DB records to local format - USE REAL VALUES FROM DATABASE
  const payrollData: PayrollRecord[] = useMemo(() => {
    return dbPayrollRecords.map((record) => {
      const match = record.notes?.match(/^Job\s+([a-f0-9]+)/i);
      const jobIdShort = match ? match[1].toLowerCase() : null;

      const staffId = record.staff_id ?? null;
      
      // USE the actual base_value stored in the record, not from payroll_rules
      // This is the real value that was recorded when the payroll was generated
      const unitValue = Number(record.base_value) || 0;
      
      // Get payment method from staff, fallback to record's payment_type
      const paymentMethod = staffId 
        ? (staffPaymentMethodMap.get(staffId) || record.payment_type)
        : record.payment_type;

      return {
        id: record.id,
        periodStartISO: record.period_start,
        periodEndISO: record.period_end,
        period: `${format(new Date(record.period_start), "MM/dd/yyyy")} - ${format(new Date(record.period_end), "MM/dd/yyyy")}`,
        employeeName: record.employee_name,
        staffId,
        cleaningType: record.cleaning_type || "General Cleaning",
        client: record.client || "N/A",
        baseValue: unitValue,
        bonus: Number(record.bonus) || 0,
        paymentType: paymentMethod as PayrollRecord["paymentType"],
        status: record.status,
        jobIdShort,
      };
    });
  }, [dbPayrollRecords, staffPaymentMethodMap]);

  // Filtered data state - now shows all data by default, filters are optional
  const [localFilteredData, setLocalFilteredData] = useState<PayrollRecord[] | null>(null);
  const [hasFiltered, setHasFiltered] = useState(false);

  // Show all records by default, or filtered records if filter is applied
  const filteredData = hasFiltered && localFilteredData !== null ? localFilteredData : payrollData;

  // Consolidated list (period + team member)
  const payrollListRows: PayrollListRow[] = useMemo(
    () => buildPayrollListRows(filteredData, staffList, sortField, sortDirection),
    [filteredData, staffList, sortField, sortDirection],
  );

  const payrollGroupIdToRecordIds = useMemo(() => {
    const map = new Map<string, string[]>();
    payrollListRows.forEach((r) => map.set(r.id, r.recordIds));
    return map;
  }, [payrollListRows]);

  const periodStatus = startDate && endDate ? "Open" : "Closed";
  // Helper function to parse dd/MM/yyyy format
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const handleFilter = async () => {
    if (!startDate || !endDate) {
      toast({
        title: t("payroll.noRecordsSelected"),
        description: t("payroll.selectPeriodError"),
        variant: "destructive",
      });
      return;
    }

    const periodStartISO = format(startDate, "yyyy-MM-dd");
    const periodEndISO = format(endDate, "yyyy-MM-dd");

    // Filter payroll records by period dates
    let filtered = payrollData.filter((r) => {
      return r.periodStartISO >= periodStartISO && r.periodEndISO <= periodEndISO;
    });

    if (selectedEmployee && selectedEmployee !== "all") {
      filtered = filtered.filter((record) => record.employeeName === selectedEmployee);
    }

    if (selectedStatus && selectedStatus !== "all") {
      filtered = filtered.filter((record) => record.status === selectedStatus);
    }

    setLocalFilteredData(sortPayrollRecords(filtered, sortField, sortDirection));
    setHasFiltered(true);
    setShowClearButton(true);
    toast({
      title: t("payroll.filterApplied"),
      description: `${filtered.length} ${t("payroll.recordsFound")}`,
    });
  };

  const handleClearFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedEmployee("all");
    setSelectedStatus("all");
    setLocalFilteredData(null);
    setHasFiltered(false);
    setShowClearButton(false);
    setSelectedRows([]);
    toast({
      title: t("payroll.filtersCleared"),
      description: t("payroll.showingAllRecords")
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;
    
    try {
      await deletePayrollRecords.mutateAsync(selectedRows);
      toast({
        title: "Registros excluídos",
        description: `${selectedRows.length} registro(s) removido(s) com sucesso.`
      });
      setSelectedRows([]);
      // Refresh filtered data
      if (localFilteredData !== null) {
        const remainingData = localFilteredData.filter(r => !selectedRows.includes(r.id));
        setLocalFilteredData(remainingData);
      }
    } catch (error) {
      console.error("Error deleting records:", error);
    }
  };
  const handleSort = (field: PayrollSortField) => {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);
    setLocalFilteredData(sortPayrollRecords(filteredData, field, newDirection));
  };
  const SortIcon = ({
    field
  }: {
    field: PayrollSortField;
  }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
  };
  const handleOpenCalculateModal = () => {
    if (!startDate || !endDate) {
      toast({
        title: t("payroll.noRecordsSelected"),
        description: t("payroll.selectPeriodError"),
        variant: "destructive"
      });
      return;
    }
    setCalculateModalOpen(true);
  };

  const handleConfirmPayroll = async (calculations: PayrollCalculation[]) => {
    if (!startDate || !endDate) return;

    const periodStartISO = format(startDate, "yyyy-MM-dd");
    const periodEndISO = format(endDate, "yyyy-MM-dd");

    try {
      let freshRecords = await fetchPayrollRecordsForPeriod(periodStartISO, periodEndISO);

      // If there are no records yet, auto-generate them from finished jobs for this period
      if (!freshRecords || freshRecords.length === 0) {
        await handleGenerateFromJobs();

        freshRecords = await fetchPayrollRecordsForPeriod(periodStartISO, periodEndISO);
      }

      if (!freshRecords || freshRecords.length === 0) {
        toast({
          title: "Nenhum registro encontrado",
          description: "Não há jobs finalizados (ou não há staff atribuído) neste período.",
          variant: "destructive",
        });
        return;
      }

      let updatedCount = 0;

      for (const calc of calculations) {
        // Match by staff_id first, fallback to normalized name
        let employeeRecords = freshRecords.filter((r) => r.staff_id === calc.employeeId);

        if (employeeRecords.length === 0) {
          const targetName = normalizePayrollName(calc.employeeName);
          employeeRecords = freshRecords.filter(
            (r) => normalizePayrollName(r.employee_name) === targetName
          );
        }

        if (employeeRecords.length === 0) {
          console.warn(`No records found for employee: ${calc.employeeName} (${calc.employeeId})`);
          continue;
        }

        // Deterministic order so cents distribution is stable
        employeeRecords = employeeRecords.slice().sort((a, b) => a.id.localeCompare(b.id));

        // Distribute bonus across job-records without losing cents
        const totalBonus = Number(calc.totalBonus) || 0;
        const totalBonusCents = Math.round(totalBonus * 100);
        const baseCents = Math.floor(totalBonusCents / employeeRecords.length);
        let remainder = totalBonusCents - baseCents * employeeRecords.length;

        for (const record of employeeRecords) {
          const extraCent = remainder > 0 ? 1 : 0;
          remainder -= extraCent;

          const bonusForThisRecord = (baseCents + extraCent) / 100;
          const unitValue = staffBaseValueMap.get(record.staff_id ?? "") ?? record.base_value;
          const newTotal = unitValue + bonusForThisRecord;

          await updatePayrollRecordValues(record.id, {
            base_value: unitValue,
            bonus: bonusForThisRecord,
            total: newTotal,
          });

          updatedCount++;
        }
      }

      // Invalidate + refetch to ensure the Payroll List shows the saved bonus immediately
      await queryClient.invalidateQueries({ queryKey: ["payroll_records"] });
      await queryClient.refetchQueries({ queryKey: ["payroll_records"], type: "active" });
      
      toast({
        title: "Payroll confirmado",
        description: `${updatedCount} registro(s) atualizado(s) com sucesso.`,
      });

      setCalculateModalOpen(false);
    } catch (error) {
      console.error("Error confirming payroll:", error);
      toast({
        title: "Erro ao confirmar payroll",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Generate payroll from completed jobs
  const handleGenerateFromJobs = async (): Promise<PayrollRecord[]> => {
    if (!startDate || !endDate) {
      toast({
        title: "Selecione o período",
        description: "Selecione a data inicial e final para gerar o payroll.",
        variant: "destructive",
      });
      return [];
    }

    const periodStartISO = format(startDate, "yyyy-MM-dd");
    const periodEndISO = format(endDate, "yyyy-MM-dd");

    // Returns all staff members that match the assigned value
    // Priority: 1) UUID match, 2) Exact name match, 3) Fuzzy name match, 4) Team number fallback
    const findStaffFromAssignedValue = (assignedValue: string): (typeof staffList)[number][] => {
      if (!assignedValue) return [];

      // 1) If staff_assigned stores staff IDs (UUID)
      if (isUuid(assignedValue)) {
        const staff = staffList.find((s) => s.id === assignedValue);
        return staff ? [staff] : [];
      }

      // 2) Try exact name match first (case-insensitive)
      const normalizedInput = normalizePayrollName(assignedValue);
      const exactMatch = staffList.find((s) => normalizePayrollName(s.name) === normalizedInput);
      if (exactMatch) {
        return [exactMatch];
      }

      // 3) Try fuzzy name matching
      let best: { staff: (typeof staffList)[number]; score: number } | null = null;

      for (const s of staffList) {
        const sn = normalizePayrollName(s.name);
        if (!sn) continue;

        let score = 0;
        if (sn.includes(normalizedInput)) score += 50;
        if (normalizedInput.includes(sn)) score += 30;

        const inputTokens = normalizedInput.split(" ");
        const nameTokens = new Set(sn.split(" "));
        const tokenMatches = inputTokens.filter((t) => nameTokens.has(t)).length;
        score += tokenMatches * 10;

        // Single-token assigned (e.g., "Elaine") should match strongly
        if (inputTokens.length === 1 && nameTokens.has(inputTokens[0])) score += 25;

        if (score >= 15 && (!best || score > best.score)) {
          best = { staff: s, score };
        }
      }

      if (best) {
        return [best.staff];
      }

      // 4) Fallback: Check if it's a team number (e.g., "1", "2", "3", etc.)
      const isTeamNumber = /^\d+$/.test(assignedValue.trim());
      if (isTeamNumber) {
        // Find ALL staff members that belong to this team
        const teamMembers = staffList.filter((s) => s.team === assignedValue.trim());
        return teamMembers;
      }

      return [];
    };

    setIsGeneratingFromJobs(true);

    try {
      const existingPeriodRecords = await fetchExistingPayrollRecordKeys(periodStartISO, periodEndISO);

      const existingKeys = new Set<string>(
        existingPeriodRecords
          .filter((r) => !!r.staff_id && !!r.notes)
          .map((r) => `${r.staff_id}|${r.notes}`)
      );

      // Filter completed/finished jobs within the selected period
      const completedJobs = jobsList.filter((job) => {
        if (!isCompletedJobStatus(job.status)) return false;
        if (!job.scheduled_date) return false;

        // scheduled_date is YYYY-MM-DD, so string comparison works
        return job.scheduled_date >= periodStartISO && job.scheduled_date <= periodEndISO;
      });

      if (completedJobs.length === 0) {
        return [];
      }

      // Create one payroll record per job per staff member (split amount)
      const newRecords: Array<{
        period_start: string;
        period_end: string;
        employee_name: string;
        staff_id: string;
        cleaning_type: string;
        client: string;
        base_value: number;
        bonus: number;
        total: number;
        payment_type: string;
        status: "Pending";
        notes?: string;
      }> = [];

      const unmatchedAssigned: string[] = [];

      for (const job of completedJobs) {
        const assignedList = job.staff_assigned || [];
        if (assignedList.length === 0) continue;

        const customerName = job.customer?.name || "Unknown";
        const serviceType = job.service_type || "General Cleaning";

        // Collect all staff members from all assigned values
        const allStaffMembers: (typeof staffList)[number][] = [];
        for (const assignedValue of assignedList) {
          const staffMembers = findStaffFromAssignedValue(assignedValue);
          if (staffMembers.length === 0) {
            unmatchedAssigned.push(assignedValue);
          } else {
            allStaffMembers.push(...staffMembers);
          }
        }

        const uniqueStaffMembers = Array.from(
          new Map(allStaffMembers.map((s) => [s.id, s])).values()
        );

        if (uniqueStaffMembers.length === 0) continue;

        // Each staff member gets their configured base_value per job (1 job = 1x base_value)
        for (const staffMember of uniqueStaffMembers) {
          const staffBaseValue = staffBaseValueMap.get(staffMember.id) ?? 0;
          const notes = `Job ${job.id.slice(0, 8)} • ${job.scheduled_date}`;
          const key = `${staffMember.id}|${notes}`;

          // Skip if it already exists (idempotent generation)
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          newRecords.push({
            period_start: periodStartISO,
            period_end: periodEndISO,
            employee_name: staffMember.name,
            staff_id: staffMember.id,
            cleaning_type: serviceType,
            client: customerName,
            base_value: staffBaseValue,
            bonus: 0,
            total: staffBaseValue,
            payment_type: "Direct Deposit",
            status: "Pending",
            notes,
          });
        }
      }

      if (newRecords.length === 0) {
        toast({
          title: "Nenhum funcionário encontrado",
          description:
            unmatchedAssigned.length > 0
              ? `Não foi possível mapear estes nomes para o staff: ${[...new Set(unmatchedAssigned)].slice(0, 5).join(", ")}${unmatchedAssigned.length > 5 ? "…" : ""}`
              : "Os jobs finalizados não têm funcionários atribuídos.",
          variant: "destructive",
        });
        return [];
      }

      const inserted = await createPayrollRecords.mutateAsync(newRecords);
      const insertedRows = (inserted || []) as unknown as DBPayrollRecord[];

      const localRecords: PayrollRecord[] = insertedRows.map((record) => {
        const match = record.notes?.match(/^Job\s+([a-f0-9]+)/i);
        const jobIdShort = match ? match[1].toLowerCase() : null;

        const staffId = record.staff_id ?? null;
        const unitValue =
          (staffId ? staffBaseValueMap.get(staffId) : undefined) ?? Number(record.base_value);

        return {
          id: record.id,
          periodStartISO: record.period_start,
          periodEndISO: record.period_end,
          period: `${format(new Date(record.period_start), "dd/MM/yyyy")} - ${format(new Date(record.period_end), "dd/MM/yyyy")}`,
          employeeName: record.employee_name,
          staffId,
          cleaningType: record.cleaning_type || "General Cleaning",
          client: record.client || "N/A",
          baseValue: unitValue,
          bonus: Number(record.bonus) || 0,
          paymentType: record.payment_type as PayrollRecord["paymentType"],
          status: record.status,
          jobIdShort,
        };
      });

      toast({
        title: "Payroll gerado automaticamente",
        description: `${localRecords.length} registro(s) criado(s) a partir de jobs finalizados.`,
      });

      return localRecords;
    } catch (error: unknown) {
      console.error("Error generating payroll from jobs:", error);
      toast({
        title: "Erro ao gerar payroll",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
      return [];
    } finally {
      setIsGeneratingFromJobs(false);
    }
  };
  const handleDownloadExcel = async () => {
    const { default: XLSX } = await import("xlsx-js-style");
    // Get period for header
    const periodHeader = startDate && endDate 
      ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
      : filteredData.length > 0 ? filteredData[0].period : "";
    
    const workbook = XLSX.utils.book_new();
    
    // Group data by employee
    const groupedByEmployee: { [key: string]: PayrollRecord[] } = {};
    filteredData.forEach(record => {
      if (!groupedByEmployee[record.employeeName]) {
        groupedByEmployee[record.employeeName] = [];
      }
      groupedByEmployee[record.employeeName].push(record);
    });
    
    // Define border style
    const border = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };
    
    // Create a sheet for each employee
    Object.keys(groupedByEmployee).sort().forEach(employeeName => {
      const employeeRecords = groupedByEmployee[employeeName];
      
      
      // Bonus is now handled in the modal, so we set it to 0 for Excel export
      const totalBonus = 0;
      
      // Create header rows exactly like the image
      // Row 1: PAYROLL (column E - Daily Total)
      // Row 2: Employee Name (column E - Daily Total)
      // Row 3: Period (column E - Daily Total)
      // Row 4: Empty
      // Row 5: Table headers
      const allRows: (string | number)[][] = [
        ["", "", "", "", "PAYROLL"],           // Row 1
        ["", "", "", "", employeeName],        // Row 2
        ["", "", "", "", periodHeader],        // Row 3
        ["", "", "", "", ""],                  // Row 4 - Empty
        ["Date", "Payment Type", "Description", "Amount", "Daily Total"] // Row 5 - Headers
      ];
      
      // Group employee data by date
      const groupedByDate: { [key: string]: PayrollRecord[] } = {};
      employeeRecords.forEach(record => {
        const dateKey = record.period.split(" - ")[0];
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(record);
      });
      
      // Create data rows with daily totals
      let grandTotal = 0;
      const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
      let currentRow = 5; // Start after headers (0-indexed row 5)
      
      Object.keys(groupedByDate).sort().forEach(dateKey => {
        const records = groupedByDate[dateKey];
        const dailyTotal = records.reduce((sum, r) => sum + r.baseValue, 0);
        grandTotal += dailyTotal;
        const startRow = currentRow;
        
        records.forEach((record, index) => {
          allRows.push([
            index === 0 ? dateKey : "",
            record.cleaningType,
            record.client,
            `$                    ${record.baseValue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
            index === 0 ? `$                    ${dailyTotal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}` : ""
          ]);
          currentRow++;
        });
        
        // Add merge for Date column if multiple records
        if (records.length > 1) {
          merges.push({
            s: { r: startRow, c: 0 },
            e: { r: currentRow - 1, c: 0 }
          });
          merges.push({
            s: { r: startRow, c: 4 },
            e: { r: currentRow - 1, c: 4 }
          });
        }
      });
      
      // Add Total row - label merged from Date to Amount, value in Daily Total
      const totalRowIndex = currentRow;
      allRows.push([
        "Total",
        "",
        "",
        "",
        `$                    ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
      ]);
      currentRow++;
      
      // Merge Total label from column A to D
      merges.push({
        s: { r: totalRowIndex, c: 0 },
        e: { r: totalRowIndex, c: 3 }
      });
      
      // Add "Obs: Bônus da Semana" row - label merged from Date to Amount, value in Daily Total
      const bonusRowIndex = currentRow;
      allRows.push([
        "Obs: Bônus da Semana",
        "",
        "",
        "",
        `$                    ${totalBonus.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
      ]);
      currentRow++;
      
      // Merge Bonus label from column A to D
      merges.push({
        s: { r: bonusRowIndex, c: 0 },
        e: { r: bonusRowIndex, c: 3 }
      });
      
      // Add Subtotal row - label merged from Date to Amount, value in Daily Total
      const subtotal = grandTotal + totalBonus;
      const subtotalRowIndex = currentRow;
      allRows.push([
        "Subtotal",
        "",
        "",
        "",
        `$                    ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
      ]);
      currentRow++;
      
      // Merge Subtotal label from column A to D
      merges.push({
        s: { r: subtotalRowIndex, c: 0 },
        e: { r: subtotalRowIndex, c: 3 }
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);
      
      // Apply merges
      worksheet["!merges"] = merges;
      
      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      
      // Style header cells (PAYROLL, name, period) - rows 0-2, column E
      for (let row = 0; row <= 2; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 4 });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: row === 0, sz: row === 0 ? 14 : 11 },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
      }
      
      // Style table header row (row 4)
      for (let col = 0; col <= 4; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 4, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            border: border,
            font: { bold: true, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "D9D9D9" } }
          };
        }
      }
      
      // Style data rows (from row 5 to end)
      for (let row = 5; row <= range.e.r; row++) {
        for (let col = 0; col <= 4; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { v: "", t: "s" };
          }
          
          const isLastThreeRows = row >= totalRowIndex;
          const isAmountOrTotal = col === 3 || col === 4;
          const isMergedLabelCell = isLastThreeRows && col === 0;
          
          worksheet[cellAddress].s = {
            border: border,
            font: { 
              bold: isLastThreeRows,
              sz: 11 
            },
            alignment: { 
              horizontal: isMergedLabelCell ? "right" : (isAmountOrTotal ? "right" : "left"), 
              vertical: "center" 
            }
          };
        }
      }
      
      // Set column widths to match the image
      worksheet["!cols"] = [
        { wch: 12 },  // Date
        { wch: 18 },  // Payment Type
        { wch: 22 },  // Description
        { wch: 22 },  // Amount
        { wch: 14 }   // Daily Total
      ];
      
      // Add sheet with employee name (limit to 31 chars for Excel)
      const sheetName = employeeName.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `payroll_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({
      title: "Download started",
      description: "Excel file generated successfully."
    });
  };
  
  // Generate PDF for a single employee (same style as Excel)
  const generateEmployeePDF = async (employeeName: string): Promise<Blob> => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    
    // Get all records for this employee - use payrollData as source (not filteredData which may be empty)
    const dataSource = filteredData.length > 0 ? filteredData : payrollData;
    const employeeRecords = dataSource.filter(r => r.employeeName === employeeName);
    
    if (employeeRecords.length === 0) {
      throw new Error("No records found for this employee");
    }

    // Find staff and their payroll rules for bonus details
    const staffMember = staffList.find(s => s.name === employeeName);
    const staffRule = staffMember ? payrollRules.find(r => r.staff_id === staffMember.id) : null;
    
    // Get period header
    const periodHeader = startDate && endDate 
      ? `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`
      : employeeRecords[0].period;
    
    let headerY = 15;
    
    // Add company logo if available
    if (companySettings?.logo_url) {
      try {
        const response = await fetch(companySettings.logo_url);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          const logoDataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          // Add logo centered at top
          doc.addImage(logoDataUrl, "PNG", 85, 10, 40, 20);
          headerY = 35;
        }
      } catch (e) {
        console.warn("Could not load company logo:", e);
      }
    }
    
    // Company name (if no logo or as additional info)
    if (companySettings?.trade_name) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(companySettings.trade_name, 105, headerY, { align: "center" });
      headerY += 8;
    }
    
    // Header
    doc.setTextColor(0);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PAYROLL", 105, headerY, { align: "center" });
    
    doc.setFontSize(16);
    doc.text(employeeName, 105, headerY + 12, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(periodHeader, 105, headerY + 22, { align: "center" });
    
    const tableStartY = headerY + 32;
    
    // Group by date
    const groupedByDate: { [key: string]: PayrollRecord[] } = {};
    employeeRecords.forEach(record => {
      const dateKey = record.period.split(" - ")[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(record);
    });
    
    // Build table data
    const tableBody: (string | number)[][] = [];
    let grandTotal = 0;
    let totalBonus = 0;
    
    Object.keys(groupedByDate).sort().forEach(dateKey => {
      const records = groupedByDate[dateKey];
      const dailyTotal = records.reduce((sum, r) => sum + r.baseValue, 0);
      const dailyBonus = records.reduce((sum, r) => sum + r.bonus, 0);
      grandTotal += dailyTotal;
      totalBonus += dailyBonus;
      
      records.forEach((record, index) => {
        tableBody.push([
          index === 0 ? dateKey : "",
          record.cleaningType,
          record.client,
          `$ ${record.baseValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          index === 0 ? `$ ${dailyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""
        ]);
      });
    });
    
    // Main table
    autoTable(doc, {
      startY: tableStartY,
      head: [["Date", "Payment Type", "Description", "Amount", "Daily Total"]],
      body: tableBody,
      theme: "grid",
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        halign: "center"
      },
      styles: { 
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 28 },
        1: { halign: "left", cellWidth: 35 },
        2: { halign: "left", cellWidth: 45 },
        3: { halign: "right", cellWidth: 35 },
        4: { halign: "right", cellWidth: 35 },
      },
    });
    
    // Get final Y position after main table
    let finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    
    // Build bonus details from payroll rules
    const bonusDetails: { label: string; value: number }[] = [];
    
    if (staffRule) {
      if (staffRule.bonus_weekly > 0) {
        bonusDetails.push({ label: "Bônus Semanal", value: staffRule.bonus_weekly });
      }
      if (staffRule.bonus_monthly > 0) {
        bonusDetails.push({ label: "Bônus Mensal", value: staffRule.bonus_monthly });
      }
      if (staffRule.bonus_yearly_1 > 0) {
        bonusDetails.push({ label: "Bônus Anual 1", value: staffRule.bonus_yearly_1 });
      }
      if (staffRule.bonus_yearly_2 > 0) {
        bonusDetails.push({ label: "Bônus Anual 2", value: staffRule.bonus_yearly_2 });
      }
      if (staffRule.bonus_performance > 0) {
        bonusDetails.push({ label: "Bônus Performance", value: staffRule.bonus_performance });
      }
      if (staffRule.bonus_christmas > 0) {
        bonusDetails.push({ label: "Bônus Natal", value: staffRule.bonus_christmas });
      }
      if (staffRule.extra_value > 0) {
        bonusDetails.push({ label: "Valor Extra", value: staffRule.extra_value });
      }
    }
    
    // If there are bonus details, add a bonus breakdown section
    if (bonusDetails.length > 0 || totalBonus > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhes de Bônus", 14, finalY + 5);
      
      const bonusTableBody = bonusDetails.map(b => [
        b.label,
        `$ ${b.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      // Add the actual bonus from records if different
      if (totalBonus > 0) {
        bonusTableBody.push([
          "Bônus Aplicado (período)",
          `$ ${totalBonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      }
      
      if (bonusTableBody.length > 0) {
        autoTable(doc, {
          startY: finalY + 8,
          body: bonusTableBody,
          theme: "striped",
          styles: { 
            fontSize: 9,
            cellPadding: 2,
          },
          columnStyles: {
            0: { halign: "left", cellWidth: 100 },
            1: { halign: "right", cellWidth: 40 },
          },
        });
        
        finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }
    }
    
    // Summary table - use actual bonus from records
    const subtotal = grandTotal + totalBonus;
    
    const summaryBody = [
      ["Total Serviços", `$ ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ["Total Bônus", `$ ${totalBonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ["TOTAL A PAGAR", `$ ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];
    
    autoTable(doc, {
      startY: finalY,
      body: summaryBody,
      theme: "grid",
      styles: { 
        fontSize: 11,
        fontStyle: "bold",
        cellPadding: 4,
      },
      columnStyles: {
        0: { halign: "right", cellWidth: 143 },
        1: { halign: "right", cellWidth: 35 },
      },
      didParseCell: (data) => {
        // Highlight the total row
        if (data.row.index === 2) {
          data.cell.styles.fillColor = [59, 130, 246];
          data.cell.styles.textColor = 255;
        }
      },
    });
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 105, pageHeight - 10, { align: "center" });
    
    return doc.output("blob");
  };

  // Download PDF for a single employee
  const handleDownloadPDF = async (record: PayrollListRow) => {
    try {
      const pdfBlob = await generateEmployeePDF(record.employeeName);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payroll_${record.employeeName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated",
        description: `Payroll PDF for ${record.employeeName} downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    }
  };

  // Open PDF Preview
  const handlePreviewPDF = async (record: PayrollListRow) => {
    setPreviewRecord(record);
    setPreviewModalOpen(true);
    setIsGeneratingPreview(true);
    setPreviewPdfBlob(null);
    
    try {
      const pdfBlob = await generateEmployeePDF(record.employeeName);
      setPreviewPdfBlob(pdfBlob);
    } catch (error) {
      console.error("Error generating PDF for preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF preview.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download from preview
  const handleDownloadFromPreview = () => {
    if (!previewPdfBlob || !previewRecord) return;
    
    const url = URL.createObjectURL(previewPdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll_${previewRecord.employeeName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "PDF Downloaded",
      description: `Payroll PDF for ${previewRecord.employeeName} downloaded successfully.`,
    });
  };

  // Send PDF via SMS
  const [isSendingSMS, setIsSendingSMS] = useState<string | null>(null);

  // Send from preview modal
  const handleSendFromPreview = async () => {
    if (!previewPdfBlob || !previewRecord) return;
    
    const staffMember = staffList.find(s => s.name === previewRecord.employeeName);
    
    if (!staffMember?.phone) {
      toast({
        title: "Phone not found",
        description: `No phone number found for ${previewRecord.employeeName}. Please add a phone number in the staff settings.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingSMS(previewRecord.id);
    
    try {
      // Calculate total for this employee
      const employeeRecords = filteredData.filter(r => r.employeeName === previewRecord.employeeName);
      const totalValue = employeeRecords.reduce((sum, r) => sum + r.baseValue, 0);
      
      const fileName = `payroll/${previewRecord.id}_${Date.now()}_payroll_${previewRecord.employeeName.replace(/\s+/g, "_")}.pdf`;
      await sendPayrollStatementSms({
        companyId: companySettings?.id,
        phone: staffMember.phone,
        message: `Hi ${previewRecord.employeeName}, here is your payroll statement for ${previewRecord.period}. Total: ${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
        fileName,
        pdfBlob: previewPdfBlob,
      });

      toast({
        title: "SMS Sent",
        description: `Payroll PDF sent to ${previewRecord.employeeName} at ${staffMember.phone}.`,
      });
      
      setPreviewModalOpen(false);
    } catch (error: unknown) {
      console.error("Error sending SMS:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to send SMS."),
        variant: "destructive",
      });
    } finally {
      setIsSendingSMS(null);
    }
  };
  
  const handleSendPDFViaSMS = async (record: PayrollListRow) => {
    // Find staff member to get phone number
    const staffMember = staffList.find(s => s.name === record.employeeName);
    
    if (!staffMember?.phone) {
      toast({
        title: "Phone not found",
        description: `No phone number found for ${record.employeeName}. Please add a phone number in the staff settings.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingSMS(record.id);
    
    try {
      // Generate PDF
      const pdfBlob = await generateEmployeePDF(record.employeeName);
      
      // Calculate total for this employee
      const employeeRecords = filteredData.filter(r => r.employeeName === record.employeeName);
      const totalValue = employeeRecords.reduce((sum, r) => sum + r.baseValue, 0);
      
      const fileName = `payroll/${record.id}_${Date.now()}_payroll_${record.employeeName.replace(/\s+/g, "_")}.pdf`;
      await sendPayrollStatementSms({
        companyId: companySettings?.id,
        phone: staffMember.phone,
        message: `Hi ${record.employeeName}, here is your payroll statement for ${record.period}. Total: ${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
        fileName,
        pdfBlob,
      });

      toast({
        title: "SMS Sent",
        description: `Payroll PDF sent to ${record.employeeName} at ${staffMember.phone}.`,
      });
    } catch (error: unknown) {
      console.error("Error sending SMS:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to send SMS."),
        variant: "destructive",
      });
    } finally {
      setIsSendingSMS(null);
    }
  };

  // Bulk send PDFs via SMS to all selected employees
  const handleBulkSendPDFViaSMS = async () => {
    if (selectedRows.length === 0) {
      toast({
        title: "No records selected",
        description: "Please select at least one record to send.",
        variant: "destructive",
      });
      return;
    }

    // Get unique employees from selected rows (group rows)
    const selectedGroups = payrollListRows.filter((r) => selectedRows.includes(r.id));
    const uniqueEmployeeNames = [...new Set(selectedGroups.map((r) => r.employeeName))];

    // Check if all employees have phone numbers
    const employeesWithoutPhone = uniqueEmployeeNames.filter(name => {
      const staff = staffList.find(s => s.name === name);
      return !staff?.phone;
    });

    if (employeesWithoutPhone.length > 0) {
      toast({
        title: "Missing phone numbers",
        description: `The following employees don't have phone numbers: ${employeesWithoutPhone.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSendingBulkSMS(true);
    setBulkSMSProgress({ sent: 0, total: uniqueEmployeeNames.length });
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < uniqueEmployeeNames.length; i++) {
        const employeeName = uniqueEmployeeNames[i];
        const staffMember = staffList.find(s => s.name === employeeName);
        if (!staffMember?.phone) continue;

        try {
          // Generate PDF for this employee
          const pdfBlob = await generateEmployeePDF(employeeName);
          
          // Calculate total for this employee
          const employeeRecords = filteredData.filter(r => r.employeeName === employeeName);
          const totalValue = employeeRecords.reduce((sum, r) => sum + r.baseValue, 0);
          const period = employeeRecords[0]?.period || "";
          
          const fileName = `payroll/${Date.now()}_payroll_${employeeName.replace(/\s+/g, "_")}.pdf`;
          await sendPayrollStatementSms({
            companyId: companySettings?.id,
            phone: staffMember.phone,
            message: `Hi ${employeeName}, here is your payroll statement for ${period}. Total: ${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
            fileName,
            pdfBlob,
          });

          successCount++;
        } catch (error) {
          console.error(`Error sending SMS to ${employeeName}:`, error);
          failCount++;
        }
        
        // Update progress after each employee
        setBulkSMSProgress({ sent: i + 1, total: uniqueEmployeeNames.length });
      }

      if (successCount > 0) {
        toast({
          title: "Bulk SMS Sent",
          description: `Successfully sent ${successCount} PDF(s)${failCount > 0 ? `, ${failCount} failed` : ""}.`,
        });
      }
      
      if (failCount > 0 && successCount === 0) {
        toast({
          title: "Bulk SMS Failed",
          description: `Failed to send ${failCount} PDF(s).`,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error("Bulk SMS error:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to send bulk SMS."),
        variant: "destructive",
      });
    } finally {
      setIsSendingBulkSMS(false);
      setBulkSMSProgress({ sent: 0, total: 0 });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-success/10 text-success hover:bg-success/15">Paid</Badge>;
      case "Pending":
        return <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/15">Pending</Badge>;
      case "Overdue":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/15">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  // Get unique employees from both payroll records AND staff list
  const uniqueEmployees = useMemo(() => {
    const payrollNames = payrollData.map(r => r.employeeName);
    const staffNames = staffList.filter(s => s.is_active).map(s => s.name);
    return [...new Set([...payrollNames, ...staffNames])].sort();
  }, [payrollData, staffList]);
  
  // Calculate employee periods based on filtered data
  const employeePeriods = useMemo(() => {
    const periods: { employeeName: string; startDate: Date; endDate: Date }[] = [];
    
    uniqueEmployees.forEach(employeeName => {
      const employeeRecords = filteredData.filter(r => r.employeeName === employeeName);
      if (employeeRecords.length > 0) {
        // Get the first period and parse dates
        const firstPeriod = employeeRecords[0].period;
        const [startStr, endStr] = firstPeriod.split(" - ");
        
        // Parse dd/MM/yyyy format
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split("/").map(Number);
          return new Date(year, month - 1, day);
        };
        
        periods.push({
          employeeName,
          startDate: parseDate(startStr),
          endDate: parseDate(endStr)
        });
      }
    });
    
    return periods;
  }, [uniqueEmployees, filteredData]);
  
  // Employees for calculate modal
  // employeesForModal is defined at the top of the component

  return <PageLayout>
      <div className="space-y-6">
          {/* Page Title */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("payroll.title")}</h1>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" onClick={() => setRulesModalOpen(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                {t("payroll.payrollRules")}
              </Button>
              <Button onClick={handleOpenCalculateModal} className="gap-2">
                <Calculator className="w-4 h-4" />
                {t("payroll.calculatePayroll")}
              </Button>
              <Button variant="outline" onClick={handleDownloadExcel} className="gap-2">
                <Download className="w-4 h-4" />
                {t("payroll.downloadExcel")}
              </Button>
              <Button 
                onClick={handleBulkSendPDFViaSMS} 
                variant="default"
                className="gap-2"
                disabled={selectedRows.length === 0 || isSendingBulkSMS}
              >
                {isSendingBulkSMS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending {bulkSMSProgress.sent}/{bulkSMSProgress.total}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send PDFs ({selectedRows.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Card */}
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                {/* Employee Combobox */}
                <div className="min-w-0 flex-1 space-y-2 lg:min-w-[250px] lg:flex-none">
                  <Label>{t("payroll.employee")}</Label>
                  <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={employeeOpen} className="w-full justify-between font-normal">
                        {selectedEmployee === "all" ? t("payroll.allEmployees") : selectedEmployee || t("payroll.select")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0 bg-popover z-50" align="start">
                      <Command>
                        <CommandInput placeholder={t("payroll.searchEmployee")} />
                        <CommandList>
                          <CommandEmpty>{t("payroll.noEmployeeFound")}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="all" onSelect={() => {
                            setSelectedEmployee("all");
                            setEmployeeOpen(false);
                          }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedEmployee === "all" ? "opacity-100" : "opacity-0")} />
                              {t("payroll.allEmployees")}
                            </CommandItem>
                            {uniqueEmployees.map(name => <CommandItem key={name} value={name} onSelect={() => {
                            setSelectedEmployee(name);
                            setEmployeeOpen(false);
                          }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedEmployee === name ? "opacity-100" : "opacity-0")} />
                                {name}
                              </CommandItem>)}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Status Dropdown */}
                <div className="min-w-0 flex-1 space-y-2 lg:min-w-[150px] lg:flex-none">
                  <Label>{t("common.status")}</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t("payroll.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="Paid">{t("payroll.paid")}</SelectItem>
                      <SelectItem value="Pending">{t("payroll.pending")}</SelectItem>
                      <SelectItem value="Overdue">{t("payroll.overdue")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Selector */}
                <div className="space-y-2">
                  <Label>{t("payroll.startDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal lg:w-[200px]", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : t("payroll.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{t("payroll.endDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal lg:w-[200px]", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : t("payroll.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button onClick={handleFilter} size="icon" aria-label="Apply payroll filter">
                  <Search className="w-4 h-4" />
                </Button>

                {showClearButton && (
                  <Button onClick={handleClearFilter} size="icon" variant="outline" aria-label="Clear payroll filter">
                    <X className="w-4 h-4" />
                  </Button>
                )}


                
              </div>
            </CardContent>
          </Card>

          {/* Payroll Table */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">{t("payroll.payrollList")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            payrollListRows.length > 0 &&
                            selectedRows.length === payrollListRows.length
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRows(payrollListRows.map((r) => r.id));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("period")}
                      >
                        <div className="flex items-center">
                          {t("payroll.period")}
                          <SortIcon field="period" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("employeeName")}
                      >
                        <div className="flex items-center">
                          Team Member
                          <SortIcon field="employeeName" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">Valor por Serviço</div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">Qtd Jobs</div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">Bônus</div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("baseValue")}
                      >
                        <div className="flex items-center">
                          Valor Total
                          <SortIcon field="baseValue" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">{t("payroll.paymentType")}</div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          {t("common.status")}
                          <SortIcon field="status" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[80px]">
                        <div className="flex items-center justify-center">
                          {t("common.actions") || "Actions"}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollListRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {t("payroll.noRecordsFound")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollListRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.includes(row.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRows((prev) => [...prev, row.id]);
                                } else {
                                  setSelectedRows((prev) => prev.filter((id) => id !== row.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{row.period}</TableCell>
                          <TableCell>{row.employeeName}</TableCell>
                          <TableCell>
                            {formatCurrency(row.unitValue, companyCurrency)}
                          </TableCell>
                          <TableCell>{row.jobCount}</TableCell>
                          <TableCell>
                            {row.bonus > 0 ? (
                              <span className="font-medium text-success">
                                +{formatCurrency(row.bonus, companyCurrency)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(row.value, companyCurrency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal capitalize">
                              {row.paymentType?.toLowerCase() === "quickbooks" ? "QuickBooks" : 
                               row.paymentType?.toLowerCase() === "zelle" ? "Zelle" :
                               row.paymentType?.toLowerCase() === "check" ? "Check" :
                               row.paymentType?.toLowerCase() === "cash" ? "Cash" :
                               row.paymentType || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(row.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Payroll actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreviewPDF(row)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(row)}>
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSendPDFViaSMS(row)}
                                  disabled={isSendingSMS === row.id}
                                >
                                  {isSendingSMS === row.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                  )}
                                  Send PDF via SMS
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

              {/* Summary */}
              <div className="mt-4 flex justify-start border-t border-border/80 pt-4 sm:justify-end">
                <div className="text-sm text-muted-foreground">
                  {t("payroll.totalRecords")}: <span className="font-semibold text-foreground">{payrollListRows.length}</span>
                  {" | "}
                  {t("payroll.totalValue")}: {" "}
                  <span className="font-semibold text-foreground">
                    {payrollListRows
                      .reduce((sum, r) => sum + r.value, 0)
                      .toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculate Payroll Modal */}
          {startDate && endDate && (
            <CalculatePayrollModal
              open={calculateModalOpen}
              onOpenChange={setCalculateModalOpen}
              startDate={startDate}
              endDate={endDate}
              onConfirm={handleConfirmPayroll}
              existingRecords={dbPayrollRecords.map(r => ({
                id: r.id,
                staff_id: r.staff_id,
                employee_name: r.employee_name,
                bonus: Number(r.bonus) || 0,
                period_start: r.period_start,
                period_end: r.period_end,
              }))}
            />
          )}

          {/* PDF Preview Modal */}
          {previewModalOpen && (
            <Suspense fallback={null}>
              <PayrollPDFPreviewModal
                open={previewModalOpen}
                onOpenChange={setPreviewModalOpen}
                employeeName={previewRecord?.employeeName || ""}
                employeePhone={staffList.find(s => s.name === previewRecord?.employeeName)?.phone || undefined}
                pdfBlob={previewPdfBlob}
                isGenerating={isGeneratingPreview}
                onDownload={handleDownloadFromPreview}
                onSendSMS={handleSendFromPreview}
                isSending={isSendingSMS === previewRecord?.id}
              />
            </Suspense>
          )}

          {/* Payroll Rules Modal */}
          <PayrollRulesModal
            open={rulesModalOpen}
            onOpenChange={setRulesModalOpen}
          />
      </div>
    </PageLayout>;
}
