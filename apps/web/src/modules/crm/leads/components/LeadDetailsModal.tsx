import { T } from "@/shared/components/i18n/T";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Receipt,
  Briefcase,
  Home,
  Building2,
  PawPrint,
  Ruler,
  BedDouble,
  Bath,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useLanguage } from "@/contexts/useLanguage";
import { useCreateLeadInteraction, INTERACTION_TYPES } from "@/hooks/useLeads";
import { LEAD_ROOM_SERVICES } from "../constants/leadRoomServices";
import { createLeadDepositInvoice } from "../services/leadDepositInvoiceService";

export interface Interaction {
  id: string;
  date: string;
  time: string;
  subject: string;
  attendedBy: string;
  notes: string;
  interaction_type?: string;
}

interface RoomSelection {
  kitchen: boolean;
  bathroom: boolean;
  bedroom: boolean;
  diningLiving: boolean;
  laundryRoom: boolean;
  addOns: boolean;
}

interface AddressData {
  id: string;
  addressName: string;
  address: string;
  preferenceDays: string;
  preferenceTime: string;
  frequency: string;
  serviceType: string;
  firstCleaningAmount: string;
  regularAmount: string;
  notes: string;
  additionalNotes: string;
  rooms?: RoomSelection;
}

interface Lead {
  id: string;
  customer: string;
  email?: string;
  phone?: string;
  phoneNumber2?: string;
  service: string;
  amount: string;
  date: string;
  expiryDate: string;
  status: string;
  validUntil: string;
  origin?: string;
  referredBy?: string;
  hasJob?: boolean;
  interactions?: Interaction[];
  addresses?: AddressData[];
  visitDate?: string;
  estimateApproved?: boolean;
  invoicePaid?: boolean;
  notes?: string;
  additionalNotes?: string;
  _dbId?: string;
  _customerId?: string;
  // New property fields
  propertyType?: string;
  residenceType?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasPets?: boolean;
  addOnServices?: string[];
  businessName?: string;
  tags?: string[];
  specialInstructions?: string;
}

interface LeadDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate: Lead | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCreateJob?: (estimate: Lead) => void;
}


export function LeadDetailsModal({ 
  open, 
  onOpenChange, 
  estimate,
  onApprove,
  onReject,
  onCreateJob,
}: LeadDetailsModalProps) {
  const { t, language } = useLanguage();
  const [expandedRooms, setExpandedRooms] = useState<Record<string, Record<string, boolean>>>({});
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    description: "",
  });
  const [isApproving, setIsApproving] = useState(false);

  const createInteractionMutation = useCreateLeadInteraction();

  if (!estimate) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": 
      case "active_customer": return "default";
      case "pending": 
      case "new_lead": return "secondary";
      case "expired": return "destructive";
      case "draft": return "outline";
      case "rejected": 
      case "disqualified": return "destructive";
      case "estimate_completed": return "default";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": 
      case "active_customer": return <CheckCircle className="w-4 h-4" />;
      case "pending": 
      case "new_lead": return <Clock className="w-4 h-4" />;
      case "expired": return <XCircle className="w-4 h-4" />;
      case "rejected": 
      case "disqualified": return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Validate required fields for approval
  const validateForApproval = (): string[] => {
    const errors: string[] = [];
    
    if (!estimate.addresses || estimate.addresses.length === 0) {
      errors.push("Pelo menos um endereço deve ser preenchido");
      return errors;
    }

    for (let i = 0; i < estimate.addresses.length; i++) {
      const addr = estimate.addresses[i];
      const addrLabel = addr.addressName || `Endereço ${i + 1}`;
      
      if (!addr.preferenceDays) {
        errors.push(`${addrLabel}: Preference Days é obrigatório`);
      }
      if (!addr.preferenceTime) {
        errors.push(`${addrLabel}: Preference Time é obrigatório`);
      }
      if (!addr.frequency) {
        errors.push(`${addrLabel}: Frequency é obrigatório`);
      }
      if (!addr.serviceType) {
        errors.push(`${addrLabel}: Tipo de Serviço é obrigatório`);
      }
      if (!addr.firstCleaningAmount) {
        errors.push(`${addrLabel}: First Cleaning é obrigatório`);
      }
      if (!addr.regularAmount) {
        errors.push(`${addrLabel}: Regular é obrigatório`);
      }
      
      // Check if at least one service area is selected
      const hasServiceAreas = addr.rooms && Object.values(addr.rooms).some(v => v);
      if (!hasServiceAreas) {
        errors.push(`${addrLabel}: Pelo menos uma Service Area deve ser selecionada`);
      }
    }
    
    return errors;
  };

  const generateDepositInvoice = async () => {
    if (!estimate._dbId || !estimate._customerId) return null;
    return createLeadDepositInvoice({
      leadId: estimate._dbId,
      customerId: estimate._customerId,
      amount: estimate.amount,
      service: estimate.service,
    });
  };

  const handleApprove = async () => {
    const validationErrors = validateForApproval();
    
    if (validationErrors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <p className="font-semibold"><T k="literal.crm.preencha_os_campos_obrigatorios.4dafd3df" /></p>
          <ul className="text-sm list-disc pl-4">
            {validationErrors.slice(0, 5).map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
            {validationErrors.length > 5 && (
              <li>...e mais {validationErrors.length - 5} erro(s)</li>
            )}
          </ul>
        </div>
      );
      return;
    }

    setIsApproving(true);

    try {
      // Generate 50% deposit invoice
      const invoice = await generateDepositInvoice();
      
      if (invoice) {
        toast.success(
          <div>
            <p className="font-semibold"><T k="literal.crm.estimate_aprovado_com_sucesso.4ab6e6c6" /></p>
            <p className="text-sm">Invoice {invoice.invoice_number} gerado (50% depósito)</p>
          </div>
        );
      }

      // Call the parent's onApprove
      onApprove(estimate.id);
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao aprovar estimate. Tente novamente.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    onReject(estimate.id);
    toast.info(`Lead ${estimate.id} ${t("estimate.leadRejected")}.`);
    onOpenChange(false);
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.type) {
      toast.error("Selecione o tipo de interação");
      return;
    }

    if (!estimate._dbId) {
      toast.error("Erro: Lead não possui ID válido");
      return;
    }

    try {
      createInteractionMutation.mutate({
        lead_id: estimate._dbId,
        interaction_type: newInteraction.type,
        interaction_date: `${newInteraction.date}T${newInteraction.time}`,
        description: newInteraction.description,
      });

      toast.success("Interação adicionada com sucesso!");
      setShowAddInteraction(false);
      setNewInteraction({
        type: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        description: "",
      });
    } catch (error) {
      toast.error("Erro ao adicionar interação");
    }
  };

  const toggleRoomExpand = (addressId: string, roomKey: string) => {
    setExpandedRooms(prev => ({
      ...prev,
      [addressId]: {
        ...prev[addressId],
        [roomKey]: !prev[addressId]?.[roomKey],
      }
    }));
  };

  const isPending = estimate.status === "pending" || estimate.status === "draft" || estimate.status === "new_lead";
  const isEstimateCompleted = estimate.status === "estimate_completed";
  const isApproved = estimate.status === "approved" || estimate.status === "active_customer" || estimate.estimateApproved;
  const isRejected = estimate.status === "rejected" || estimate.status === "disqualified";
  const canApprove = isEstimateCompleted || isPending;
  const canCreateJob = isApproved && estimate.invoicePaid;

  // Parse amount to number for calculations
  const amountValue = parseFloat(estimate.amount.replace(/[^0-9.]/g, ''));
  const depositAmount = (amountValue * 0.5).toFixed(2);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const locale = language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";
    return date.toLocaleDateString(locale);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const locale = language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";
    return date.toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Lead {estimate.id}
            </DialogTitle>
            <Badge variant={getStatusColor(estimate.status)} className="flex items-center gap-1">
              {getStatusIcon(estimate.status)}
              <span className="capitalize">{estimate.status.replace(/_/g, " ")}</span>
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("estimate.customerInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("estimate.name")}</p>
                  <p className="font-medium">{estimate.customer}</p>
                </div>
              </div>
              {estimate.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("estimate.email")}</p>
                    <p className="font-medium">{estimate.email}</p>
                  </div>
                </div>
              )}
              {estimate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("estimate.phone1")}</p>
                    <p className="font-medium">{estimate.phone}</p>
                  </div>
                </div>
              )}
              {estimate.phoneNumber2 && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("estimate.phone2")}</p>
                    <p className="font-medium">{estimate.phoneNumber2}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Property Information */}
          {(estimate.propertyType || estimate.bedrooms || estimate.bathrooms || estimate.squareFeet || estimate.hasPets || (estimate.addOnServices && estimate.addOnServices.length > 0)) && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <T k="literal.crm.property_information.ca8911ec" />
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  {estimate.propertyType && (
                    <div className="flex items-center gap-2">
                      {estimate.propertyType === "residential" ? (
                        <Home className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.propertyType" /></p>
                        <p className="font-medium capitalize">{estimate.propertyType}</p>
                      </div>
                    </div>
                  )}
                  {estimate.residenceType && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.residenceType" /></p>
                        <p className="font-medium capitalize">{estimate.residenceType}</p>
                      </div>
                    </div>
                  )}
                  {estimate.bedrooms !== undefined && estimate.bedrooms > 0 && (
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.bedrooms" /></p>
                        <p className="font-medium">{estimate.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {estimate.bathrooms !== undefined && estimate.bathrooms > 0 && (
                    <div className="flex items-center gap-2">
                      <Bath className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.bathrooms" /></p>
                        <p className="font-medium">{estimate.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {estimate.squareFeet !== undefined && estimate.squareFeet > 0 && (
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.squareFeet" /></p>
                        <p className="font-medium">{estimate.squareFeet.toLocaleString()} sqft</p>
                      </div>
                    </div>
                  )}
                  {estimate.hasPets && (
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.hasPets" /></p>
                        <p className="font-medium text-amber-600"><T k="common.yes" /></p>
                      </div>
                    </div>
                  )}
                  {estimate.businessName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground"><T k="leads.form.businessName" /></p>
                        <p className="font-medium">{estimate.businessName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add-on Services */}
                {estimate.addOnServices && estimate.addOnServices.length > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium"><T k="leads.form.addOnServices" /></p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {estimate.addOnServices.map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                {estimate.specialInstructions && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium mb-1"><T k="leads.form.specialInstructions" /></p>
                    <p className="text-sm">{estimate.specialInstructions}</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Origin and Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("estimate.leadDetails")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              {estimate.origin && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("estimate.origin")}</p>
                    <p className="font-medium">{estimate.origin}</p>
                  </div>
                </div>
              )}
              {estimate.origin === "Referral" && estimate.referredBy && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground"><T k="literal.crm.indicado_por.45599786" /></p>
                    <p className="font-medium">{estimate.referredBy}</p>
                  </div>
                </div>
              )}
              {estimate.visitDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground"><T k="leads.visitDate" /></p>
                    <p className="font-medium">{formatDate(estimate.visitDate)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("estimate.createdDate")}</p>
                  <p className="font-medium">{formatDate(estimate.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("estimate.validUntil")}</p>
                  <p className="font-medium">{estimate.validUntil || formatDate(estimate.expiryDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground"><T k="estimate.totalAmount" /></p>
                  <p className="font-semibold text-lg text-primary">{estimate.amount}</p>
                </div>
              </div>
            </div>
          </div>


          <Separator />

          {/* Service Addresses */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("estimate.serviceAddresses")}
            </h3>
            
            {estimate.addresses && estimate.addresses.length > 0 ? (
              <div className="space-y-4">
                {estimate.addresses.map((addr, index) => (
                  <div 
                    key={addr.id || index} 
                    className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="w-4 h-4 text-primary" />
                      {addr.addressName || `${t("estimate.address")} ${index + 1}`}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("estimate.address")}</p>
                        <p className="text-sm font-medium">{addr.address}</p>
                      </div>
                      {addr.serviceType && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("estimate.serviceType")}</p>
                          <p className="text-sm font-medium">{addr.serviceType}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {addr.preferenceDays && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("estimate.preferenceDays")}</p>
                          <p className="text-sm font-medium">{addr.preferenceDays}</p>
                        </div>
                      )}
                      {addr.preferenceTime && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("estimate.preferenceTime")}</p>
                          <p className="text-sm font-medium">{addr.preferenceTime}</p>
                        </div>
                      )}
                      {addr.frequency && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("estimate.frequency")}</p>
                          <p className="text-sm font-medium">{addr.frequency}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {addr.firstCleaningAmount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">{t("estimate.firstCleaning")}</p>
                            <p className="text-sm font-semibold text-primary">{addr.firstCleaningAmount}</p>
                          </div>
                        </div>
                      )}
                      {addr.regularAmount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">{t("estimate.regular")}</p>
                            <p className="text-sm font-semibold text-primary">{addr.regularAmount}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Room Services */}
                    {addr.rooms && Object.values(addr.rooms).some(v => v) && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">{t("estimate.serviceAreas")}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {(Object.keys(LEAD_ROOM_SERVICES) as Array<keyof typeof LEAD_ROOM_SERVICES>).map((roomKey) => {
                            const room = LEAD_ROOM_SERVICES[roomKey];
                            const isChecked = addr.rooms?.[roomKey];
                            const isExpanded = expandedRooms[addr.id]?.[roomKey] || false;

                            if (!isChecked) return null;

                            return (
                              <div
                                key={roomKey}
                                className="border rounded-lg p-3 border-primary bg-primary/5"
                              >
                                <div className="flex items-start gap-2">
                                  <Checkbox
                                    checked={isChecked}
                                    disabled
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold block">
                                      {room.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleRoomExpand(addr.id, roomKey)}
                                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          {t("estimate.hideDetails")}
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          {t("estimate.viewDetails")}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                                    {room.items.map((item, idx) => (
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
                    )}

                    {addr.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("estimate.observations")}</p>
                        <p className="text-sm bg-background/50 p-2 rounded mt-1">{addr.notes}</p>
                      </div>
                    )}

                    {addr.additionalNotes && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t("estimate.additionalObservations")}</p>
                        <p className="text-sm bg-background/50 p-2 rounded mt-1">{addr.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  <T k="literal.crm.nenhum_endereco_cadastrado.af9499e2" />
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Interaction History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t("estimate.interactionHistory")}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddInteraction(!showAddInteraction)}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <T k="literal.crm.add_interaction.5e56ca5d" />
              </Button>
            </div>

            {/* Add Interaction Form */}
            {showAddInteraction && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <h4 className="font-medium text-sm"><T k="literal.crm.nova_interacao.5d4a9596" /></h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select 
                      value={newInteraction.type}
                      onValueChange={(value) => setNewInteraction(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERACTION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {type.value === "call" && <Phone className="w-4 h-4" />}
                              {type.value === "sms" && <MessageSquare className="w-4 h-4" />}
                              {type.value === "email" && <Mail className="w-4 h-4" />}
                              {type.value === "visit" && <Calendar className="w-4 h-4" />}
                              {type.value === "whatsapp" && <MessageSquare className="w-4 h-4" />}
                              {type.value === "other" && <FileText className="w-4 h-4" />}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label><T k="common.date" /></Label>
                    <Input
                      type="date"
                      value={newInteraction.date}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label><T k="common.time" /></Label>
                    <Input
                      type="time"
                      value={newInteraction.time}
                      onChange={(e) => setNewInteraction(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label><T k="invoice.description" /></Label>
                  <Textarea
                    value={newInteraction.description}
                    onChange={(e) => setNewInteraction(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a interação..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddInteraction(false)}
                  >
                    <T k="leads.form.cancel" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAddInteraction}
                    disabled={createInteractionMutation.isPending}
                  >
                    {createInteractionMutation.isPending ? "Salvando..." : "Salvar Interação"}
                  </Button>
                </div>
              </div>
            )}
            
            {!estimate.interactions || estimate.interactions.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("estimate.noInteractionsRegistered")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Add Interaction" para registrar o primeiro contato
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-3">
                  {estimate.interactions.map((interaction, index) => (
                    <div 
                      key={interaction.id} 
                      className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {interaction.interaction_type || interaction.subject || "Contato"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(`${interaction.date}T${interaction.time || "00:00"}`)}
                          </span>
                        </div>
                      </div>
                      {interaction.attendedBy && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <User className="w-3 h-3" />
                          <span>{t("estimate.attendedBy")}: <span className="font-medium text-foreground">{interaction.attendedBy}</span></span>
                        </div>
                      )}
                      {interaction.notes && (
                        <p className="text-sm text-foreground bg-background/50 p-2 rounded">
                          {interaction.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Approval Flow Info */}
          {canApprove && !isApproved && (
            <>
              <Separator />
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground"><T k="literal.crm.aprovar_estimate.3df06bbc" /></h4>
                    <p className="text-sm text-muted-foreground">
                      <T k="literal.crm.ao_aprovar_este_estimate_as_seguintes_acoes_.36b592d5" />
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-7">
                  <li className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    Invoice de 50% (${depositAmount}) será gerado automaticamente
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <T k="literal.crm.campos_de_preferencias_serao_liberados_para_.2abc9a79" />
                  </li>
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Após pagamento do invoice, botão "Criar Job" será liberado
                  </li>
                </ul>
              </div>
            </>
          )}

          {isApproved && !estimate.invoicePaid && (
            <>
              <Separator />
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-semibold text-amber-700"><T k="literal.crm.aguardando_pagamento.c458a268" /></h4>
                    <p className="text-sm text-amber-600">
                      O invoice de 50% (${depositAmount}) foi gerado. Aguardando confirmação do pagamento para liberar a criação do Job.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {canCreateJob && (
            <>
              <Separator />
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <h4 className="font-semibold text-success"><T k="literal.crm.pagamento_confirmado.5e4317cc" /></h4>
                      <p className="text-sm text-success">
                        <T k="literal.crm.o_deposito_foi_recebido_voce_pode_criar_o_jo.bc14305a" />
                      </p>
                    </div>
                  </div>
                  {onCreateJob && (
                    <Button 
                      onClick={() => onCreateJob(estimate)}
                      className="flex items-center gap-2 bg-success hover:bg-success/90"
                    >
                      <Briefcase className="w-4 h-4" />
                      <T k="leads.createJob" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {isApproved && !canCreateJob && !estimate.invoicePaid && (
            <>
              <Separator />
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <h4 className="font-semibold text-success">{t("estimate.leadApproved")}</h4>
                    <p className="text-sm text-success">
                      {t("estimate.leadApprovedDesc")} (${depositAmount})
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {isRejected && (
            <>
              <Separator />
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <h4 className="font-semibold text-destructive">{t("estimate.leadRejectedTitle")}</h4>
                    <p className="text-sm text-destructive/80">
                      {t("estimate.leadRejectedDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {canApprove && !isApproved && (
            <>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {t("estimate.reject")}
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isApproving}
                className="flex items-center gap-2 bg-success hover:bg-success/90"
              >
                {isApproving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <T k="literal.crm.aprovando.a3ddcc62" />
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <T k="literal.crm.approve_estimate.3fa5984c" />
                  </>
                )}
              </Button>
            </>
          )}
          {(!canApprove || isApproved) && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("estimate.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
