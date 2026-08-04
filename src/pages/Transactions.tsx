import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader, SearchInput, FilterSelect } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Plus,
  DollarSign,
  CalendarIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { ActionDropdown } from "@/components/shared/ActionDropdown";
import { cn } from "@/lib/utils";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { useTransactions, useDeleteTransaction, Transaction } from "@/hooks/useTransactions";
import { useSyncInvoicesToTransactions } from "@/hooks/useInvoices";
import { useLanguage } from "@/contexts/LanguageContext";

export function Transactions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const typeOptions = [
    { value: "all", label: "Todos Tipo" },
    { value: "receita", label: t("transactions.revenue") },
    { value: "despesa", label: t("transactions.expense") },
  ];

  const statusOptions = [
    { value: "all", label: "Todos Status" },
    { value: "concluido", label: t("transactions.completed") },
    { value: "pendente", label: t("payroll.pending") },
  ];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: transactions = [], isLoading } = useTransactions();
  const deleteTransaction = useDeleteTransaction();
  const syncInvoices = useSyncInvoicesToTransactions();
  const hasSynced = useRef(false);

  // Auto-sync invoices to transactions on page load
  useEffect(() => {
    if (!hasSynced.current && !isLoading) {
      hasSynced.current = true;
      syncInvoices.mutate();
    }
  }, [isLoading, syncInvoices]);

  const APP_TIMEZONE = "America/New_York";

  const normalizeKey = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // DayPicker returns a Date at local midnight. To avoid timezone shifts (UTC vs New York),
  // store dates as a "safe" UTC-noon Date so formatting in America/New_York keeps the same day.
  const toSafeCalendarDate = (date: Date | undefined) => {
    if (!date) return undefined;
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  };

  const dateKeyFromDate = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const dateKeyFromValue = (value: unknown) => String(value ?? "").split("T")[0];

  const formatDateKeyPtBr = (key: string) => {
    const [y, m, d] = key.split("-");
    return y && m && d ? `${d}/${m}/${y}` : key;
  };

  const formatDateDisplay = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

  const parseAmount = (raw: unknown) => {
    // Handles numbers and common pt-BR formatted strings.
    if (typeof raw === "number") return Math.abs(raw);

    const s = String(raw ?? "").trim();
    if (!s) return 0;

    let cleaned = s.replace(/[^0-9,.-]/g, "");

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma !== -1 && lastDot !== -1) {
      // Assume the last separator is the decimal separator; remove the others.
      const decimalSep = lastComma > lastDot ? "," : ".";
      const thousandsSep = decimalSep === "," ? "." : ",";
      cleaned = cleaned.split(thousandsSep).join("");
      if (decimalSep === ",") cleaned = cleaned.replace(",", ".");
    } else if (lastComma !== -1) {
      cleaned = cleaned.replace(",", ".");
    }

    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.abs(n) : 0;
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const startKey = startDate ? dateKeyFromDate(startDate) : null;
    const endKey = endDate ? dateKeyFromDate(endDate) : null;

    return transactions.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === "all" || normalizeKey(t.type) === normalizeKey(typeFilter);

      const matchesStatus =
        statusFilter === "all" || normalizeKey(t.status) === normalizeKey(statusFilter);

      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;

      const txDateKey = dateKeyFromValue(t.date);
      const matchesStartDate = !startKey || (txDateKey && txDateKey >= startKey);
      const matchesEndDate = !endKey || (txDateKey && txDateKey <= endKey);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, categoryFilter, startDate, endDate]);

  // Calculate KPIs (based on the list displayed below)
  const kpis = useMemo(() => {
    const isRevenue = (type: unknown) => normalizeKey(type) === "receita";
    const isExpense = (type: unknown) => normalizeKey(type) === "despesa";

    const isCompleted = (status: unknown) => normalizeKey(status) === "concluido";
    const isPending = (status: unknown) => normalizeKey(status) === "pendente";

    const receitasConcluidas = filteredTransactions
      .filter((t) => isRevenue(t.type) && isCompleted(t.status))
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const despesasConcluidas = filteredTransactions
      .filter((t) => isExpense(t.type) && isCompleted(t.status))
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const lucroLiquido = receitasConcluidas - despesasConcluidas;

    const contasReceber = filteredTransactions
      .filter((t) => isRevenue(t.type) && isPending(t.status))
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    const contasPagar = filteredTransactions
      .filter((t) => isExpense(t.type) && isPending(t.status))
      .reduce((sum, t) => sum + parseAmount(t.amount), 0);

    return {
      receitaMensal: receitasConcluidas,
      despesasMensais: despesasConcluidas,
      lucroLiquido,
      contasReceber,
      contasPagar,
    };
  }, [filteredTransactions]);

  // Get unique categories
  const categories = [...new Set(transactions.map((t) => t.category))];
  const categoryOptions = [
    { value: "all", label: "Todos Categoria" },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];


  const handleView = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowViewModal(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    deleteTransaction.mutate(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExport = () => {
    const selected = selectedIds.length > 0
      ? filteredTransactions.filter((transaction) => selectedIds.includes(transaction.id))
      : filteredTransactions;
    const safeCell = (value: unknown) => {
      const text = String(value ?? "");
      const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${protectedText.replace(/"/g, '""')}"`;
    };
    const rows = selected.map((transaction) => [
      transaction.date,
      transaction.name,
      transaction.description,
      transaction.category,
      transaction.type,
      transaction.status,
      transaction.amount,
      transaction.service_type,
      transaction.notes,
    ]);
    const csv = [
      ["Data", "Nome", "Descrição", "Categoria", "Tipo", "Status", "Valor", "Serviço", "Observações"],
      ...rows,
    ].map((row) => row.map(safeCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader
        title={t("transactions.title")}
        description="Controle financeiro e fluxo de caixa"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/rules")}>
              <Settings2 className="w-4 h-4 mr-2" />
              Regras
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredTransactions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowNewTransactionModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </>
        }
      />

      {/* KPI Cards - 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(kpis.receitaMensal)}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">paid revenue</span>
              <span className="text-xs text-green-500">+0%</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Expenses</span>
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(kpis.despesasMensais)}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">paid expenses</span>
              <span className="text-xs text-green-500">+0%</span>
            </div>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Profit</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(kpis.lucroLiquido)}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">margin 0%</span>
              <span className="text-xs text-green-500">+0%</span>
            </div>
          </CardContent>
        </Card>

        {/* To Be Received */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">To Be Received</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(kpis.contasReceber)}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">pending revenue</span>
              <span className="text-xs text-green-500">+0%</span>
            </div>
          </CardContent>
        </Card>

        {/* To Be Paid */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">To Be Paid</span>
              <ArrowDownLeft className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(kpis.contasPagar)}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">pending expenses</span>
              <span className="text-xs text-green-500">+0%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search Input */}
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-muted/30"
          />
        </div>

        
        <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? formatDateDisplay(startDate) : "Start Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                setStartDate(toSafeCalendarDate(date));
                setStartDateOpen(false);
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-sm text-muted-foreground">to</span>
        
        <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? formatDateDisplay(endDate) : "End Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                setEndDate(toSafeCalendarDate(date));
                setEndDateOpen(false);
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              setStartDateOpen(false);
              setEndDateOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={typeOptions} className="w-[140px]" />
        <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} className="w-[140px]" />
        <FilterSelect value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} className="w-[160px]" />
      </div>

      {/* Transactions Card List */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-muted/30">
            <Checkbox 
              checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
              onCheckedChange={handleSelectAll}
              className="border-muted-foreground"
            />
            
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-muted-foreground">Name</span>
            </div>
            <div className="w-[100px] text-center">
              <span className="text-sm font-medium text-muted-foreground">Date</span>
            </div>
            <div className="w-[100px] text-center">
              <span className="text-sm font-medium text-muted-foreground">Type</span>
            </div>
            <div className="w-[120px] text-center">
              <span className="text-sm font-medium text-muted-foreground">Category</span>
            </div>
            <div className="w-[100px] text-center">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
            </div>
            <div className="w-[120px] text-right">
              <span className="text-sm font-medium text-muted-foreground">Value</span>
            </div>
            <div className="w-[40px] text-center">
              <span className="text-sm font-medium text-muted-foreground">Actions</span>
            </div>
          </div>

          {/* Transaction Items */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("transactions.noTransactionsFound")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Checkbox */}
                  <Checkbox 
                    checked={selectedIds.includes(transaction.id)}
                    onCheckedChange={() => handleSelectOne(transaction.id)}
                    className="border-muted-foreground"
                  />


                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{transaction.name}</p>
                  </div>

                  {/* Date */}
                  <div className="w-[100px] text-center">
                    <p className="text-sm">
                      {formatDateKeyPtBr(dateKeyFromValue(transaction.date))}
                    </p>
                  </div>

                  {/* Type */}
                  <div className="w-[100px] text-center">
                    <Badge 
                      className={cn(
                        "text-xs",
                        transaction.type === "receita" 
                          ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" 
                          : "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                      )}
                    >
                      {transaction.type === "receita" ? "Revenue" : "Expense"}
                    </Badge>
                  </div>

                  {/* Category */}
                  <div className="w-[120px] text-center">
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="w-[100px] text-center">
                    <Badge 
                      className={cn(
                        "text-xs",
                        normalizeKey(transaction.status) === "pendente" 
                          ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" 
                          : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                      )}
                    >
                      {normalizeKey(transaction.status) === "pendente" ? "Pendente" : "Concluído"}
                    </Badge>
                  </div>

                  {/* Value */}
                  <div className="w-[120px] text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      transaction.type === "receita" ? "text-green-500" : "text-red-500"
                    )}>
                      {transaction.type === "receita" ? "+" : "-"}{formatCurrency(Math.abs(Number(transaction.amount)))}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="w-[40px] flex justify-center">
                    <ActionDropdown
                      onView={() => handleView(transaction)}
                      onEdit={() => handleEdit(transaction)}
                      onDelete={() => handleDelete(transaction.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Transaction Modal */}
      <TransactionModal
        open={showNewTransactionModal}
        onOpenChange={setShowNewTransactionModal}
        mode="create"
      />

      {/* Edit Transaction Modal */}
      <TransactionModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        transaction={selectedTransaction ? {
          ...selectedTransaction,
          type: selectedTransaction.type as "receita" | "despesa",
          serviceType: selectedTransaction.service_type || "",
        } : null}
        mode="edit"
      />

      {/* View Transaction Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTransaction?.type === "receita" ? (
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-red-600" />
              )}
              {t("transactions.transactionDetails")}
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("transactions.transactionName")}</p>
                <p className="text-lg font-semibold">{selectedTransaction.name}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("transactions.id")}</p>
                  <p className="font-medium">#{selectedTransaction.id.slice(0, 8)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("transactions.type")}</p>
                  <Badge className={selectedTransaction.type === "receita" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"}>
                    {selectedTransaction.type === "receita" ? t("transactions.revenue") : t("transactions.expense")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("common.date")}</p>
                  <p className="font-medium">
                    {formatDateKeyPtBr(dateKeyFromValue(selectedTransaction.date))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("transactions.category")}</p>
                  <Badge variant="outline">{selectedTransaction.category}</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("common.status")}</p>
                  <Badge 
                    className={cn(
                      normalizeKey(selectedTransaction.status) === "pendente" 
                        ? "bg-amber-500/20 text-amber-500" 
                        : "bg-green-500/20 text-green-500"
                    )}
                  >
                    {normalizeKey(selectedTransaction.status) === "pendente" ? "Pendente" : "Concluído"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("transactions.value")}</p>
                  <p className={`text-xl font-bold ${selectedTransaction.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(Math.abs(Number(selectedTransaction.amount)))}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>
                  {t("common.close")}
                </Button>
                <Button onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedTransaction);
                }}>
                  {t("common.edit")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
}
