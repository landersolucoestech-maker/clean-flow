import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, Calendar, Briefcase, CreditCard, Clock, FileText, MessageSquare, FileCheck, Send, ChevronDown, Receipt, CheckCircle, Download, Eye, PenLine, Loader2, FileX, Users, StickyNote, DollarSign, AlertCircle, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer } from "@/hooks/useCustomers";
import { useJobsByCustomer } from "@/hooks/useJobs";
import { useInvoicesByCustomer } from "@/hooks/useInvoices";
import { useCustomerTerms } from "@/hooks/useCustomerTerms";
import { useCustomerRelationships } from "@/hooks/useCustomerRelationships";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  sender: "customer" | "business";
  message: string;
  timestamp: string;
}

interface AdditionalNote {
  id: string;
  text: string;
  author: string;
}

interface CustomerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

// Helper to format date
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Helper to get status badge color
const getStatusBadgeClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-success/10 text-success hover:bg-success/15";
    case "scheduled":
      return "bg-primary-light text-primary hover:bg-primary/15";
    case "in-progress":
    case "on-the-way":
      return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive hover:bg-destructive/15";
    case "paid":
      return "bg-success/10 text-success hover:bg-success/15";
    case "sent":
      return "bg-primary-light text-primary hover:bg-primary/15";
    case "draft":
    case "open":
      return "bg-warning/10 text-warning-foreground hover:bg-warning/15";
    case "overdue":
      return "bg-destructive/10 text-destructive hover:bg-destructive/15";
    case "pending payment":
      return "bg-warning/10 text-warning-foreground hover:bg-warning/15";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function CustomerDetailsModal({
  open,
  onOpenChange,
  customer
}: CustomerDetailsModalProps) {
  // Fetch real jobs, invoices, terms and relationships for this customer
  const { data: customerJobs = [], isLoading: isLoadingJobs } = useJobsByCustomer(customer?.id || null);
  const { data: customerInvoices = [], isLoading: isLoadingInvoices } = useInvoicesByCustomer(customer?.id || null);
  const { data: customerTerms = [], isLoading: isLoadingTerms } = useCustomerTerms(customer?.id || null);
  const { data: customerRelationships = [], isLoading: isLoadingRelationships } = useCustomerRelationships(customer?.id || null);

  // Calculate last service date from completed jobs
  const lastCompletedJob = customerJobs
    .filter(job => job.status.toLowerCase() === 'completed')
    .sort((a, b) => {
      const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return dateB - dateA;
    })[0];
  
  const lastServiceDate = lastCompletedJob?.scheduled_date || customer?.last_service;

  // Calculate total revenue from paid invoices
  const totalRevenue = customerInvoices
    .filter(inv => inv.status.toLowerCase() === 'paid')
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  // Parse inactive info from additional_info
  const parseInactiveInfo = () => {
    if (customer?.status !== "Inactive" || !customer?.additional_info) return null;
    
    const info = customer.additional_info;
    const dateMatch = info.match(/Inactive since: ([^|]+)/);
    const reasonMatch = info.match(/Reason: (.+)/);
    
    return {
      date: dateMatch ? dateMatch[1].trim() : null,
      reason: reasonMatch ? reasonMatch[1].trim() : null,
    };
  };

  const inactiveInfo = parseInactiveInfo();

  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [additionalNotesExpanded, setAdditionalNotesExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);

  // Find active relationship (no end_date)
  const activeRelationship = customerRelationships.find(r => !r.end_date);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const newMsg: ChatMessage = {
      id: chatMessages.length + 1,
      sender: "business",
      message: newMessage,
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    };
    
    setChatMessages([...chatMessages, newMsg]);
    setNewMessage("");
  };


  if (!customer) return null;

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <DialogTitle className="text-xl">{customer.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                  {customer.status}
                </Badge>
                {inactiveInfo?.date && (
                  <span className="text-xs text-muted-foreground">
                    since {formatDate(inactiveInfo.date)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-8 h-auto">
            <TabsTrigger value="overview" className="text-xs px-1 py-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs px-1 py-2">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs px-1 py-2">
              Contact
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs px-1 py-2">
              Addresses
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs px-1 py-2">
              Jobs
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs px-1 py-2">
              Invoices
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs px-1 py-2">
              Chat
            </TabsTrigger>
            <TabsTrigger value="contract" className="text-xs px-1 py-2">
              Contract
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs">Email</span>
                </div>
                <p className="text-sm font-medium">{customer.email || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs">Phone 1</span>
                </div>
                <p className="text-sm font-medium">{customer.phone || "-"}</p>
              </div>
              {customer.phone2 && (
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs">Phone 2</span>
                  </div>
                  <p className="text-sm font-medium">{customer.phone2}</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Customer Since</span>
                </div>
                <p className="text-sm font-medium">{customer.customer_since || "-"}</p>
              </div>
            </div>

            {/* Service Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Last Service</span>
                </div>
                <p className="text-sm font-medium">{formatDate(lastServiceDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs">Total Jobs</span>
                </div>
                <p className="text-sm font-medium">{customerJobs.length || customer.total_jobs || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Revenue</span>
                </div>
                <p className="text-sm font-medium text-success">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment & Source */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Payment Method</span>
                </div>
                <p className="text-sm font-medium capitalize">{customer.payment_method || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-xs">Source</span>
                </div>
                <p className="text-sm font-medium capitalize">{customer.source || "-"}</p>
              </div>
            </div>

            {/* Referral Name - show only if source is Referral */}
            {customer.source?.toLowerCase() === 'referral' && customer.additional_info && (
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Referred By</span>
                </div>
                <p className="text-sm font-medium">{customer.additional_info}</p>
              </div>
            )}

            {/* Primary Address */}
            {customer.address && (
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Primary Address</span>
                </div>
                <p className="text-sm font-medium">{customer.address}</p>
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setNotesExpanded((v) => !v)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${notesExpanded ? "" : "-rotate-90"}`} />
                  </Button>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Notes</span>
                </div>
                {notesExpanded && (
                  <div className="ml-8">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info */}
            {customer.additional_info && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setAdditionalNotesExpanded((v) => !v)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${additionalNotesExpanded ? "" : "-rotate-90"}`} />
                  </Button>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Additional Info</span>
                </div>
                {additionalNotesExpanded && (
                  <div className="ml-8">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{customer.additional_info}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab - Customer Relationship History */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Relationship History</h3>
            </div>

            {/* Inactive Status Alert */}
            {customer.status === "Inactive" && inactiveInfo && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Customer Inactive</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Inactive Since</p>
                    <p className="text-sm font-medium">{inactiveInfo.date ? formatDate(inactiveInfo.date) : "-"}</p>
                  </div>
                  {inactiveInfo.reason && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p className="text-sm font-medium">{inactiveInfo.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Relationship Timeline */}
            {isLoadingRelationships ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : customerRelationships.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No relationship history found</p>
                <p className="text-xs text-muted-foreground mt-1">History will appear when customer status changes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerRelationships.map((rel, index) => (
                  <div 
                    key={rel.id} 
                    className={cn(
                      "p-4 rounded-lg border",
                      !rel.end_date 
                        ? "border-success/30 bg-success/5" 
                        : "border-border/50 bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          !rel.end_date 
                            ? "bg-success/15 text-success" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {customerRelationships.length - index}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {formatDate(rel.start_date)} — {rel.end_date ? formatDate(rel.end_date) : "Present"}
                            </p>
                            {!rel.end_date && (
                              <Badge className="bg-success/10 text-success text-xs">Active</Badge>
                            )}
                          </div>
                          {rel.end_reason && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Reason:</span> {rel.end_reason}
                            </p>
                          )}
                          {rel.notes && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Notes:</span> {rel.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </TabsContent>

          {/* Contact Information Tab */}
          <TabsContent value="contact" className="space-y-3 mt-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone 1</p>
                <p className="text-sm font-medium">{customer.phone}</p>
              </div>
            </div>
            {customer.phone2 && <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone 2</p>
                  <p className="text-sm font-medium">{customer.phone2}</p>
                </div>
              </div>}
            {customer.customer_since && <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Customer Since</p>
                  <p className="text-sm font-medium">{customer.customer_since}</p>
                </div>
              </div>}
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            {customer.addresses && customer.addresses.length > 0 ? customer.addresses.map((addr, index) => {
              // Map frequency and preferred day values to readable labels
              // Map frequency values using centralized enums
              const frequencyLabels: Record<string, string> = {
                // New standardized values
                "Daily": "Daily",
                "Weekly": "Weekly",
                "Regular Cleaning 2 Weeks": "Regular Cleaning 2 Weeks",
                "Regular Cleaning 3 Weeks": "Regular Cleaning 3 Weeks",
                "Regular Cleaning 4 Weeks": "Regular Cleaning 4 Weeks",
                // "Once a Month" removed - mapped to "Regular Cleaning 4 Weeks"
                "One-Time": "One-Time",
                // Legacy values for backwards compatibility
                "one-time": "One-Time",
                "daily": "Daily",
                "weekly": "Weekly",
                "every-2-weeks": "Regular Cleaning 2 Weeks",
                "every-3-weeks": "Regular Cleaning 3 Weeks",
                "every-4-weeks": "Regular Cleaning 4 Weeks",
                "every-other-day": "Every Other Day",
                "every-5-weeks": "Every 5 Weeks",
                "every-6-weeks": "Every 6 Weeks",
                "every-7-weeks": "Every 7 Weeks",
                "every-8-weeks": "Every 8 Weeks",
                "first-of-month": "First of Month",
                "second-of-month": "Second of Month",
                "third-of-month": "Third of Month",
                "fourth-of-month": "Fourth of Month",
                "last-of-month": "Last of Month",
              };

              const dayLabels: Record<string, string> = {
                "monday": "Monday",
                "tuesday": "Tuesday",
                "wednesday": "Wednesday",
                "thursday": "Thursday",
                "friday": "Friday",
                "saturday": "Saturday",
                "sunday": "Sunday",
              };

              // Build full address string
              const fullAddressParts = [
                addr.street,
                addr.complement,
                addr.city,
                addr.state,
                addr.postal_code
              ].filter(Boolean);
              const fullAddress = fullAddressParts.length > 0 ? fullAddressParts.join(', ') : '-';

              return (
                <div key={index} className="p-4 rounded-lg bg-muted/30 space-y-4 border border-border/30">
                  {/* Address Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{addr.name || `Address ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground">Service Location</p>
                    </div>
                  </div>

                  {/* Full Address */}
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Full Address</p>
                    <p className="text-sm font-medium">{fullAddress}</p>
                  </div>

                  {/* Frequency and Preferred Day */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Frequency</p>
                      </div>
                      <p className="text-sm font-medium">{frequencyLabels[addr.frequency] || addr.frequency || "Not set"}</p>
                    </div>
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Preferred Day</p>
                      </div>
                      <p className="text-sm font-medium">{dayLabels[addr.preferred_day] || addr.preferred_day || "Not set"}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {addr.notes && (
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Notes</p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{addr.notes}</p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {addr.additional_notes && (
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Additional Notes</p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{addr.additional_notes}</p>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Primary Address</p>
                    <p className="text-xs text-muted-foreground">Service Location</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-background/50 col-span-3">
                    <p className="text-xs text-muted-foreground mb-1">Full Address</p>
                    <p className="text-sm font-medium">{customer.address || "-"}</p>
                  </div>
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">City</p>
                    <p className="text-sm font-medium">{customer.city || "-"}</p>
                  </div>
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">State</p>
                    <p className="text-sm font-medium">{customer.state || "-"}</p>
                  </div>
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1">Postal Code</p>
                    <p className="text-sm font-medium">{customer.zip_code || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Last Service</span>
                </div>
                <p className="text-sm font-medium">{formatDate(lastServiceDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs">Total Jobs</span>
                </div>
                <p className="text-sm font-medium">{customerJobs.length}</p>
              </div>
            </div>
            
            {isLoadingJobs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : customerJobs.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <Briefcase className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No jobs found for this customer</p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {customerJobs.map((job) => (
                  <div key={job.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{job.service_type || job.title || "Cleaning"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(job.scheduled_date)}</p>
                          {job.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {job.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getStatusBadgeClass(job.status)}>
                          {job.status === "in-progress" ? "In Progress" : 
                           job.status === "on-the-way" ? "On The Way" :
                           job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                        {job.amount && (
                          <span className="text-sm font-medium text-success">
                            ${Number(job.amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Job Details: Notes, Additional Notes, Feedback */}
                    <div className="space-y-2 ml-13">
                      {job.notes && (
                        <div className="flex items-start gap-2 p-2 rounded bg-muted/40">
                          <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Notes</p>
                            <p className="text-sm whitespace-pre-wrap break-words">{job.notes}</p>
                          </div>
                        </div>
                      )}
                      {job.additional_notes && (
                        <div className="flex items-start gap-2 p-2 rounded bg-muted/40">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Additional Notes</p>
                            <p className="text-sm whitespace-pre-wrap break-words">{job.additional_notes}</p>
                          </div>
                        </div>
                      )}
                      {job.feedback && (
                        <div className="flex items-start gap-2 p-2 rounded bg-muted/40">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Feedback</p>
                            <p className="text-sm whitespace-pre-wrap break-words">{job.feedback}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : customerInvoices.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <Receipt className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No invoices found for this customer</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.map((invoice) => {
                      // Find job title if job_id exists
                      const relatedJob = invoice.job_id 
                        ? customerJobs.find(j => j.id === invoice.job_id)
                        : null;
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            {invoice.job_id ? (
                              <span className="text-xs text-muted-foreground" title={invoice.job_id}>
                                {relatedJob?.title || invoice.job_id.slice(0, 8) + '...'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                          <TableCell>${invoice.total?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(invoice.status)}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Chat History Tab */}
          <TabsContent value="chat" className="mt-4">
            <div className="flex flex-col h-[350px]">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "business" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.sender === "business"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === "business" 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        }`}>
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                )}
              </div>
              
              {/* Message input */}
              <div className="flex gap-2 pt-3 border-t">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract" className="mt-4 space-y-4">
            {isLoadingTerms ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : customerTerms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <FileX className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No Terms Signed</p>
                <p className="text-xs text-muted-foreground">This customer hasn't signed any terms & conditions yet.</p>
              </div>
            ) : (
              customerTerms.map((term) => (
                <div key={term.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg">
                          <FileCheck className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{term.term_name}</h4>
                          <p className="text-xs text-muted-foreground">{term.term_description || "Service Agreement"}</p>
                        </div>
                      </div>
                      <Badge className="bg-success/10 text-success hover:bg-success/15">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* Signature Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Signed By</p>
                        <p className="text-sm font-medium">{term.signed_by}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Signed On</p>
                        <p className="text-sm font-medium">
                          {new Date(term.signed_at).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric", 
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {term.notes && (
                      <div className="p-4 rounded-lg bg-muted/20 border border-border">
                        <h5 className="text-sm font-medium mb-2">Notes</h5>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {term.notes}
                        </p>
                      </div>
                    )}

                    {/* Signature Display */}
                    {term.signature_text && (
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <p className="text-xs text-muted-foreground mb-2">Customer Signature</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 p-3 bg-background rounded border border-border">
                            <p className="font-signature text-xl italic text-foreground">{term.signature_text}</p>
                          </div>
                          <PenLine className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {term.document_url && (
                        <>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(term.document_url!, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Document
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <a href={term.document_url} download>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>;
}