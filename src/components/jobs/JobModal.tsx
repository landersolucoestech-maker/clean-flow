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
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useStaff } from "@/hooks/useStaff";
import { useLanguage } from "@/contexts/LanguageContext";

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: JobFormData) => void;
  job?: JobFormData | null;
}

export interface JobFormData {
  id?: string;
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

// Import centralized service enums
import { SERVICE_TYPES } from "@/lib/serviceEnums";

// Services now use the centralized enum
const services = [...SERVICE_TYPES];

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];


export function JobModal({ open, onOpenChange, onSave, job }: JobModalProps) {
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: staffList = [], isLoading: isLoadingStaff } = useStaff();
  const { t } = useLanguage();
  
  // Get active staff members' names
  const staffMembers = staffList.filter(s => s.is_active).map(s => s.name);
  
  const [formData, setFormData] = useState<JobFormData>(
    job || {
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
    }
  );
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

  // Clear address when customer changes
  const handleCustomerChange = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    handleChange("customer", customerName);
    handleChange("customerId", customer?.id || "");
    handleChange("address", ""); // Reset address when customer changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
    setFormData({
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
  };

  const handleChange = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Sort customers alphabetically
  const sortedCustomers = [...customers].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? t("modal.editJob") : t("modal.createJob")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">{t("modal.customerName")} *</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerOpen}
                    className="w-full justify-between font-normal"
                    disabled={isLoadingCustomers}
                  >
                    {isLoadingCustomers ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("modal.loading")}
                      </span>
                    ) : formData.customer ? (
                      formData.customer
                    ) : (
                      t("modal.selectCustomer")
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("common.search")} />
                    <CommandList>
                      <CommandEmpty>{t("modal.noCustomerFound")}</CommandEmpty>
                      <CommandGroup>
                        {sortedCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name || ""}
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
              <Label htmlFor="service">{t("modal.serviceType")} *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => handleChange("service", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("modal.selectService")} />
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
            <Label htmlFor="address">{t("common.address")} *</Label>
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
                    {formData.address || (formData.customer ? t("modal.selectAddress") : t("modal.selectCustomerFirst"))}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[520px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("common.search")} />
                  <CommandList>
                    <CommandEmpty>{t("modal.noAddressFound")}</CommandEmpty>
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
              <Label htmlFor="date">{t("common.date")} *</Label>
              <DatePickerString
                id="date"
                value={formData.date}
                onChange={(value) => handleChange("date", value)}
                placeholder={t("payroll.pickDate")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">{t("common.time")} *</Label>
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
              <Label htmlFor="staff1">{t("modal.staffMember1")} *</Label>
              <Select
                value={formData.staff1}
                onValueChange={(value) => handleChange("staff1", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("modal.selectStaffMember")} />
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
              <Label htmlFor="staff2">{t("modal.staffMember2")}</Label>
              <Select
                value={formData.staff2}
                onValueChange={(value) => handleChange("staff2", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`${t("modal.selectStaffMember")} ${t("modal.optional")}`} />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="status">{t("common.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("users.selectStatus")} />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">{t("modal.duration")}</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder="e.g., 2h, 3h 30m"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t("modal.amount")} ($)</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="e.g., $150"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("modal.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes or instructions..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {job ? t("modal.saveChanges") : t("modal.createJob")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
