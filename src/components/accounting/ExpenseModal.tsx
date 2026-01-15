import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const expenseCategories = {
  "Insurance": [
    "Workers' Compensation – Liberty Mutual",
    "Commercial Auto Insurance – National General",
    "Business Owners Policy (BOP) – Liberty Mutual",
  ],
  "Utilities": [
    "Verizon (Telefonia / Internet)",
    "RingCentral (Telefonia)",
    "Spectrum (Internet)",
    "Duke Energy (Energia Elétrica)",
    "CPI Security (Sistema de Segurança)",
    "MH Office Rent (Aluguel do Escritório)",
  ],
  "Employees / Freelancers": [
    "Virtual Assistant",
    "Office Manager",
    "Cleaning Team Manager",
    "Drivers",
    "Cleaners",
  ],
  "Accounting / Tax Services": [
    "American Tax",
  ],
  "Bank Fees": [
    "Taxas bancárias",
    "Taxas de processamento / transferências",
  ],
  "Taxes": [
    "Federal Taxes",
    "State Taxes",
    "Local / City Taxes",
    "Payroll Taxes",
  ],
  "Supplies": [],
  "Gas / Fuel": [],
  "Marketing": [],
  "Software": [],
  "Online Courses": [],
  "Others": [],
};

const paymentMethods = [
  "Credit Card",
  "ACH",
  "Check",
  "Cash",
  "Pix",
  "Bank Transfer",
];

export function ExpenseModal({ open, onOpenChange }: ExpenseModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    subcategory: "",
    customSubcategory: "",
    amount: "",
    date: "",
    paymentMethod: "",
    isRecurring: false,
    status: "pending",
  });

  const selectedCategoryItems = formData.category 
    ? expenseCategories[formData.category as keyof typeof expenseCategories] 
    : [];

  const needsCustomInput = ["Supplies", "Gas / Fuel", "Marketing", "Software", "Online Courses", "Others"].includes(formData.category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Despesa criada",
      description: "A despesa foi registrada com sucesso.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Despesa (Expense)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva a despesa..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  category: value, 
                  subcategory: "",
                  customSubcategory: "" 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(expenseCategories).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subcategoria / Fornecedor</Label>
              {needsCustomInput ? (
                <Input
                  placeholder="Digite o nome..."
                  value={formData.customSubcategory}
                  onChange={(e) => setFormData({ ...formData, customSubcategory: e.target.value })}
                />
              ) : (
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                  disabled={!formData.category || selectedCategoryItems.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategoryItems.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label>Despesa Recorrente</Label>
              <p className="text-sm text-muted-foreground">
                Esta despesa se repete mensalmente?
              </p>
            </div>
            <Switch
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Anexo (Nota Fiscal / Recibo)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo ou clique para fazer upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG até 10MB
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="hero">
              {t("common.saveExpense")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
