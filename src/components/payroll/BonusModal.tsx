import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Bonus {
  id: string;
  employeeName: string;
  type: string;
  description: string;
  value: number;
  period: string;
}

interface EmployeePeriod {
  employeeName: string;
  startDate: Date;
  endDate: Date;
}

interface BonusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: string[];
  onAddBonus: (bonus: Bonus) => void;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  employeePeriods?: EmployeePeriod[];
}

const bonusTypes = [
  "Bônus da Semana",
  "Bônus Mensal",
  "Bônus de Um Ano",
  "Bônus de Performance",
  "Bônus de Natal",
  "Outro"
];

export function BonusModal({ open, onOpenChange, employees, onAddBonus, defaultStartDate, defaultEndDate, employeePeriods }: BonusModalProps) {
  const { t } = useLanguage();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [bonusType, setBonusType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEndDate);

  // Update dates when modal opens with default dates
  useEffect(() => {
    if (open && !selectedEmployee) {
      if (defaultStartDate) setStartDate(defaultStartDate);
      if (defaultEndDate) setEndDate(defaultEndDate);
    }
  }, [open, defaultStartDate, defaultEndDate]);

  // Update dates when employee is selected based on their period
  useEffect(() => {
    if (selectedEmployee && employeePeriods) {
      const employeePeriod = employeePeriods.find(ep => ep.employeeName === selectedEmployee);
      if (employeePeriod) {
        setStartDate(employeePeriod.startDate);
        setEndDate(employeePeriod.endDate);
      }
    }
  }, [selectedEmployee, employeePeriods]);

  const handleSubmit = () => {
    if (!selectedEmployee || !bonusType || !value || !startDate || !endDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const numericValue = parseFloat(value.replace(",", "."));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido.",
        variant: "destructive"
      });
      return;
    }

    const periodStr = `${format(startDate, "MM/dd/yyyy")} - ${format(endDate, "MM/dd/yyyy")}`;

    const bonus: Bonus = {
      id: `bonus-${Date.now()}`,
      employeeName: selectedEmployee,
      type: bonusType,
      description: description || bonusType,
      value: numericValue,
      period: periodStr
    };

    onAddBonus(bonus);
    
    // Reset form but keep dates for next bonus
    setSelectedEmployee("");
    setBonusType("");
    setDescription("");
    setValue("");
    onOpenChange(false);

    toast({
      title: "Bônus adicionado",
      description: `Bônus de ${numericValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionado para ${selectedEmployee}.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Bônus</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Funcionário *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar funcionário" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {employees.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Date Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bonusType">Tipo de Bônus *</Label>
            <Select value={bonusType} onValueChange={setBonusType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {bonusTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Observação</Label>
            <Input
              id="description"
              placeholder="Ex: Bônus por meta atingida"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$) *</Label>
            <Input
              id="value"
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit}>
            {t("common.addBonus")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
