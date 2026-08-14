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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  User, 
  Phone, 
  MapPin,
  Plus,
  Trash2,
  CalendarIcon,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Customer, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { useLanguage } from "@/contexts/useLanguage";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import { AddressSuggestion } from "@/hooks/useAddressAutocomplete";
import { useCustomerRelationships, useCreateRelationship, useEndRelationship } from "@/hooks/useCustomerRelationships";
import { CUSTOMER_DAYS_OF_WEEK, CUSTOMER_FREQUENCY_OPTIONS, CUSTOMER_PAYMENT_METHODS } from "../constants/customerFormOptions";
import { buildCustomerFormData, createEmptyCustomerFormState, createEmptyFormAddress, mapCustomerAddresses, mapCustomerToFormState } from "../utils/customerFormState";
import type { FormAddress } from "../utils/customerFormState";

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  mode: "create" | "edit";
}

export function CustomerModal({
  open,
  onOpenChange,
  customer,
  mode,
}: CustomerModalProps) {
  const { t } = useLanguage();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const createRelationship = useCreateRelationship();
  const endRelationship = useEndRelationship();
  
  // Fetch relationships to find active one
  const { data: customerRelationships = [] } = useCustomerRelationships(customer?.id || null);
  const activeRelationship = customerRelationships.find(r => !r.end_date);
  
  // Track original status to detect changes
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState(createEmptyCustomerFormState);
  const [addresses, setAddresses] = useState<FormAddress[]>(() => [createEmptyFormAddress()]);

  // Sync form data when customer changes or modal opens
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && customer) {
      const nextFormData = mapCustomerToFormState(customer);
      setOriginalStatus(nextFormData.status);
      setFormData(nextFormData);
      setAddresses(mapCustomerAddresses(customer));
      return;
    }

    if (mode === "create") {
      setOriginalStatus(null);
      setFormData(createEmptyCustomerFormState());
      setAddresses([createEmptyFormAddress()]);
    }
  }, [open, customer, mode]);

  const title = mode === "create" ? t("modal.addCustomer") : t("modal.editCustomer");

  const handleSubmit = () => {
    const customerFormData = buildCustomerFormData(formData, addresses);

    if (mode === "create") {
      createCustomer.mutate(customerFormData, {
        onSuccess: (newCustomer) => {
          // Create initial relationship period for new customer
          if (newCustomer?.id) {
            createRelationship.mutate({
              customer_id: newCustomer.id,
              start_date: format(formData.customerSince, "yyyy-MM-dd"),
              notes: "Initial relationship",
            });
          }
          onOpenChange(false);
        },
      });
    } else if (customer) {
      // Check if status changed
      const statusChanged = originalStatus !== formData.status;
      
      updateCustomer.mutate({ id: customer.id, formData: customerFormData }, {
        onSuccess: () => {
          if (statusChanged) {
            if (formData.status === "inactive" && activeRelationship) {
              // Status changed to inactive - end the active relationship
              const endDate = formData.inactiveDate 
                ? format(formData.inactiveDate, "yyyy-MM-dd") 
                : format(new Date(), "yyyy-MM-dd");
              
              endRelationship.mutate({
                id: activeRelationship.id,
                end_date: endDate,
                end_reason: formData.inactiveReason || "Status changed to inactive",
              });
            } else if (formData.status === "active" && !activeRelationship) {
              // Status changed to active - create new relationship period
              createRelationship.mutate({
                customer_id: customer.id,
                start_date: format(new Date(), "yyyy-MM-dd"),
                notes: "Reactivated",
              });
            }
          }
          onOpenChange(false);
        },
      });
    }
  };

  const addAddress = () => {
    const newId = Date.now().toString();
    setAddresses([...addresses, { ...createEmptyFormAddress(newId), name: "" }]);
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter((addr) => addr.id !== id));
    }
  };

  const updateAddress = (id: string, field: keyof Omit<FormAddress, "id">, value: string) => {
    setAddresses(
      addresses.map((addr) =>
        addr.id === id ? { ...addr, [field]: value } : addr
      )
    );
  };

  const handleAddressSelect = (id: string, suggestion: AddressSuggestion) => {
    setAddresses(
      addresses.map((addr) =>
        addr.id === id
          ? {
              ...addr,
              city: suggestion.city || addr.city,
              state: suggestion.state || addr.state,
              postal_code: suggestion.postcode || addr.postal_code,
            }
          : addr
      )
    );
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Customer Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t("modal.firstName")} *
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">{t("modal.lastName")} *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t("common.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john.doe@email.com"
            />
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone1" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t("modal.phoneNumber1")} *
              </Label>
              <Input
                id="phone1"
                value={formData.phone1}
                onChange={(e) =>
                  setFormData({ ...formData, phone1: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone2" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t("modal.phoneNumber2")}
              </Label>
              <Input
                id="phone2"
                value={formData.phone2}
                onChange={(e) =>
                  setFormData({ ...formData, phone2: e.target.value })
                }
                placeholder="(555) 987-6543"
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t("modal.addresses")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAddress}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {t("modal.addAddress")}
              </Button>
            </div>
            
            {addresses.map((addr, index) => (
              <div key={addr.id} className="grid gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Address {index + 1}
                  </span>
                  {addresses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAddress(addr.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-name-${addr.id}`} className="text-xs">
                        {t("modal.addressName")}
                      </Label>
                      <Input
                        id={`addr-name-${addr.id}`}
                        value={addr.name}
                        onChange={(e) => updateAddress(addr.id, "name", e.target.value)}
                        placeholder="Home, Business..."
                      />
                    </div>
                    <div className="grid gap-1 col-span-3">
                      <Label htmlFor={`addr-street-${addr.id}`} className="text-xs">
                        {t("modal.street")}
                      </Label>
                      <AddressAutocompleteInput
                        id={`addr-street-${addr.id}`}
                        value={addr.street}
                        onChange={(value) => updateAddress(addr.id, "street", value)}
                        onSelect={(suggestion) => handleAddressSelect(addr.id, suggestion)}
                        placeholder="123 Main St"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-complement-${addr.id}`} className="text-xs">
                        {t("modal.complement")}
                      </Label>
                      <Input
                        id={`addr-complement-${addr.id}`}
                        value={addr.complement}
                        onChange={(e) => updateAddress(addr.id, "complement", e.target.value)}
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-city-${addr.id}`} className="text-xs">
                        {t("modal.city")}
                      </Label>
                      <Input
                        id={`addr-city-${addr.id}`}
                        value={addr.city}
                        onChange={(e) => updateAddress(addr.id, "city", e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-state-${addr.id}`} className="text-xs">
                        {t("modal.state")}
                      </Label>
                      <Input
                        id={`addr-state-${addr.id}`}
                        value={addr.state}
                        onChange={(e) => updateAddress(addr.id, "state", e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-postal-${addr.id}`} className="text-xs">
                        {t("modal.postalCode")}
                      </Label>
                      <Input
                        id={`addr-postal-${addr.id}`}
                        value={addr.postal_code}
                        onChange={(e) => updateAddress(addr.id, "postal_code", e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-frequency-${addr.id}`} className="text-xs">
                        {t("modal.frequencyOfCleaning")}
                      </Label>
                      <Select
                        value={addr.frequency}
                        onValueChange={(value) => updateAddress(addr.id, "frequency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("modal.selectService")} />
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_FREQUENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`addr-day-${addr.id}`} className="text-xs">
                        {t("modal.preferredDay")}
                      </Label>
                      <Select
                        value={addr.preferred_day}
                        onValueChange={(value) => updateAddress(addr.id, "preferred_day", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("payroll.select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {t(day.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`addr-notes-${addr.id}`} className="text-xs">
                      {t("modal.notes")}
                    </Label>
                    <Textarea
                      id={`addr-notes-${addr.id}`}
                      value={addr.notes}
                      onChange={(e) => updateAddress(addr.id, "notes", e.target.value)}
                      placeholder="Gate code, parking instructions, special access..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`addr-additional-notes-${addr.id}`} className="text-xs">
                      {t("modal.additionalNotes")}
                    </Label>
                    <Textarea
                      id={`addr-additional-notes-${addr.id}`}
                      value={addr.additional_notes}
                      onChange={(e) => updateAddress(addr.id, "additional_notes", e.target.value)}
                      placeholder="Customer preferences, special requests, warnings..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Since */}
          <div className="grid gap-2">
            <Label>{t("modal.customerSince")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.customerSince && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.customerSince ? (
                    format(formData.customerSince, "PPP")
                  ) : (
                    <span>{t("modal.pickDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.customerSince}
                  onSelect={(date) =>
                    setFormData({ ...formData, customerSince: date || new Date() })
                  }
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">{t("common.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ 
                  ...formData, 
                  status: value,
                  inactiveDate: value === "inactive" ? (formData.inactiveDate || new Date()) : null,
                  inactiveReason: value === "active" ? "" : formData.inactiveReason
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("users.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inactive Date & Reason - Only shown when status is "inactive" */}
          {formData.status === "inactive" && (
            <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid gap-2">
                <Label><T k="literal.crm.inactive_since.9ee466b9" /></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.inactiveDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.inactiveDate ? (
                        format(formData.inactiveDate, "PPP")
                      ) : (
                        <span>{t("modal.pickDate")}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.inactiveDate || undefined}
                      onSelect={(date) =>
                        setFormData({ ...formData, inactiveDate: date || new Date() })
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inactiveReason"><T k="literal.crm.reason_for_inactivity.5468d01c" /></Label>
                <Textarea
                  id="inactiveReason"
                  value={formData.inactiveReason}
                  onChange={(e) =>
                    setFormData({ ...formData, inactiveReason: e.target.value })
                  }
                  placeholder="e.g., Moved away, No longer needs service, Budget constraints..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">{t("modal.paymentMethod")}</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("payroll.select")} />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
          </div>

          {/* Source - Where customer came from */}
          <div className="grid gap-2">
            <Label htmlFor="source">{t("modal.source")}</Label>
            <Select
              value={formData.source}
              onValueChange={(value) =>
                setFormData({ ...formData, source: value, referralName: value !== "referral" ? "" : formData.referralName })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("payroll.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">{t("source.website")}</SelectItem>
                <SelectItem value="phone">{t("source.phone")}</SelectItem>
                <SelectItem value="google">{t("source.google")}</SelectItem>
                <SelectItem value="facebook">{t("source.facebook")}</SelectItem>
                <SelectItem value="instagram">{t("source.instagram")}</SelectItem>
                <SelectItem value="nextdoor">{t("source.nextdoor")}</SelectItem>
                <SelectItem value="walk-in">{t("source.walkIn")}</SelectItem>
                <SelectItem value="referral">{t("source.referral")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Referral Name - Only shown when source is "referral" */}
          {formData.source === "referral" && (
            <div className="grid gap-2">
              <Label htmlFor="referralName">{t("modal.referralName")} *</Label>
              <Input
                id="referralName"
                value={formData.referralName}
                onChange={(e) =>
                  setFormData({ ...formData, referralName: e.target.value })
                }
                placeholder={t("source.whoReferred")}
              />
            </div>
          )}

          {/* Billing Contact Section */}
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                💳 Billing Contact
              </Label>
              <span className="text-xs text-muted-foreground">(Person responsible for payment)</span>
            </div>
            
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              {/* Billing Contact Name & Relationship */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="billingContactName"><T k="literal.crm.contact_name.8a42a57d" /></Label>
                  <Input
                    id="billingContactName"
                    value={formData.billingContactName}
                    onChange={(e) =>
                      setFormData({ ...formData, billingContactName: e.target.value })
                    }
                    placeholder="e.g., Ana Smith"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billingContactRelationship"><T k="literal.crm.relationship.9b4a86cb" /></Label>
                  <Select
                    value={formData.billingContactRelationship}
                    onValueChange={(value) =>
                      setFormData({ ...formData, billingContactRelationship: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self"><T k="literal.crm.self_same_as_customer.b022c124" /></SelectItem>
                      <SelectItem value="spouse"><T k="literal.crm.spouse.04aee080" /></SelectItem>
                      <SelectItem value="daughter"><T k="literal.crm.daughter.006bf747" /></SelectItem>
                      <SelectItem value="son"><T k="literal.crm.son.cdff1da1" /></SelectItem>
                      <SelectItem value="parent"><T k="literal.crm.parent.23d692f0" /></SelectItem>
                      <SelectItem value="sibling"><T k="literal.crm.sibling.55727ec5" /></SelectItem>
                      <SelectItem value="caregiver"><T k="literal.crm.caregiver.aefdc316" /></SelectItem>
                      <SelectItem value="property_manager"><T k="literal.crm.property_manager.4ce7be6e" /></SelectItem>
                      <SelectItem value="accountant"><T k="literal.crm.accountant.ac21a476" /></SelectItem>
                      <SelectItem value="other"><T k="leads.origin.other" /></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Billing Contact Email */}
              <div className="grid gap-2">
                <Label htmlFor="billingContactEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <T k="literal.crm.billing_email.5f8527ef" />
                </Label>
                <Input
                  id="billingContactEmail"
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, billingContactEmail: e.target.value })
                  }
                  placeholder="billing@email.com"
                />
                <span className="text-xs text-muted-foreground">
                  <T k="literal.crm.invoices_will_be_sent_to_this_email.6d454b0f" />
                </span>
              </div>

              {/* Billing Contact Phones */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="billingContactPhone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <T k="estimate.phone1" />
                  </Label>
                  <Input
                    id="billingContactPhone"
                    value={formData.billingContactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, billingContactPhone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billingContactPhone2" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <T k="estimate.phone2" />
                  </Label>
                  <Input
                    id="billingContactPhone2"
                    value={formData.billingContactPhone2}
                    onChange={(e) =>
                      setFormData({ ...formData, billingContactPhone2: e.target.value })
                    }
                    placeholder="(555) 987-6543"
                  />
                </div>
              </div>

              {/* Billing Contact Notes */}
              <div className="grid gap-2">
                <Label htmlFor="billingContactNotes"><T k="literal.crm.billing_notes.bb973961" /></Label>
                <Textarea
                  id="billingContactNotes"
                  value={formData.billingContactNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, billingContactNotes: e.target.value })
                  }
                  placeholder="Any special billing instructions, preferred contact times, etc."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t("modal.saving") : mode === "create" ? t("modal.addCustomer") : t("modal.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
