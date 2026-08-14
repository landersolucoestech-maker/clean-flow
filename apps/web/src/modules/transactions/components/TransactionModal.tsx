import { T } from "@/shared/components/i18n/T";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useTransactions";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  mode?: "create" | "edit";
}

export interface Transaction {
  id: string;
  name: string;
  type: "receita" | "despesa";
  category: string;
  serviceType: string;
  date: string;
  amount: number;
  status: string;
}

// Revenue categories
const revenueCategories = ["Cleaning Revenue"];

// Expense categories
const expenseCategories = [
  "Insurance",
  "Utilities",
  "Employees / Freelancers",
  "Tax Services",
  "Bank Fees",
  "Taxes",
  "Supplies",
  "Gas / Fuel",
  "Marketing",
  "Software",
  "Online Courses",
  "Others",
];

// Service types per category - using centralized enums for Cleaning Revenue
import { SERVICE_TYPES } from "@/lib/serviceEnums";

const serviceTypesByCategory: Record<string, string[] | "free"> = {
  // Revenue - use centralized service types
  "Cleaning Revenue": [...SERVICE_TYPES],
  
  // Expense - Insurance
  "Insurance": [
    "Workers' Compensation – Liberty Mutual",
    "Commercial Auto Insurance – National General",
    "Business Owners Policy (BOP) – Liberty Mutual",
  ],
  
  // Expense - Utilities
  "Utilities": [
    "Verizon (Telefonia / Internet)",
    "RingCentral (Telefonia)",
    "Spectrum (Internet)",
    "Duke Energy (Energia Elétrica)",
    "CPI Security (Sistema de Segurança)",
    "MH Office Rent (Aluguel do Escritório)",
  ],
  
  // Expense - Employees / Freelancers
  "Employees / Freelancers": [
    "Virtual Assistant",
    "Office Manager",
    "Cleaning Team Manager",
    "Drivers",
    "Cleaners",
  ],
  
  // Expense - Tax Services
  "Tax Services": ["American Tax"],
  
  // Expense - Bank Fees
  "Bank Fees": [
    "Taxas bancárias",
    "Taxas de processamento / transferências",
  ],
  
  // Expense - Taxes
  "Taxes": [
    "Federal Taxes",
    "State Taxes",
    "Local / City Taxes",
    "Payroll Taxes",
  ],
  
  // Free text categories
  "Supplies": "free",
  "Gas / Fuel": "free",
  "Marketing": "free",
  "Software": "free",
  "Online Courses": "free",
  "Others": "free",
};

const statusOptions = ["Pendente", "Concluído", "Cancelado"];

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
  mode = "create",
}: TransactionModalProps) {
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const [formData, setFormData] = useState({
    name: "",
    type: "" as "receita" | "despesa" | "",
    category: "",
    serviceType: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    status: "Pendente",
  });

  useEffect(() => {
    if (transaction && mode === "edit") {
      setFormData({
        name: transaction.name,
        type: transaction.type,
        category: transaction.category,
        serviceType: transaction.serviceType,
        date: transaction.date,
        amount: Math.abs(transaction.amount).toString(),
        status: transaction.status,
      });
    } else if (!transaction && mode === "create") {
      setFormData({
        name: "",
        type: "",
        category: "",
        serviceType: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        status: "Pendente",
      });
    }
  }, [transaction, mode, open]);

  const getCategoriesForType = () => {
    if (formData.type === "receita") {
      return revenueCategories;
    } else if (formData.type === "despesa") {
      return expenseCategories;
    }
    return [];
  };

  const getServiceTypesForCategory = () => {
    if (!formData.category) return [];
    const serviceTypes = serviceTypesByCategory[formData.category];
    if (serviceTypes === "free") return "free";
    return serviceTypes || [];
  };

  const handleTypeChange = (value: "receita" | "despesa") => {
    setFormData({
      ...formData,
      type: value,
      category: "",
      serviceType: "",
    });
  };

  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value,
      serviceType: "",
    });
  };

  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    const number = parseFloat(numericValue);
    if (isNaN(number)) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const handleAmountBlur = () => {
    const formatted = formatCurrency(formData.amount);
    setFormData({ ...formData, amount: formatted });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Por favor, insira o nome da transação");
      return;
    }
    if (!formData.type) {
      toast.error("Por favor, selecione o tipo da transação");
      return;
    }
    if (!formData.category) {
      toast.error("Por favor, selecione a categoria");
      return;
    }
    if (!formData.amount) {
      toast.error("Por favor, insira o valor");
      return;
    }
    if (!formData.date) {
      toast.error("Por favor, selecione a data");
      return;
    }

    // Parse amount - remove currency formatting
    const numericAmount = parseFloat(formData.amount.replace(/[^0-9.-]/g, ""));
    
    const transactionData = {
      name: formData.name,
      type: formData.type as "receita" | "despesa",
      category: formData.category,
      service_type: formData.serviceType || null,
      date: formData.date,
      amount: numericAmount,
      status: formData.status,
    };

    if (mode === "create") {
      createTransaction.mutate(transactionData, {
        onSuccess: () => onOpenChange(false),
      });
    } else if (transaction) {
      updateTransaction.mutate({ id: transaction.id, ...transactionData }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const serviceTypes = getServiceTypesForCategory();
  const isFreeText = serviceTypes === "free";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova Transação" : "Editar Transação"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nome da transação"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "receita" | "despesa") =>
                handleTypeChange(value)
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={handleCategoryChange}
              disabled={!formData.type}
            >
              <SelectTrigger id="category">
                <SelectValue
                  placeholder={
                    formData.type
                      ? "Selecione a categoria"
                      : "Selecione o tipo primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {getCategoriesForType().map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Serviço */}
          {formData.category && (
            <div className="space-y-2">
              <Label htmlFor="serviceType">Tipo de Serviço</Label>
              {isFreeText ? (
                <Input
                  id="serviceType"
                  value={formData.serviceType}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceType: e.target.value })
                  }
                  placeholder="Digite o nome do serviço"
                />
              ) : (
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, serviceType: value })
                  }
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue placeholder="Selecione o tipo de serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {/* Show the current value if it's not in the list (e.g., from invoice) */}
                    {formData.serviceType && !(serviceTypes as string[]).includes(formData.serviceType) && (
                      <SelectItem key={formData.serviceType} value={formData.serviceType}>
                        {formData.serviceType}
                      </SelectItem>
                    )}
                    {(serviceTypes as string[]).map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="text"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              onBlur={handleAmountBlur}
              placeholder="$0.00"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status"><T k="common.status" /></Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createTransaction.isPending || updateTransaction.isPending}
          >
            {createTransaction.isPending || updateTransaction.isPending 
              ? "Salvando..." 
              : mode === "create" ? "Criar Transação" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
