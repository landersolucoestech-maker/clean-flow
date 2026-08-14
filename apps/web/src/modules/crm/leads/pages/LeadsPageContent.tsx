import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  MoreHorizontal,
  Loader2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateLeadModal } from "@/components/leads/CreateLeadModal";
import { EditLeadModal } from "@/components/leads/EditLeadModal";
import { LeadDetailsModal, Interaction } from "@/components/leads/LeadDetailsModal";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { InvoiceModal } from "@/components/schedule/InvoiceModal";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";
import { toast } from "sonner";
import { useLeads, useUpdateLead, useDeleteLead, LEAD_STATUSES, LEAD_ORIGINS } from "@/hooks/useLeads";
import { useCreateJob } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";
import { useLanguage } from "@/contexts/useLanguage";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatDateByLanguage } from "@/hooks/useCompanyLanguage";

interface AddressData {
  id: string;
  addressName: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferenceDays: string;
  preferenceTime: string;
  frequency: string;
  serviceType: string;
  firstCleaningAmount: string;
  regularAmount: string;
  notes: string;
  additionalNotes: string;
}

interface Estimate {
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
  address: string;
  validUntil: string;
  origin?: string;
  referredBy?: string;
  hasJob?: boolean;
  interactions?: Interaction[];
  addresses?: AddressData[];
  visitDate?: string;
  estimateApproved?: boolean;
  invoicePaid?: boolean;
  preferredDays?: string[];
  preferredTime?: string;
  frequency?: string;
  serviceType?: string;
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
  serviceAreas?: string[];
  businessName?: string;
  tags?: string[];
  notes?: string;
  additionalNotes?: string;
  specialInstructions?: string;
}

const SERVICE_AREA_LABEL_TO_VALUE: Record<string, string> = {
  "Kitchen": "kitchen",
  "Bathroom": "bathroom",
  "Bedroom": "bedroom",
  "Living / Dining": "living_dining",
  "Laundry Room": "laundry_room",
};

const normalizeServiceAreas = (areas: string[] | null | undefined): string[] => {
  if (!areas) return [];
  return areas
    .map((a) => (a ?? "").trim())
    .filter(Boolean)
    .map((a) => SERVICE_AREA_LABEL_TO_VALUE[a] ?? a);
};

export function Leads() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [estimateForAppointment, setEstimateForAppointment] = useState<Estimate | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{ customer: string; address: string; service: string; amount: number } | null>(null);
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [approvedLeadForInvoice, setApprovedLeadForInvoice] = useState<Estimate | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [estimateToEdit, setEstimateToEdit] = useState<Estimate | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch data from database
  const { data: dbLeads = [], isLoading } = useLeads();
  const { data: customersFromDb = [] } = useCustomers();
  const updateLeadMutation = useUpdateLead();
  const deleteLeadMutation = useDeleteLead();
  const createJobMutation = useCreateJob();

  // Track previous invoice payment status to detect when deposit gets paid
  const prevInvoiceStatus = useRef<Map<string, { deposit: string; final: string }>>(new Map());
  const [pendingJobForLead, setPendingJobForLead] = useState<Estimate | null>(null);

  // Fetch invoices to determine payment status for each lead (using invoice_type)
  const { data: invoicesData = [] } = useQuery({
    queryKey: ["invoices-for-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, lead_id, status, notes, total, invoice_type, amount_paid")
        .not("lead_id", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  // Create a map of lead_id to invoice status using invoice_type field
  const leadInvoiceStatus = useMemo(() => {
    const statusMap = new Map<string, { 
      deposit: "pending" | "paid" | "none"; 
      final: "pending" | "paid" | "none";
      totalPaid: number;
      totalPending: number;
    }>();
    
    invoicesData.forEach((invoice) => {
      if (!invoice.lead_id) return;
      
      const current = statusMap.get(invoice.lead_id) || { 
        deposit: "none", 
        final: "none",
        totalPaid: 0,
        totalPending: 0,
      };
      
      const invoiceTotal = invoice.total || 0;
      const isPaid = invoice.status === "paid";
      
      // Use invoice_type field for proper categorization
      const invoiceType = invoice.invoice_type || "standard";
      
      if (invoiceType === "deposit") {
        current.deposit = isPaid ? "paid" : "pending";
        if (isPaid) current.totalPaid += invoiceTotal;
        else current.totalPending += invoiceTotal;
      } else if (invoiceType === "balance") {
        current.final = isPaid ? "paid" : "pending";
        if (isPaid) current.totalPaid += invoiceTotal;
        else current.totalPending += invoiceTotal;
      } else {
        // Fallback to notes-based detection for legacy invoices
        const isValorRestante = invoice.notes?.toLowerCase().includes("valor restante") || 
                                invoice.notes?.toLowerCase().includes("balance");
        const isDeposit = invoice.notes?.toLowerCase().includes("depósito") || 
                          invoice.notes?.toLowerCase().includes("deposit");
        
        if (isValorRestante) {
          current.final = isPaid ? "paid" : "pending";
        } else if (isDeposit) {
          current.deposit = isPaid ? "paid" : "pending";
        }
        
        if (isPaid) current.totalPaid += invoiceTotal;
        else current.totalPending += invoiceTotal;
      }
      
      statusMap.set(invoice.lead_id, current);
    });
    
    return statusMap;
  }, [invoicesData]);

  // Create a map of customer names to IDs for quick lookup
  const customersByName = useMemo(() => {
    const map = new Map<string, string>();
    customersFromDb.forEach(c => {
      if (c.name) map.set(c.name.toLowerCase(), c.id);
    });
    return map;
  }, [customersFromDb]);

  // Transform DB leads to local format
  const estimates: Estimate[] = useMemo(() => {
    return dbLeads.map(lead => {
      // Map lead_addresses to AddressData format
      const mappedAddresses: AddressData[] = (lead.lead_addresses || []).map((addr) => ({
        id: addr.id,
        addressName: addr.name || "",
        address: addr.address || "",
        street: addr.street || "",
        city: addr.city || "",
        state: addr.state || "",
        postalCode: addr.postal_code || "",
        preferenceDays: "",
        preferenceTime: "",
        frequency: "",
        serviceType: lead.service_type || lead.title || "",
        firstCleaningAmount: "",
        regularAmount: "",
        notes: addr.notes || "",
        additionalNotes: "",
      }));

      // Map lead_interactions to Interaction format
      const mappedInteractions: Interaction[] = (lead.lead_interactions || []).map(int => ({
        id: int.id,
        date: int.interaction_date ? new Date(int.interaction_date).toISOString().split("T")[0] : "",
        time: int.interaction_date ? new Date(int.interaction_date).toTimeString().slice(0, 5) : "",
        subject: int.interaction_type || "",
        attendedBy: int.created_by || "",
        notes: int.description || "",
      }));

      return {
        id: lead.estimate_number,
        customer: lead.customer?.name || "Unknown",
        email: lead.email || lead.customer?.email || undefined,
        phone: lead.phone || lead.customer?.phone || undefined,
        phoneNumber2: lead.phone2 || undefined,
        service: lead.title,
        amount: `$${Number(lead.total || 0).toFixed(2)}`,
        date: lead.created_at ? new Date(lead.created_at).toISOString().split("T")[0] : "",
        expiryDate: lead.valid_until || "",
        status: lead.status,
        address: lead.address || lead.customer?.address || "",
        validUntil: lead.valid_until || "30 days",
        origin: lead.origin || undefined,
        referredBy: lead.referral_name || undefined,
        hasJob: lead.has_job || false,
        interactions: mappedInteractions,
        addresses: mappedAddresses.length > 0 ? mappedAddresses : undefined,
        visitDate: lead.visit_date || undefined,
        estimateApproved: lead.estimate_approved || false,
        invoicePaid: lead.invoice_paid || false,
        preferredDays: lead.preferred_days || [],
        preferredTime: lead.preferred_time || undefined,
        frequency: lead.frequency || undefined,
        serviceType: lead.service_type || undefined,
        _dbId: lead.id,
        _customerId: lead.customer_id,
        // New property fields
        propertyType: lead.property_type || undefined,
        residenceType: lead.residence_type || undefined,
        squareFeet: lead.square_feet || undefined,
        bedrooms: lead.bedrooms || undefined,
        bathrooms: lead.bathrooms || undefined,
        hasPets: lead.has_pets || false,
        addOnServices: lead.add_on_services || [],
        serviceAreas: normalizeServiceAreas(lead.service_areas),
        businessName: lead.business_name || undefined,
        tags: lead.tags || [],
        notes: lead.notes || undefined,
        additionalNotes: lead.additional_notes || undefined,
        specialInstructions: lead.special_instructions || undefined,
      };
    });
  }, [dbLeads]);

  // Fetch existing jobs for these leads (don't rely on lead.has_job which can be stale)
  const leadDbIds = useMemo(() => {
    return estimates.map(e => e._dbId).filter(Boolean) as string[];
  }, [estimates]);

  const { data: jobsForLeads = [] } = useQuery({
    queryKey: ["jobs-for-leads", leadDbIds],
    queryFn: async () => {
      if (!leadDbIds.length) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select("id, lead_id")
        .in("lead_id", leadDbIds);
      if (error) throw error;
      return data || [];
    },
    enabled: leadDbIds.length > 0,
  });

  const jobsByLeadId = useMemo(() => {
    const set = new Set<string>();
    jobsForLeads.forEach((job) => {
      if (job?.lead_id) set.add(job.lead_id);
    });
    return set;
  }, [jobsForLeads]);

  // Helper to check if service is Deep Cleaning (moved up for use in effect)
  const isDeepCleaning = (serviceType: string | undefined): boolean => {
    if (!serviceType) return false;
    const normalizedService = serviceType.toLowerCase();
    return normalizedService.includes("deep") || 
           normalizedService.includes("primeira") || 
           normalizedService.includes("first") ||
           normalizedService.includes("inicial");
  };

  // Effect to detect when a deposit invoice gets marked as paid - auto open job creation modal
  useEffect(() => {
    if (prevInvoiceStatus.current.size === 0 && leadInvoiceStatus.size > 0) {
      // First load - just save state
      prevInvoiceStatus.current = new Map(
        Array.from(leadInvoiceStatus.entries()).map(([k, v]) => [k, { deposit: v.deposit, final: v.final }])
      );
      return;
    }

    // Check for any deposit that changed from non-paid to paid
    leadInvoiceStatus.forEach((status, leadId) => {
      const prev = prevInvoiceStatus.current.get(leadId);
      const wasDepositPaid = prev?.deposit === "paid";
      const isDepositPaid = status.deposit === "paid";

      // Deposit just got paid
      if (!wasDepositPaid && isDepositPaid) {
        // Find the estimate for this lead
        const estimate = estimates.find(e => e._dbId === leadId);
        if (estimate) {
          // Check if it's a Deep Cleaning lead (requiring deposit flow)
          const isDeep = isDeepCleaning(estimate.serviceType) || isDeepCleaning(estimate.service);
          if (isDeep && !jobsByLeadId.has(leadId)) {
            // Auto open job creation modal
            setPendingJobForLead(estimate);
            toast.success("Depósito confirmado! Crie o job agora.");
          }
        }
      }
    });

    // Update previous status
    prevInvoiceStatus.current = new Map(
      Array.from(leadInvoiceStatus.entries()).map(([k, v]) => [k, { deposit: v.deposit, final: v.final }])
    );
  }, [leadInvoiceStatus, estimates, jobsByLeadId]);

  // Open appointment modal when pending job is set
  useEffect(() => {
    if (pendingJobForLead && !appointmentModalOpen) {
      setEstimateForAppointment(pendingJobForLead);
      setAppointmentModalOpen(true);
      setPendingJobForLead(null);
    }
  }, [pendingJobForLead, appointmentModalOpen]);

  const handleViewDetails = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setDetailsModalOpen(true);
  };

  const handleEditEstimate = (estimate: Estimate) => {
    setEstimateToEdit(estimate);
    setEditModalOpen(true);
  };

  const handleSaveEstimate = async (updatedEstimate: Estimate) => {
    const dbId = updatedEstimate._dbId;
    if (!dbId) return;

    const parseMoney = (value: string): number => {
      const n = parseFloat(String(value || "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    try {
      await updateLeadMutation.mutateAsync({
        id: dbId,
        status: updatedEstimate.status,
        has_job: updatedEstimate.hasJob,
        title: updatedEstimate.service || "Lead",
        email: updatedEstimate.email || null,
        phone: updatedEstimate.phone || null,
        phone2: updatedEstimate.phoneNumber2 || null,
        origin: updatedEstimate.origin || null,
        address: updatedEstimate.address || null,
        valid_until: updatedEstimate.expiryDate || null,
        total: parseMoney(updatedEstimate.amount),
        subtotal: parseMoney(updatedEstimate.amount),
        referral_name: updatedEstimate.referredBy || null,
        frequency: updatedEstimate.frequency || null,
        service_areas:
          updatedEstimate.serviceAreas && updatedEstimate.serviceAreas.length > 0
            ? updatedEstimate.serviceAreas
            : null,
        // New property fields
        property_type: updatedEstimate.propertyType || null,
        residence_type: updatedEstimate.residenceType || null,
        square_feet: updatedEstimate.squareFeet || null,
        bedrooms: updatedEstimate.bedrooms || null,
        bathrooms: updatedEstimate.bathrooms || null,
        has_pets: updatedEstimate.hasPets || false,
        add_on_services: updatedEstimate.addOnServices || [],
        business_name: updatedEstimate.businessName || null,
        tags: updatedEstimate.tags || [],
        notes: updatedEstimate.notes || null,
        additional_notes: updatedEstimate.additionalNotes || null,
        special_instructions: updatedEstimate.specialInstructions || null,
        service_type: updatedEstimate.serviceType || null,
        preferred_days: updatedEstimate.preferredDays || [],
        preferred_time: updatedEstimate.preferredTime || null,
        visit_date: updatedEstimate.visitDate || null,
      });

      // Upsert lead_addresses (street/city/state/zip) based on the EditLeadModal form
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const formatFullAddress = (street: string, city?: string, state?: string, postalCode?: string) => {
        const s = (street || "").trim();
        const c = (city || "").trim();
        const st = (state || "").trim();
        const zip = (postalCode || "").trim();
        return `${s}${c ? `, ${c}` : ""}${st ? `, ${st}` : ""} ${zip}`.trim();
      };

      const uiAddresses = (updatedEstimate.addresses || [])
        .map((a) => {
          const street = (a.street || a.address || "").trim();
          if (!street) return null;

          const city = (a.city || "").trim();
          const state = (a.state || "").trim();
          const postalCode = (a.postalCode || "").trim();

          const row: TablesInsert<"lead_addresses"> & { id?: string } = {
            lead_id: dbId,
            name: (a.addressName || "").trim() || "Home",
            address: formatFullAddress(street, city, state, postalCode),
            street: street || null,
            city: city || null,
            state: state || null,
            postal_code: postalCode || null,
            notes: (a.notes || "").trim() || null,
          };

          if (a.id && uuidRegex.test(a.id)) row.id = a.id;
          return row;
        })
        .filter((row): row is TablesInsert<"lead_addresses"> & { id?: string } => row !== null);

      const { data: existingAddrRows, error: existingAddrErr } = await supabase
        .from("lead_addresses")
        .select("id")
        .eq("lead_id", dbId);

      if (existingAddrErr) throw existingAddrErr;

      const existingIds = (existingAddrRows || []).map((row) => row.id);
      const keepIds = uiAddresses.flatMap((row) => row.id ? [row.id] : []);
      const deleteIds = existingIds.filter((id: string) => !keepIds.includes(id));

      if (deleteIds.length > 0) {
        const { error: delErr } = await supabase
          .from("lead_addresses")
          .delete()
          .in("id", deleteIds);
        if (delErr) throw delErr;
      }

      const upsertRows = uiAddresses.filter((row) => row.id);
      const insertRows = uiAddresses.filter((row) => !row.id);

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("lead_addresses")
          .upsert(upsertRows, { onConflict: "id" });
        if (upsertErr) throw upsertErr;
      }

      if (insertRows.length > 0) {
        const { error: insertErr } = await supabase
          .from("lead_addresses")
          .insert(insertRows);
        if (insertErr) throw insertErr;
      }

      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (error) {
      console.error("Error saving estimate:", error);
      toast.error("Erro ao salvar alterações");
    }
  };

  const getStatusConfig = (status: string) => {
    const config = LEAD_STATUSES.find(s => s.value === status);
    return config || { value: status, label: status, color: "bg-muted-foreground" };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active_customer": return <CheckCircle className="w-4 h-4" />;
      case "disqualified": return <XCircle className="w-4 h-4" />;
      case "visit_scheduled": return <Calendar className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };


  const handleApprove = (id: string) => {
    const estimate = estimates.find(e => e.id === id);
    const dbId = estimate?._dbId;
    if (dbId && estimate) {
      updateLeadMutation.mutate({ 
        id: dbId, 
        status: "active_customer",
        estimate_approved: true,
        estimate_approved_at: new Date().toISOString(),
      }, {
        onSuccess: () => {
          toast.success("Lead aprovado!");
          // Only open 50% invoice modal for Deep Cleaning services
          if (isDeepCleaning(estimate.serviceType) || isDeepCleaning(estimate.service)) {
            setApprovedLeadForInvoice(estimate);
            setCreateInvoiceModalOpen(true);
          }
        }
      });
    }
  };

  const handleCreateJob = (estimate: Estimate) => {
    // Block job creation if estimate is not approved
    if (!estimate.estimateApproved) {
      toast.error("Este lead precisa ser aprovado antes de criar um job.");
      return;
    }
    
    // For Deep Cleaning services, check if deposit is paid
    const isDeep = isDeepCleaning(estimate.serviceType) || isDeepCleaning(estimate.service);
    if (isDeep) {
      const invoiceStatus = leadInvoiceStatus.get(estimate._dbId || "");
      const depositPaid = invoiceStatus?.deposit === "paid";
      
      if (!depositPaid) {
        toast.error("O invoice de depósito (50%) precisa ser pago antes de criar um job para Deep Cleaning.");
        return;
      }
    }
    
    setEstimateForAppointment(estimate);
    setDetailsModalOpen(false);
    setAppointmentModalOpen(true);
  };

  const handleJobCreated = (data: {
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
  }) => {
    let customerId = customersByName.get(data.customer.toLowerCase());
    
    if (!customerId && data.customer) {
      const customer = customersFromDb.find(c => 
        c.name?.toLowerCase() === data.customer.toLowerCase()
      );
      customerId = customer?.id;
    }
    
    if (!customerId) {
      toast.error("Cliente não encontrado. Selecione um cliente existente.");
      return;
    }

    const parseDuration = (dur: string): number | undefined => {
      if (!dur) return undefined;
      const match = dur.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : undefined;
    };

    createJobMutation.mutate({
      customer_id: customerId,
      title: data.serviceType || "Job",
      service_type: data.serviceType || undefined,
      scheduled_date: data.date || undefined,
      scheduled_time: data.time || undefined,
      staff_assigned: data.staffMembers,
      status: data.status || "scheduled",
      duration_text: data.duration || undefined,
      duration_minutes: parseDuration(data.duration),
      amount: data.amount,
      address: data.address || undefined,
      notes: data.notes || undefined,
      additional_notes: data.additionalNotes || undefined,
      isFromLead: true,
      lead_id: estimateForAppointment?._dbId || undefined,
    });

    if (estimateForAppointment) {
      const dbId = estimateForAppointment._dbId;
      
      if (dbId) {
        updateLeadMutation.mutate({ id: dbId, has_job: true });
      }
      
      // Note: Deposit invoice is created at approval time, not job creation
      // Balance invoice is created automatically when job is completed (via edge function)
      
      setEstimateForAppointment(null);
    }
  };

  const handleReject = (id: string) => {
    const estimate = estimates.find(e => e.id === id);
    const dbId = estimate?._dbId;
    if (dbId) {
      updateLeadMutation.mutate({ id: dbId, status: "disqualified" });
    }
    toast.info("Lead marcado como perdido");
  };

  const handleDelete = (id: string) => {
    const estimate = estimates.find(e => e.id === id);
    const dbId = estimate?._dbId;
    if (dbId) {
      deleteLeadMutation.mutate(dbId);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const estimate = estimates.find(e => e.id === id);
    const dbId = estimate?._dbId;
    if (dbId) {
      updateLeadMutation.mutate({ id: dbId, status: newStatus });
    }
  };

  const filteredEstimates = estimates.filter(est => {
    const matchesSearch = 
      est.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      est.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (est.phone || "").includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || est.status === statusFilter;
    const matchesOrigin = originFilter === "all" || est.origin === originFilter;
    
    // Date filter logic
    let matchesDate = true;
    if (est.date && (startDate || endDate)) {
      const estDate = new Date(est.date);
      estDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (estDate < start) matchesDate = false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (estDate > end) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesOrigin && matchesDate;
  });

  // Stats by status
  const statsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    LEAD_STATUSES.forEach(s => counts[s.value] = 0);
    estimates.forEach(e => {
      if (counts[e.status] !== undefined) counts[e.status]++;
      else counts[e.status] = 1;
    });
    return counts;
  }, [estimates]);

  const totalLeads = estimates.length;
  const activeCustomers = statsByStatus["active_customer"] || 0;
  const newLeads = statsByStatus["new_lead"] || 0;
  const visitScheduled = statsByStatus["visit_scheduled"] || 0;

  return (
    <PageLayout>
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("leads.title")}</h1>
              <p className="text-muted-foreground">
                {t("leads.subtitle")}
              </p>
            </div>
            <Button 
              variant="hero" 
              className="flex items-center gap-2"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>{t("leads.newLead")}</span>
            </Button>
          </div>


          {/* Pipeline Status Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {LEAD_STATUSES.map(status => (
              <Card 
                key={status.value}
                className={cn(
                  "cursor-pointer border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  statusFilter === status.value && "ring-2 ring-primary"
                )}
                onClick={() => setStatusFilter(statusFilter === status.value ? "all" : status.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground truncate">{t(`leads.status.${status.value}`) || status.label}</p>
                      <p className="text-xl font-bold">{statsByStatus[status.value] || 0}</p>
                    </div>
                    <div className={cn("h-3 w-3 rounded-full ring-4 ring-background", status.color)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1 lg:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("leads.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t("leads.origin")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leads.allOrigins")}</SelectItem>
                {LEAD_ORIGINS.map(origin => (
                  <SelectItem key={origin} value={origin}>{t(`leads.origin.${origin.toLowerCase().replace(/\s+/g, '_')}`) || origin}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("leads.allStatus")}</SelectItem>
                {LEAD_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>{t(`leads.status.${status.value}`) || status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              startPlaceholder={t("leads.startDate")}
              endPlaceholder={t("leads.endDate")}
              clearButtonLabel={t("leads.clearDates")}
            />
          </div>


          {/* Leads Table */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Primary Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          {t("leads.noLeadsFound")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEstimates.map((estimate) => {
                        const statusConfig = getStatusConfig(estimate.status);
                        return (
                          <TableRow key={estimate.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{estimate.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{estimate.customer}</p>
                                {estimate.phone && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3" />
                                    {estimate.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {estimate.email ? (
                                <p className="text-sm truncate max-w-[180px]">{estimate.email}</p>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {estimate.origin ? (
                                <Badge variant="outline" className="text-xs">
                                  {t(`leads.origin.${estimate.origin.toLowerCase().replace(/\s+/g, '_')}`) || estimate.origin}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={estimate.status} 
                                onValueChange={(value) => handleStatusChange(estimate.id, value)}
                              >
                                <SelectTrigger className="h-8 w-[160px]">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                                    <span className="text-xs">{t(`leads.status.${statusConfig.value}`) || statusConfig.label}</span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {LEAD_STATUSES.map(status => (
                                    <SelectItem key={status.value} value={status.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                                        {t(`leads.status.${status.value}`) || status.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const invoiceStatus = estimate._dbId ? leadInvoiceStatus.get(estimate._dbId) : null;
                                if (!invoiceStatus || (invoiceStatus.deposit === "none" && invoiceStatus.final === "none")) {
                                  return <span className="text-muted-foreground text-xs">-</span>;
                                }
                                
                                const bothPaid = invoiceStatus.deposit === "paid" && invoiceStatus.final === "paid";
                                const depositPaid = invoiceStatus.deposit === "paid";
                                const finalPending = invoiceStatus.final === "pending";
                                
                                if (bothPaid) {
                                  return (
                                    <Badge variant="outline" className="border-success/30 bg-success/10 text-xs text-success">
                                      100% Paid
                                    </Badge>
                                  );
                                }
                                
                                if (depositPaid && finalPending) {
                                  return (
                                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-xs text-warning-foreground">
                                      50% Paid
                                    </Badge>
                                  );
                                }
                                
                                if (depositPaid && invoiceStatus.final === "none") {
                                  return (
                                    <Badge variant="outline" className="border-primary/30 bg-primary-light text-xs text-primary-dark">
                                      Deposit Paid
                                    </Badge>
                                  );
                                }
                                
                                if (invoiceStatus.deposit === "pending") {
                                  return (
                                    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-xs text-warning-foreground">
                                      Deposit Pending
                                    </Badge>
                                  );
                                }
                                
                                return <span className="text-muted-foreground text-xs">-</span>;
                              })()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {estimate.date ? formatDateByLanguage(new Date(estimate.date), language) : "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {estimate.amount}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Lead actions">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(estimate)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    {t("common.viewDetails")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditEstimate(estimate)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateJob(estimate)}>
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {t("leads.createJob")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleApprove(estimate.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                    Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(estimate.id)}>
                                    <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                    Marcar como Perdido
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(estimate.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Modals */}
      <CreateLeadModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {editModalOpen && estimateToEdit && (
        <EditLeadModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          estimate={estimateToEdit}
          onSave={handleSaveEstimate}
        />
      )}

      {detailsModalOpen && selectedEstimate && (
        <LeadDetailsModal
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          estimate={selectedEstimate}
          onApprove={handleApprove}
          onReject={handleReject}
          onCreateJob={handleCreateJob}
        />
      )}

      {appointmentModalOpen && (
        <AppointmentModal
          open={appointmentModalOpen}
          onOpenChange={setAppointmentModalOpen}
          mode="create"
          prefilledData={estimateForAppointment ? {
            customer: estimateForAppointment.customer,
            address: estimateForAppointment.address,
            service: estimateForAppointment.service,
            serviceType: estimateForAppointment.serviceType || estimateForAppointment.service,
            amount: estimateForAppointment.amount.replace(/[^0-9.]/g, ""),
          } : undefined}
          onJobCreated={handleJobCreated}
        />
      )}

      {invoiceModalOpen && invoiceData && (
        <InvoiceModal
          open={invoiceModalOpen}
          onOpenChange={setInvoiceModalOpen}
          appointment={{
            id: "deposit",
            customer: invoiceData.customer,
            address: invoiceData.address,
            service: invoiceData.service,
            description: `Depósito 50% - ${invoiceData.service}`,
            time: "",
            amount: invoiceData.amount,
            duration: "",
          }}
        />
      )}

      <CreateInvoiceModal
        open={createInvoiceModalOpen}
        onOpenChange={(open) => {
          setCreateInvoiceModalOpen(open);
          if (!open) setApprovedLeadForInvoice(null);
        }}
        initialData={approvedLeadForInvoice ? {
          customerId: approvedLeadForInvoice._customerId,
          customerName: approvedLeadForInvoice.customer,
          customerEmail: approvedLeadForInvoice.email,
          description: `Depósito 50% - ${approvedLeadForInvoice.service}`,
          amount: parseFloat(approvedLeadForInvoice.amount.replace(/[^0-9.]/g, "")) * 0.5,
          notes: `Depósito 50% para ${approvedLeadForInvoice.service}`,
          leadId: approvedLeadForInvoice._dbId,
          invoiceType: 'deposit' as const,
        } : undefined}
      />
    </PageLayout>
  );
}
