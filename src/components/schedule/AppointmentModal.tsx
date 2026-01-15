import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { InvoiceModal } from "./InvoiceModal";
import { AppointmentDetailsView } from "./AppointmentDetailsView";
import { useCleanersAndDrivers } from "@/hooks/useStaff";
import { useCustomers } from "@/hooks/useCustomers";
import { Loader2, Repeat } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Briefcase, 
  Users, 
  Phone, 
  Mail, 
  Edit, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Timer,
  FileText,
  Send,
  Play,
  Square,
  Star,
  Receipt,
  StickyNote,
  Navigation,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FREQUENCY_OPTIONS, SERVICE_TYPES } from "@/lib/serviceEnums";

interface PrefilledData {
  customer?: string;
  address?: string;
  service?: string;
  serviceType?: string;
  amount?: string;
  estimateId?: string;
}

interface EditJobData {
  id: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  team: string;
  status: string;
  duration: string;
  amount: string;
  address: string;
  notes: string;
  additionalNotes: string;
}

const TEAM_OPTIONS = ["1", "2", "3", "4", "5", "6"];

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: {
    id: string | number;
    time: string;
    customer: string;
    customerId?: string;
    address: string;
    service: string;
    description?: string;
    title?: string;
    staff: string;
    status: string;
    duration: string;
    date?: string;
    team?: string;
    amount?: number | string;
    notes?: string;
    additionalNotes?: string;
    feedback?: string;
    timeStarted?: string;
    timeFinished?: string;
    onOurWayTime?: string;
    paymentMethod?: string;
  } | null;
  mode: "create" | "view" | "edit";
  prefilledData?: PrefilledData;
  editJobData?: EditJobData | null;
  onJobCreated?: (jobData: {
    customer: string;
    address: string;
    serviceType: string;
    frequency?: string;
    amount: number;
    date: string;
    time: string;
    staffMembers: string[];
    status: string;
    duration: string;
    notes: string;
    additionalNotes: string;
    generateRecurring?: boolean;
  }) => void;
  onJobUpdated?: (jobData: {
    id: string;
    customer: string;
    address: string;
    serviceType: string;
    amount: number;
    date: string;
    time: string;
    staffMembers: string[];
    status: string;
    duration: string;
    notes: string;
    additionalNotes: string;
  }) => void;
  onJobDeleted?: (jobId: string) => void;
  onRequestEdit?: (appointment: {
    id: string | number;
    time: string;
    customer: string;
    address: string;
    service: string;
    staff: string;
    status: string;
    duration: string;
    date?: string;
    team?: string;
    amount?: number | string;
    notes?: string;
    additionalNotes?: string;
    feedback?: string;
    timeStarted?: string;
    timeFinished?: string;
    onOurWayTime?: string;
    paymentMethod?: string;
  }) => void;
}

// staffMembers is now fetched from the database via useCleanersAndDrivers hook

// Services and frequencies now use the centralized enum (imported at top of file)
const services = [...SERVICE_TYPES];
const frequencies = [...FREQUENCY_OPTIONS];

const statuses = [
  { value: "scheduled", label: "Scheduled" },
  { value: "on-the-way", label: "On The Way" },
  { value: "in-progress", label: "Cleaning Now" },
  { value: "completed", label: "Cleaning Done" },
  { value: "cancelled", label: "Cancelled" },
];

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return {
        icon: CheckCircle,
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        label: "Cleaning Done",
      };
    case "in-progress":
      return {
        icon: Timer,
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        label: "Cleaning Now",
      };
    case "on-the-way":
      return {
        icon: Navigation,
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "On The Way",
      };
    case "cancelled":
      return {
        icon: AlertCircle,
        color: "bg-red-500/10 text-red-600 border-red-500/20",
        label: "Cancelled",
      };
    default:
      return {
        icon: Clock,
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        label: "Scheduled",
      };
  }
};

export function AppointmentModal({
  open,
  onOpenChange,
  appointment,
  mode,
  prefilledData,
  editJobData,
  onJobCreated,
  onJobUpdated,
  onJobDeleted,
  onRequestEdit,
}: AppointmentModalProps) {
  // Fetch cleaners and drivers from database
  const { data: staffFromDb = [] } = useCleanersAndDrivers();
  const staffMembers = staffFromDb.map((s) => s.name);
  const { t } = useLanguage();

  // Fetch customers from database
  const { data: customersFromDb = [], isLoading: isLoadingCustomers } = useCustomers();
  
  // Sort customers alphabetically
  const customers = useMemo(() => 
    [...customersFromDb].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [customersFromDb]
  );

  const [formData, setFormData] = useState({
    customer: "",
    address: "",
    service: "",
    frequency: "",
    teams: [] as string[],
    time: "",
    date: "",
    duration: "",
    amount: "",
    status: "scheduled",
    notes: "",
    additionalNotes: "",
    generateRecurring: true,
  });
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Get selected customer object
  const selectedCustomer = customers.find(c => c.name === formData.customer);
  
  // Get addresses for selected customer from database
  const availableAddresses = useMemo(() => {
    if (!selectedCustomer?.addresses) return [];
    return selectedCustomer.addresses.map(addr => {
      const fullAddress = addr.street 
        ? `${addr.street}${addr.city ? `, ${addr.city}` : ''}${addr.state ? `, ${addr.state}` : ''}`
        : '';
      return {
        id: addr.id || '',
        address: fullAddress,
        type: addr.name || "Home",
        notes: addr.notes || "",
        additionalNotes: addr.additional_notes || "",
      };
    });
  }, [selectedCustomer]);

  // Reset form when modal opens or mode/data changes
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && editJobData) {
      // Edit mode - populate from editJobData
      // Parse teams from editJobData.team (could be comma-separated or single value)
      const teamsFromEdit = editJobData.team
        ? Array.from(
            new Set(editJobData.team.split(",").map((t) => t.trim()).filter(Boolean))
          )
        : [];
      setFormData({
        customer: editJobData.customer || "",
        address: editJobData.address || "",
        service: (editJobData.service || "").trim(),
        frequency: "",
        teams: teamsFromEdit,
        time: editJobData.time || "",
        date: editJobData.date || "",
        duration: editJobData.duration || "",
        amount: editJobData.amount || "",
        status: editJobData.status || "scheduled",
        notes: editJobData.notes || "",
        additionalNotes: editJobData.additionalNotes || "",
        generateRecurring: false, // Don't generate recurring when editing
      });
    } else if (mode === "create") {
      // Create mode - use prefilledData or reset
      const initialCustomer = prefilledData?.customer || "";
      const initialAddress = prefilledData?.address || "";
      // Use serviceType if available, otherwise fall back to service
      const initialService = (prefilledData?.serviceType || prefilledData?.service || "").trim();

      setFormData({
        customer: initialCustomer,
        address: initialAddress,
        service: initialService,
        frequency: "",
        teams: [],
        time: "",
        date: "",
        duration: "",
        amount: prefilledData?.amount || "",
        status: "scheduled",
        notes: "",
        additionalNotes: "",
        generateRecurring: true,
      });
    }
  }, [open, mode, editJobData, prefilledData]);

  // Clear address and address-notes when customer changes, and set service from customer frequency
  const handleCustomerChange = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    const frequencyToService: Record<string, string> = {
      // New standardized frequency values
      'Daily': 'Regular Cleaning',
      'Weekly': 'Regular Cleaning',
      'Regular Cleaning 2 Weeks': 'Regular Cleaning',
      'Regular Cleaning 3 Weeks': 'Regular Cleaning',
      'Regular Cleaning 4 Weeks': 'Regular Cleaning',
      // 'Once a Month' removed - mapped to 'Regular Cleaning 4 Weeks'
      'One-Time': 'Deep Cleaning',
      // Legacy values for backwards compatibility
      'weekly': 'Regular Cleaning',
      '2weeks': 'Regular Cleaning',
      'bi-weekly': 'Regular Cleaning',
      '3weeks': 'Regular Cleaning',
      '4weeks': 'Regular Cleaning',
      'monthly': 'Regular Cleaning',
      '8weeks': 'Regular Cleaning',
      '2months': 'Regular Cleaning',
      'one-time': 'Deep Cleaning',
      '3times': 'Regular Cleaning',
    };
    const customerFrequency = customer?.frequency?.toLowerCase() || '';
    const matchedService = frequencyToService[customerFrequency] || '';

    setFormData((prev) => ({
      ...prev,
      customer: customerName,
      address: "",
      notes: "",
      additionalNotes: "",
      service: (matchedService || prev.service || "").trim(),
    }));
  };

  // Update address-notes when address changes
  const handleAddressChange = (selectedAddressValue: string) => {
    // Find address by case-insensitive comparison since cmdk lowercases values
    const selectedAddress = availableAddresses.find(
      (addr) => addr.address.toLowerCase() === selectedAddressValue.toLowerCase()
    );
    // Use the original address from availableAddresses to preserve casing
    const actualAddress = selectedAddress?.address || selectedAddressValue;
    setFormData((prev) => ({
      ...prev,
      address: actualAddress,
      notes: selectedAddress?.notes || prev.notes,
      additionalNotes: selectedAddress?.additionalNotes || prev.additionalNotes,
    }));
  };

  const isViewMode = mode === "view";

  const handleSubmit = () => {
    console.log("Submitting:", formData);
    const amount = parseFloat(formData.amount.replace(/[^0-9.]/g, '')) || 0;
    // Teams are stored as array of team numbers (unique)
    const staffMembers = Array.from(new Set(formData.teams.map((t) => t.trim()).filter(Boolean)));

    if (mode === "edit" && editJobData && onJobUpdated) {
      onJobUpdated({
        id: editJobData.id,
        customer: formData.customer,
        address: formData.address,
        serviceType: formData.service,
        amount,
        date: formData.date,
        time: formData.time,
        staffMembers,
        status: formData.status,
        duration: formData.duration,
        notes: formData.notes,
        additionalNotes: formData.additionalNotes,
      });
    } else if (onJobCreated) {
      onJobCreated({
        customer: formData.customer,
        address: formData.address,
        serviceType: formData.service,
        frequency: formData.frequency,
        amount,
        date: formData.date,
        time: formData.time,
        staffMembers,
        status: formData.status,
        duration: formData.duration,
        notes: formData.notes,
        additionalNotes: formData.additionalNotes,
        generateRecurring: formData.generateRecurring,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editJobData && onJobDeleted) {
      onJobDeleted(editJobData.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    }
  };

  const statusConfig = getStatusConfig(formData.status);
  const StatusIcon = statusConfig.icon;

  // View Mode - Details layout (matches reference screenshot)
  if (isViewMode) {
    if (!appointment) return null;

    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto" hideCloseButton>
            <AppointmentDetailsView
              appointment={appointment}
              onClose={() => onOpenChange(false)}
              onOpenInvoice={() => setInvoiceModalOpen(true)}
              onEdit={() => onRequestEdit?.(appointment)}
            />
          </DialogContent>
        </Dialog>

        <InvoiceModal
          open={invoiceModalOpen}
          onOpenChange={setInvoiceModalOpen}
          appointment={{
            id: appointment.id,
            customer: appointment.customer,
            customerId: appointment.customerId,
            address: appointment.address,
            service: appointment.service,
            description: appointment.description || appointment.title || appointment.service,
            time: appointment.time,
            amount: appointment.amount,
            duration: appointment.duration,
            date: appointment.date,
          }}
        />
      </>
    );
  }

  // Create/Edit Mode - Form interface
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("appointment.newJob") : t("appointment.editJob")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">{t("appointment.customerName")} *</Label>
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
                      t("appointment.selectCustomer")
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("appointment.searchCustomer")} />
                    <CommandList>
                      <CommandEmpty>{t("appointment.noCustomerFound")}</CommandEmpty>
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
              <Label htmlFor="service">{t("appointment.serviceType")} *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData({ ...formData, service: value.trim() })}
              >
                <SelectTrigger>
                  <span className={cn(!formData.service && "text-muted-foreground")}>
                    {formData.service || t("appointment.selectService")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {/* Ensure imported/custom values still appear and can be selected */}
                  {formData.service && !services.includes(formData.service as typeof services[number]) && (
                    <SelectItem key={formData.service} value={formData.service}>
                      {formData.service}
                    </SelectItem>
                  )}
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
            <Label htmlFor="frequency">{t("appointment.frequency") || "Frequency"}</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <span className={cn(!formData.frequency && "text-muted-foreground")}>
                  {formData.frequency || "Select frequency"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("appointment.address")} *</Label>
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
                    {formData.address || (formData.customer ? t("appointment.selectAddress") : t("appointment.selectCustomerFirst"))}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[520px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("common.search")} />
                  <CommandList>
                    <CommandEmpty>{t("appointment.noAddressFound")}</CommandEmpty>
                    <CommandGroup>
                      {availableAddresses.map((addr) => (
                        <CommandItem
                          key={addr.id}
                          value={addr.address}
                          onSelect={() => {
                            // Toggle: if same address is selected, clear it; otherwise set it
                            const newAddress = formData.address.toLowerCase() === addr.address.toLowerCase() ? "" : addr.address;
                            handleAddressChange(newAddress);
                            setAddressOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.address.toLowerCase() === addr.address.toLowerCase() ? "opacity-100" : "opacity-0"
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

          {/* Address Notes - part of the address */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("appointment.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("appointment.notes")}
              rows={2}
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">{t("appointment.additionalNotes")}</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder={t("appointment.additionalNotes")}
              rows={2}
              className="bg-muted/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">{t("appointment.date")} *</Label>
              <DatePickerString
                id="date"
                value={formData.date}
                onChange={(value) => setFormData({ ...formData, date: value })}
                placeholder={t("payroll.pickDate")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">{t("appointment.time")} *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teams * <span className="text-xs text-muted-foreground">(selecione 1 ou mais)</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {formData.teams.length > 0 
                      ? formData.teams.map(t => `Team ${t}`).join(', ')
                      : "Select Teams"
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="space-y-2">
                    {TEAM_OPTIONS.map((teamNum) => {
                      const isSelected = formData.teams.includes(teamNum);
                      return (
                        <div 
                          key={teamNum} 
                          className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded-md"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              teams: isSelected
                                ? prev.teams.filter((t) => t !== teamNum)
                                : Array.from(new Set([...prev.teams, teamNum])),
                            }));
                          }}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                teams: checked
                                  ? Array.from(new Set([...prev.teams, teamNum]))
                                  : prev.teams.filter((t) => t !== teamNum),
                              }));
                            }}
                          />
                          <span className="text-sm">Team {teamNum}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("appointment.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("appointment.selectStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
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
              <Label htmlFor="duration">{t("appointment.duration")}</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 2h, 3h 30m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t("appointment.amount")} ($)</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="e.g., $150"
              />
            </div>
          </div>

          {/* Generate Recurring Checkbox - only show in create mode */}
          {mode === "create" && (
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Checkbox
                id="generateRecurring"
                checked={formData.generateRecurring}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, generateRecurring: checked === true })
                }
              />
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="generateRecurring" className="text-sm font-normal cursor-pointer">
                  Gerar agendamentos recorrentes automaticamente (próximo mês)
                </Label>
              </div>
            </div>
          )}


          <div className="flex justify-between gap-3 pt-4">
            {mode === "edit" && editJobData && onJobDeleted && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="mr-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("appointment.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("appointment.deleteJob")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("appointment.deleteConfirmation")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t("appointment.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {mode === "create" ? t("appointment.createJob") : t("appointment.saveChanges")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
