import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "@/hooks/useCustomers";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, MessageSquare, Calendar, User, Tag, X, Building2, PawPrint, ChevronDown, ChevronUp, MapPin, AlertCircle } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/customers/AddressAutocompleteInput";
import { AddressSuggestion } from "@/hooks/useAddressAutocomplete";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/useLanguage";

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Import centralized enums
import {
  SERVICE_TYPES as SERVICE_TYPE_VALUES,
  FREQUENCY_OPTIONS as FREQUENCY_VALUES,
  SERVICE_TYPE_OPTIONS,
  FREQUENCY_OPTIONS_UI,
  getAllowedFrequencies,
  getAllowedServiceTypes,
  isFrequencyLocked,
  getAutoFrequencyForService,
  normalizeServiceType,
  normalizeFrequency,
  type ServiceType,
  type FrequencyType,
} from "@/lib/serviceEnums";
import {
  ORIGIN_OPTIONS,
  PIPELINE_STAGES,
  PROPERTY_TYPES,
  RESIDENCE_TYPES,
  SERVICE_AREAS,
  ADD_ON_SERVICES,
  PREFERRED_DAYS,
  PREFERRED_TIMES,
  INTERACTION_TYPES,
  DEFAULT_TAGS,
} from "../constants/leadFormOptions";
import { leadFormSchema } from "../schemas/leadFormSchema";
import type { LeadAddressEntry, LeadInteractionEntry } from "../types/leadForm";
import { useLeadFormState } from "../hooks/useLeadFormState";
import { LeadPreferencesHistorySections } from "./LeadPreferencesHistorySections";
import { formatLeadCurrency } from "../utils/leadForm";
import { createLeadWithRelations } from "../services/leadCreationService";

export function CreateLeadModal({ open, onOpenChange }: CreateLeadModalProps) {
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const {
    formData,
    setFormData,
    addresses,
    setAddresses,
    interactions,
    setInteractions,
    expandedAreas,
    setExpandedAreas,
    expandedAddOns,
    setExpandedAddOns,
    resetLeadFormState,
  } = useLeadFormState();

  const resetForm = () => {
    resetLeadFormState();
    setNewTag("");
  };

  const addAddress = () => {
    setAddresses([
      ...addresses,
      {
        id: Date.now().toString(),
        name: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        notes: "",
      },
    ]);
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter((addr) => addr.id !== id));
    }
  };

  const updateAddress = (id: string, field: keyof LeadAddressEntry, value: string) => {
    setAddresses(
      addresses.map((addr) =>
        addr.id === id ? { ...addr, [field]: value } : addr
      )
    );
  };

  const addInteraction = () => {
    const now = new Date();
    setInteractions([
      ...interactions,
      {
        id: Date.now().toString(),
        type: "call",
        description: "",
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5),
      },
    ]);
  };

  const removeInteraction = (id: string) => {
    setInteractions(interactions.filter((i) => i.id !== id));
  };

  const updateInteraction = (id: string, field: keyof LeadInteractionEntry, value: string) => {
    setInteractions(
      interactions.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const togglePreferredDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const toggleServiceArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter((a) => a !== area)
        : [...prev.serviceAreas, area],
    }));
  };

  const toggleAddOn = (addon: string) => {
    setFormData((prev) => ({
      ...prev,
      addOnServices: prev.addOnServices.includes(addon)
        ? prev.addOnServices.filter((a) => a !== addon)
        : [...prev.addOnServices, addon],
    }));
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleAmountBlur = (value: string) => {
    const formatted = formatLeadCurrency(value);
    setFormData((prev) => ({ ...prev, agreedAmount: formatted }));
  };

  // Check if integration lead needs visit date
  const isIntegrationLead = ["google_ads", "google_local_services", "website", "phone", "email", "sms"].includes(formData.leadSource);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Required field validations
    if (!formData.primaryContactName.trim()) {
      errors.primaryContactName = t("leads.validation.nameRequired");
    } else if (formData.primaryContactName.length > 100) {
      errors.primaryContactName = t("leads.validation.nameTooLong");
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t("leads.validation.invalidEmail");
    }
    
    if (!formData.leadSource) {
      errors.leadSource = t("leads.validation.originRequired");
    }
    
    if (!formData.serviceType) {
      errors.serviceType = t("leads.validation.serviceRequired");
    }
    
    const nonEmptyAddresses = addresses.filter((addr) => addr.address.trim());
    if (nonEmptyAddresses.length === 0) {
      errors.address = t("leads.validation.addressRequired");
    }
    
    // Validate visit date for integration leads
    if (isIntegrationLead && !formData.visitDate) {
      errors.visitDate = t("leads.validation.visitDateRequired");
    }
    
    // Validate phone format if provided
    if (formData.phone && formData.phone.replace(/\D/g, "").length < 10) {
      errors.phone = t("leads.validation.invalidPhone");
    }
    
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error(t("leads.validation.fixErrors"));
      return false;
    }
    
    return true;
  };

  const handleCreateLead = async () => {
    if (isSaving || !validateForm()) return;

    setIsSaving(true);
    try {
      await createLeadWithRelations(formData, addresses, interactions);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
      ]);

      toast.success("Lead created successfully!");
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error("Error saving lead");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. Lead Identification */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              1. Lead Identification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryContactName" className="flex items-center gap-1">
                  <T k="leads.form.primaryContactName" /> <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={(e) => {
                    setFormData({ ...formData, primaryContactName: e.target.value });
                    if (validationErrors.primaryContactName) {
                      setValidationErrors(prev => ({ ...prev, primaryContactName: "" }));
                    }
                  }}
                  placeholder="Enter contact name"
                  className={validationErrors.primaryContactName ? "border-destructive" : ""}
                />
                {validationErrors.primaryContactName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.primaryContactName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <T k="leads.form.businessName" />
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </div>
                </Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Company or business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email"><T k="leads.origin.email" /></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (validationErrors.email) {
                      setValidationErrors(prev => ({ ...prev, email: "" }));
                    }
                  }}
                  placeholder="customer@email.com"
                  className={validationErrors.email ? "border-destructive" : ""}
                />
                {validationErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone"><T k="leads.phone" /></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (validationErrors.phone) {
                      setValidationErrors(prev => ({ ...prev, phone: "" }));
                    }
                  }}
                  placeholder="(555) 123-4567"
                  className={validationErrors.phone ? "border-destructive" : ""}
                />
                {validationErrors.phone && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  <T k="leads.form.tags" />
                </div>
              </Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 min-h-[44px]">
                  {formData.tags.length > 0 ? (
                    formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TAGS.filter((tag) => !formData.tags.includes(tag)).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="px-2 py-1 text-xs rounded border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add custom tag..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(newTag);
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(newTag)} disabled={!newTag.trim()}>
                    <T k="common.add" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Lead Origin */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              2. Lead Origin
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadSource" className="flex items-center gap-1">
                  Lead Source <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.leadSource || "none"}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      leadSource: value === "none" ? "" : value,
                      referralCustomerId: "",
                      referralName: "",
                    });
                    if (validationErrors.leadSource) {
                      setValidationErrors(prev => ({ ...prev, leadSource: "" }));
                    }
                  }}
                >
                  <SelectTrigger id="leadSource" className={validationErrors.leadSource ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">Select source...</SelectItem>
                    {ORIGIN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.leadSource && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.leadSource}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Lead Status</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Referral Fields */}
            {formData.leadSource === "referral" && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">Referral Source:</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="referralType"
                        checked={formData.referralType === "existing"}
                        onChange={() => setFormData({ ...formData, referralType: "existing", referralName: "" })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Existing Customer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="referralType"
                        checked={formData.referralType === "manual"}
                        onChange={() => setFormData({ ...formData, referralType: "manual", referralCustomerId: "" })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Manual Entry</span>
                    </label>
                  </div>
                </div>

                {formData.referralType === "existing" ? (
                  <div className="space-y-2">
                    <Label>Referring Customer</Label>
                    <Select
                      value={formData.referralCustomerId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, referralCustomerId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        <SelectItem value="none">Select a customer...</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {customer.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="referralName">Referrer Name</Label>
                    <Input
                      id="referralName"
                      value={formData.referralName}
                      onChange={(e) => setFormData({ ...formData, referralName: e.target.value })}
                      placeholder="Enter referrer name"
                    />
                  </div>
                )}
              </div>
            )}
          </div>


          {/* 3. Service Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              3. Service Information
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label><T k="leads.form.serviceType" /></Label>
                <Select
                  value={formData.serviceType || "none"}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">Select type...</SelectItem>
                    {SERVICE_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label><T k="leads.form.propertyType" /></Label>
                <Select
                  value={formData.propertyType || "none"}
                  onValueChange={(value) => setFormData({ ...formData, propertyType: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">Select property...</SelectItem>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Floors / Type of Residence</Label>
                <Select
                  value={formData.residenceType || "none"}
                  onValueChange={(value) => setFormData({ ...formData, residenceType: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">Select type...</SelectItem>
                    {RESIDENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="squareFeet"><T k="leads.form.squareFeet" /></Label>
                <Input
                  id="squareFeet"
                  type="number"
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                  placeholder="e.g., 2000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms"><T k="leads.form.bedrooms" /></Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="e.g., 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms"><T k="leads.form.bathrooms" /></Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  placeholder="e.g., 2"
                />
              </div>
              <div className="space-y-2">
                <Label><T k="leads.form.frequency" /></Label>
                <Select
                  value={formData.frequency || "none"}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">Select frequency...</SelectItem>
                    {FREQUENCY_OPTIONS_UI.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Has Pets */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <PawPrint className="w-5 h-5 text-muted-foreground" />
              <Label htmlFor="hasPets" className="flex-1 cursor-pointer"><T k="leads.form.hasPets" /></Label>
              <Switch
                id="hasPets"
                checked={formData.hasPets}
                onCheckedChange={(checked) => setFormData({ ...formData, hasPets: checked })}
              />
            </div>
          </div>

          {/* 4. Service Areas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              4. Service Areas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SERVICE_AREAS.map((area) => {
                const isChecked = formData.serviceAreas.includes(area.value);
                const isExpanded = expandedAreas[area.value] || false;

                return (
                  <div
                    key={area.value}
                    className={`rounded-lg border p-3 transition-all ${
                      isChecked
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/30 border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`area-${area.value}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleServiceArea(area.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`area-${area.value}`}
                          className="text-sm font-semibold cursor-pointer block"
                        >
                          {area.label}
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpandedAreas(prev => ({ ...prev, [area.value]: !prev[area.value] }))}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <T k="estimate.hideDetails" />
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <T k="estimate.viewDetails" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                        {area.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Add-On Services */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">
              5. Add-On Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ADD_ON_SERVICES.map((addon) => {
                const isChecked = formData.addOnServices.includes(addon.value);
                const isExpanded = expandedAddOns[addon.value] || false;

                return (
                  <div
                    key={addon.value}
                    className={`rounded-lg border p-3 transition-all ${
                      isChecked
                        ? "bg-accent/50 border-accent-foreground/30"
                        : "bg-muted/30 border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`addon-${addon.value}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleAddOn(addon.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`addon-${addon.value}`}
                          className="text-sm font-semibold cursor-pointer block"
                        >
                          {addon.label}
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpandedAddOns(prev => ({ ...prev, [addon.value]: !prev[addon.value] }))}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              <T k="estimate.hideDetails" />
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              <T k="estimate.viewDetails" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                        {addon.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-accent-foreground mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                6. Addresses
              </h3>
              <Button variant="outline" size="sm" onClick={addAddress}>
                <Plus className="w-4 h-4 mr-1" />
                <T k="leads.form.addAddress" />
              </Button>
            </div>

            <div className="space-y-4">
              {addresses.map((addr, index) => (
                <div key={addr.id} className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-primary" />
                      Address {index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAddress(addr.id)}
                      disabled={addresses.length === 1}
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-2">
                      <Label className="text-xs">Location Name</Label>
                      <Input
                        value={addr.name}
                        onChange={(e) => updateAddress(addr.id, "name", e.target.value)}
                        placeholder="e.g., Home"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                      <Label className="text-xs">Street Address</Label>
                      <AddressAutocompleteInput
                        value={addr.address}
                        onChange={(value) => updateAddress(addr.id, "address", value)}
                        onSelect={(suggestion: AddressSuggestion) => {
                          const streetAddress = suggestion.housenumber
                            ? `${suggestion.housenumber} ${suggestion.street}`
                            : suggestion.street;
                          // Update all fields at once to avoid state batching issues
                          setAddresses(prev => prev.map(a => 
                            a.id === addr.id 
                              ? { 
                                  ...a, 
                                  address: streetAddress,
                                  city: suggestion.city || "",
                                  state: suggestion.state || "",
                                  postalCode: suggestion.postcode || ""
                                } 
                              : a
                          ));
                        }}
                        placeholder="Start typing..."
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs"><T k="modal.city" /></Label>
                      <Input
                        value={addr.city}
                        onChange={(e) => updateAddress(addr.id, "city", e.target.value)}
                        placeholder="City"
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs"><T k="modal.state" /></Label>
                        <Input
                          value={addr.state}
                          onChange={(e) => updateAddress(addr.id, "state", e.target.value)}
                          placeholder="ST"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">ZIP</Label>
                        <Input
                          value={addr.postalCode}
                          onChange={(e) => updateAddress(addr.id, "postalCode", e.target.value)}
                          placeholder="12345"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address Notes</Label>
                    <Input
                      value={addr.notes}
                      onChange={(e) => updateAddress(addr.id, "notes", e.target.value)}
                      placeholder="Gate code, parking instructions, etc."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LeadPreferencesHistorySections
            formData={formData}
            setFormData={setFormData}
            interactions={interactions}
            isIntegrationLead={isIntegrationLead}
            interactionLabel="LeadInteractionEntry"
            togglePreferredDay={togglePreferredDay}
            handleAmountBlur={handleAmountBlur}
            addInteraction={addInteraction}
            removeInteraction={removeInteraction}
            updateInteraction={updateInteraction}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T k="leads.form.cancel" />
          </Button>
          <Button onClick={handleCreateLead} disabled={isSaving}>
            {isSaving ? "Saving..." : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
