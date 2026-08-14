import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, Calendar, Briefcase, CreditCard, Clock, FileText, MessageSquare, FileCheck, Send, ChevronDown, Receipt, CheckCircle, Download, Eye, PenLine, Loader2, FileX, Users, StickyNote, DollarSign, AlertCircle, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer } from "@/hooks/useCustomers";
import { CustomerDetailsHeader, CustomerDetailsTabsList } from "./CustomerDetailsChrome";
import { CustomerChatTab } from "./CustomerChatTab";
import { formatCustomerDate, getCustomerLastServiceDate, getCustomerStatusBadgeClass, getCustomerTotalRevenue, parseInactiveCustomerInfo } from "../utils/customerDetails";
import { useJobsByCustomer } from "@/hooks/useJobs";
import { useInvoicesByCustomer } from "@/hooks/useInvoices";
import { useCustomerTerms } from "@/hooks/useCustomerTerms";
import { useCustomerRelationships } from "@/hooks/useCustomerRelationships";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  const lastServiceDate = getCustomerLastServiceDate(customerJobs, customer?.last_service);
  const totalRevenue = getCustomerTotalRevenue(customerInvoices);
  const inactiveInfo = parseInactiveCustomerInfo(customer);

  const [additionalNotesExpanded, setAdditionalNotesExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);

  // Find active relationship (no end_date)
  const activeRelationship = customerRelationships.find(r => !r.end_date);

  if (!customer) return null;

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <CustomerDetailsHeader customer={customer} inactiveInfo={inactiveInfo} />
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <CustomerDetailsTabsList />

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs"><T k="common.email" /></span>
                </div>
                <p className="text-sm font-medium">{customer.email || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs"><T k="estimate.phone1" /></span>
                </div>
                <p className="text-sm font-medium">{customer.phone || "-"}</p>
              </div>
              {customer.phone2 && (
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs"><T k="estimate.phone2" /></span>
                  </div>
                  <p className="text-sm font-medium">{customer.phone2}</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs"><T k="modal.customerSince" /></span>
                </div>
                <p className="text-sm font-medium">{customer.customer_since || "-"}</p>
              </div>
            </div>

            {/* Service Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs"><T k="customers.lastService" /></span>
                </div>
                <p className="text-sm font-medium">{formatCustomerDate(lastServiceDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs"><T k="customers.totalJobs" /></span>
                </div>
                <p className="text-sm font-medium">{customerJobs.length || customer.total_jobs || 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs"><T k="jobs.revenue" /></span>
                </div>
                <p className="text-sm font-medium text-success">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment & Source */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs"><T k="modal.paymentMethod" /></span>
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
                  <span className="text-xs"><T k="leads.form.referredBy" /></span>
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
                  <span className="text-sm font-medium text-foreground"><T k="modal.notes" /></span>
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
                    <p className="text-sm font-medium">{inactiveInfo.date ? formatCustomerDate(inactiveInfo.date) : "-"}</p>
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
                              {formatCustomerDate(rel.start_date)} — {rel.end_date ? formatCustomerDate(rel.end_date) : "Present"}
                            </p>
                            {!rel.end_date && (
                              <Badge className="bg-success/10 text-success text-xs"><T k="common.active" /></Badge>
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
                <p className="text-xs text-muted-foreground"><T k="common.email" /></p>
                <p className="text-sm font-medium">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground"><T k="estimate.phone1" /></p>
                <p className="text-sm font-medium">{customer.phone}</p>
              </div>
            </div>
            {customer.phone2 && <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground"><T k="estimate.phone2" /></p>
                  <p className="text-sm font-medium">{customer.phone2}</p>
                </div>
              </div>}
            {customer.customer_since && <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground"><T k="modal.customerSince" /></p>
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
                        <p className="text-xs text-muted-foreground"><T k="estimate.frequency" /></p>
                      </div>
                      <p className="text-sm font-medium">{frequencyLabels[addr.frequency] || addr.frequency || "Not set"}</p>
                    </div>
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground"><T k="modal.preferredDay" /></p>
                      </div>
                      <p className="text-sm font-medium">{dayLabels[addr.preferred_day] || addr.preferred_day || "Not set"}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {addr.notes && (
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground"><T k="modal.notes" /></p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{addr.notes}</p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {addr.additional_notes && (
                    <div className="p-3 rounded-md bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground"><T k="modal.additionalNotes" /></p>
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
                    <p className="text-xs text-muted-foreground mb-1"><T k="modal.city" /></p>
                    <p className="text-sm font-medium">{customer.city || "-"}</p>
                  </div>
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1"><T k="modal.state" /></p>
                    <p className="text-sm font-medium">{customer.state || "-"}</p>
                  </div>
                  <div className="p-3 rounded-md bg-background/50">
                    <p className="text-xs text-muted-foreground mb-1"><T k="modal.postalCode" /></p>
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
                  <span className="text-xs"><T k="customers.lastService" /></span>
                </div>
                <p className="text-sm font-medium">{formatCustomerDate(lastServiceDate)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs"><T k="customers.totalJobs" /></span>
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
                          <p className="text-xs text-muted-foreground">{formatCustomerDate(job.scheduled_date)}</p>
                          {job.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {job.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getCustomerStatusBadgeClass(job.status)}>
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
                            <p className="text-xs font-medium text-muted-foreground"><T k="modal.notes" /></p>
                            <p className="text-sm whitespace-pre-wrap break-words">{job.notes}</p>
                          </div>
                        </div>
                      )}
                      {job.additional_notes && (
                        <div className="flex items-start gap-2 p-2 rounded bg-muted/40">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground"><T k="modal.additionalNotes" /></p>
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
                      <TableHead><T k="jobs.jobId" /></TableHead>
                      <TableHead><T k="common.date" /></TableHead>
                      <TableHead><T k="jobs.amount" /></TableHead>
                      <TableHead><T k="billing.dueDate" /></TableHead>
                      <TableHead><T k="common.status" /></TableHead>
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
                          <TableCell>{formatCustomerDate(invoice.issue_date)}</TableCell>
                          <TableCell>${invoice.total?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>{formatCustomerDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Badge className={getCustomerStatusBadgeClass(invoice.status)}>
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

          <CustomerChatTab />

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
                        <h5 className="text-sm font-medium mb-2"><T k="modal.notes" /></h5>
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