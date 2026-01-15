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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface IncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const incomeTypes = [
  "Serviços concluídos",
  "Pagamentos manuais",
  "Outros",
];

const paymentMethods = [
  "Credit Card",
  "ACH",
  "Check",
  "Cash",
  "Pix",
  "Stripe",
];

const customers = [
  "Sarah Johnson",
  "Tech Startup Inc.",
  "Miller Family",
  "Downtown Office Complex",
  "Green Valley Apartments",
];

const categories = [
  "Serviços de Limpeza",
  "Consultoria",
  "Produtos",
  "Outros",
];

export function IncomeModal({ open, onOpenChange }: IncomeModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    incomeType: "",
    customer: "",
    category: "",
    grossAmount: "",
    fees: "",
    netAmount: "",
    receivedDate: "",
    paymentMethod: "",
    linkedInvoice: "",
    status: "pending",
  });

  const handleGrossAmountChange = (value: string) => {
    const gross = parseFloat(value) || 0;
    const fees = parseFloat(formData.fees) || 0;
    setFormData({
      ...formData,
      grossAmount: value,
      netAmount: (gross - fees).toFixed(2),
    });
  };

  const handleFeesChange = (value: string) => {
    const gross = parseFloat(formData.grossAmount) || 0;
    const fees = parseFloat(value) || 0;
    setFormData({
      ...formData,
      fees: value,
      netAmount: (gross - fees).toFixed(2),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Receita criada",
      description: "A receita foi registrada com sucesso.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Receita (Income)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Receita</Label>
              <Select
                value={formData.incomeType}
                onValueChange={(value) => setFormData({ ...formData, incomeType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {incomeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.customer}
                onValueChange={(value) => setFormData({ ...formData, customer: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Recebimento</Label>
              <Input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Bruto</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.grossAmount}
                onChange={(e) => handleGrossAmountChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Taxas</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.fees}
                onChange={(e) => handleFeesChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Líquido</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.netAmount}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
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
              <Label>Invoice Vinculada (opcional)</Label>
              <Input
                placeholder="INV-XXX"
                value={formData.linkedInvoice}
                onChange={(e) => setFormData({ ...formData, linkedInvoice: e.target.value })}
              />
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
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="hero">
              {t("common.saveIncome")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
