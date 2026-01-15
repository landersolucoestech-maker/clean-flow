import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerString } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, ChevronsUpDown, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useStaff } from "@/hooks/useStaff";

interface Job {
  id: string;
  customer: string;
  customerId?: string;
  service: string;
  date: string;
  time: string;
  staff1: string;
  staff2: string;
  status: string;
  duration: string;
  amount: string;
  address: string;
  notes?: string;
}

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onSave: (job: Job) => void;
  onDelete: (jobId: string) => void;
}

// Import centralized service enums
import { SERVICE_TYPES } from "@/lib/serviceEnums";

// Services now use the centralized enum
const services = [...SERVICE_TYPES];

const statusOptions = [
  { value: "scheduled", label: "Agendado" },
  { value: "in-progress", label: "Em Progresso" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];


export function EditJobModal({ open, onOpenChange, job, onSave, onDelete }: EditJobModalProps) {
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: staffList = [] } = useStaff();
  
  // Get active staff members' names
  const staffMembers = staffList.filter(s => s.is_active).map(s => s.name);
  
  const [formData, setFormData] = useState<Job>({
    id: "",
    customer: "",
    customerId: "",
    service: "",
    date: "",
    time: "",
    staff1: "",
    staff2: "",
    status: "scheduled",
    duration: "",
    amount: "",
    address: "",
    notes: "",
  });
  const [customerOpen, setCustomerOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  // Get selected customer object
  const selectedCustomer = customers.find(c => c.name === formData.customer || c.id === formData.customerId);
  
  // Get addresses for selected customer
  const availableAddresses = selectedCustomer?.addresses?.map(addr => {
    const fullAddress = addr.street 
      ? `${addr.street}${addr.city ? `, ${addr.city}` : ''}${addr.state ? `, ${addr.state}` : ''}`
      : '';
    return {
      id: addr.id || '',
      address: fullAddress,
      type: addr.name || "Home"
    };
  }) || [];

  // Sort customers alphabetically
  const sortedCustomers = [...customers].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  useEffect(() => {
    if (job) {
      setFormData({
        ...job,
        time: job.time.includes("AM") || job.time.includes("PM") 
          ? convertTo24Hour(job.time) 
          : job.time,
      });
    }
  }, [job]);

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");
    
    if (hours === "12") {
      hours = modifier === "AM" ? "00" : "12";
    } else if (modifier === "PM") {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, "0")}:${minutes}`;
  };

  // Clear address when customer changes
  const handleCustomerChange = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    handleChange("customer", customerName);
    handleChange("customerId", customer?.id || "");
    handleChange("address", "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert time back to 12-hour format for display
    const time24 = formData.time;
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    const time12 = `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    
    onSave({
      ...formData,
      time: time12,
    });
    toast.success("Job atualizado com sucesso!");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (job) {
      onDelete(job.id);
      toast.success("Job excluído com sucesso!");
      onOpenChange(false);
    }
  };

  const handleChange = (field: keyof Job, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Job - {job.id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente *</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.customer
                      ? customers.find((c) => c.name === formData.customer)?.name || formData.customer
                      : "Selecionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={(currentValue) => {
                              handleCustomerChange(currentValue === formData.customer ? "" : currentValue);
                              setCustomerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customer === customer.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Tipo de Serviço *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => handleChange("service", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço *</Label>
            <Popover open={addressOpen} onOpenChange={setAddressOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={addressOpen}
                  className="w-full justify-between font-normal text-left h-auto min-h-10"
                  disabled={!formData.customer}
                >
                  <span className="truncate">
                    {formData.address || (formData.customer ? "Selecionar endereço..." : "Selecione um cliente primeiro")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[520px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar endereço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum endereço encontrado para este cliente.</CommandEmpty>
                    <CommandGroup>
                      {availableAddresses.map((addr) => (
                        <CommandItem
                          key={addr.id}
                          value={addr.address}
                          onSelect={(currentValue) => {
                            handleChange("address", currentValue === formData.address ? "" : currentValue);
                            setAddressOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.address === addr.address ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="truncate">{addr.address}</span>
                            <span className="text-xs text-muted-foreground">{addr.type}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <DatePickerString
                id="date"
                value={formData.date}
                onChange={(value) => handleChange("date", value)}
                placeholder="Selecionar data"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff1">Funcionário 1 *</Label>
              <Select
                value={formData.staff1}
                onValueChange={(value) => handleChange("staff1", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff} value={staff}>
                      {staff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff2">Funcionário 2</Label>
              <Select
                value={formData.staff2 || "none"}
                onValueChange={(value) => handleChange("staff2", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar funcionário (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {staffMembers
                    .filter((staff) => staff !== formData.staff1)
                    .map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder="ex: 2h, 3h 30m"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor ($)</Label>
            <Input
              id="amount"
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="ex: $150"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Notas ou instruções adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Job
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o job {job.id}? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
