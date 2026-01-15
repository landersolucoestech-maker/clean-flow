import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Send, 
  Users, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  X,
  FileText,
  Image as ImageIcon,
  File,
  UserCircle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Customer } from "@/hooks/useCustomers";
import { useStaff } from "@/hooks/useStaff";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BroadcastMessage {
  id: string;
  message: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  customer_filter: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
}

interface AttachmentFile {
  file: File;
  preview?: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
}

type RecipientTab = "customers" | "team";

export function BroadcastModal({ open, onOpenChange, customers }: BroadcastModalProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [recipientTab, setRecipientTab] = useState<RecipientTab>("customers");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: staff = [] } = useStaff();
  const { data: companySettings } = useCompanySettings();

  // Filter staff with phone numbers
  const staffWithPhone = staff.filter((s) => s.phone && s.is_active);
  const filteredStaff = staffWithPhone.filter((s) =>
    s.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  // Filter customers based on status and search
  const filteredCustomers = customers.filter((customer) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.status?.toLowerCase() === "active") ||
      (statusFilter === "inactive" && customer.status?.toLowerCase() === "inactive");

    const matchesSearch =
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase());

    // Only include customers with phone numbers
    const hasPhone = customer.phone || customer.phone2;

    return matchesStatus && matchesSearch && hasPhone;
  });

  const handleSelectAll = () => {
    if (recipientTab === "customers") {
      if (selectedCustomers.size === filteredCustomers.length) {
        setSelectedCustomers(new Set());
      } else {
        setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)));
      }
    } else {
      if (selectedTeamMembers.size === filteredStaff.length) {
        setSelectedTeamMembers(new Set());
      } else {
        setSelectedTeamMembers(new Set(filteredStaff.map((s) => s.id)));
      }
    }
  };

  const handleToggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleToggleTeamMember = (staffId: string) => {
    const newSelected = new Set(selectedTeamMembers);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedTeamMembers(newSelected);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentFile[] = [];

    for (const file of Array.from(files)) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max 10MB allowed.`);
        continue;
      }

      const attachment: AttachmentFile = {
        file,
        uploading: true,
      };

      // Create preview for images
      if (file.type.startsWith("image/")) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Upload files
      for (const attachment of newAttachments) {
        try {
          const originalName = attachment.file.name;
          const sanitizedName = originalName
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/_+/g, "_");

          const fileName = `${Date.now()}_${sanitizedName}`;
          const filePath = `broadcasts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("broadcast-attachments")
          .upload(filePath, attachment.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("broadcast-attachments")
          .getPublicUrl(filePath);

        setAttachments((prev) =>
          prev.map((a) =>
            a.file === attachment.file
              ? { ...a, uploading: false, url: urlData.publicUrl }
              : a
          )
        );
      } catch (error) {
        console.error("Upload error:", error);
        setAttachments((prev) =>
          prev.map((a) =>
            a.file === attachment.file
              ? { ...a, uploading: false, error: "Upload failed" }
              : a
          )
        );
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (file.type === "application/pdf") {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const handleSendBroadcast = async () => {
    if (!message.trim() && attachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }

    const totalRecipients = selectedCustomers.size + selectedTeamMembers.size;
    if (totalRecipients === 0) {
      toast.error(t("communications.broadcast.noRecipients") || "Please select at least one recipient");
      return;
    }

    // Check if all attachments are uploaded
    const pendingUploads = attachments.filter((a) => a.uploading);
    if (pendingUploads.length > 0) {
      toast.error("Please wait for all files to finish uploading");
      return;
    }

    const failedUploads = attachments.filter((a) => a.error);
    if (failedUploads.length > 0) {
      toast.error("Some files failed to upload. Please remove them and try again.");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const attachmentUrls = attachments.map((a) => a.url).filter(Boolean);
      let successCount = 0;
      let failedCount = 0;

      // Send to customers if any selected
      if (selectedCustomers.size > 0) {
        // Create broadcast record using raw query to bypass type checking for new tables
        const { data: broadcast, error: broadcastError } = await supabase
          .from("broadcast_messages" as never)
          .insert({
            message: message.trim(),
            status: "sending",
            total_recipients: selectedCustomers.size,
            customer_filter: { status: statusFilter },
            attachment_urls: attachmentUrls,
          } as never)
          .select()
          .single();

        if (broadcastError) throw broadcastError;

        const broadcastData = broadcast as unknown as BroadcastMessage;

        // Create recipient records
        const selectedCustomersList = customers.filter((c) => selectedCustomers.has(c.id));
        const recipients = selectedCustomersList.map((customer) => ({
          broadcast_id: broadcastData.id,
          customer_id: customer.id,
          phone: customer.phone || customer.phone2,
          status: "pending",
        }));

        const { error: recipientsError } = await supabase
          .from("broadcast_recipients" as never)
          .insert(recipients as never);

        if (recipientsError) throw recipientsError;

        // Call RingCentral edge function to send messages
        const { data: sendResultData, error: sendError } = await supabase.functions.invoke(
          "ringcentral-broadcast",
          {
            body: { broadcast_id: broadcastData.id },
          }
        );

        if (sendError) {
          // Update broadcast status to failed
          await supabase
            .from("broadcast_messages" as never)
            .update({ status: "failed" } as never)
            .eq("id", broadcastData.id);
          throw sendError;
        }

        successCount += sendResultData?.sent_count || selectedCustomers.size;
        failedCount += sendResultData?.failed_count || 0;
      }

      // Send to team members if any selected
      if (selectedTeamMembers.size > 0) {
        const selectedStaffList = staffWithPhone.filter((s) => selectedTeamMembers.has(s.id));
        
        for (const member of selectedStaffList) {
          try {
            const { error } = await supabase.functions.invoke("ringcentral-send-message", {
              body: {
                company_id: companySettings?.id,
                to_phone: member.phone,
                message: message.trim(),
                attachment_url: attachmentUrls.length > 0 ? attachmentUrls[0] : undefined,
              },
            });

            if (error) {
              console.error(`Failed to send to ${member.name}:`, error);
              failedCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to send to ${member.name}:`, err);
            failedCount++;
          }
        }
      }

      setSendResult({
        success: successCount,
        failed: failedCount,
      });

      toast.success(
        t("communications.broadcast.sent") || `Broadcast sent to ${totalRecipients} recipients`
      );

      // Reset form
      setMessage("");
      setSelectedCustomers(new Set());
      setSelectedTeamMembers(new Set());
      setAttachments([]);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error(t("communications.broadcast.error") || "Failed to send broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setMessage("");
      setSelectedCustomers(new Set());
      setSelectedTeamMembers(new Set());
      setStatusFilter("all");
      setCustomerSearch("");
      setTeamSearch("");
      setRecipientTab("customers");
      setSendResult(null);
      // Cleanup attachment previews
      attachments.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setAttachments([]);
      onOpenChange(false);
    }
  };

  const totalSelected = selectedCustomers.size + selectedTeamMembers.size;
  const currentListLength = recipientTab === "customers" ? filteredCustomers.length : filteredStaff.length;
  const currentSelectedSize = recipientTab === "customers" ? selectedCustomers.size : selectedTeamMembers.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Broadcast Communication
          </DialogTitle>
          <DialogDescription>
            Send a message to multiple customers or team members at once
          </DialogDescription>
        </DialogHeader>

        {sendResult ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <h3 className="text-xl font-semibold">
              Broadcast Communication Completed
            </h3>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{sendResult.success}</p>
                <p className="text-sm text-muted-foreground">
                  Communication Broadcast Sent
                </p>
              </div>
              {sendResult.failed > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{sendResult.failed}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("communications.broadcast.failed") || "Failed"}
                  </p>
                </div>
              )}
            </div>
            <Button onClick={handleClose} className="mt-4">
              {t("common.close") || "Close"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Message Input */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your broadcast message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attachments</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Add File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/30">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="relative flex items-center gap-2 p-2 bg-background rounded-md border"
                      >
                        {attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt={attachment.file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                            {getFileIcon(attachment.file)}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 max-w-[120px]">
                          <span className="text-xs font-medium truncate">
                            {attachment.file.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(attachment.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        {attachment.uploading && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {attachment.error && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        {attachment.url && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipient Type Tabs */}
              <div>
                <Label className="mb-2 block">Recipients</Label>
                <Tabs value={recipientTab} onValueChange={(v) => setRecipientTab(v as RecipientTab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="customers" className="flex-1">
                      <Users className="w-4 h-4 mr-2" />
                      Customers {selectedCustomers.size > 0 && `(${selectedCustomers.size})`}
                    </TabsTrigger>
                    <TabsTrigger value="team" className="flex-1">
                      <UserCircle className="w-4 h-4 mr-2" />
                      Team {selectedTeamMembers.size > 0 && `(${selectedTeamMembers.size})`}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {recipientTab === "customers" ? (
                <>
                  {/* Customer Filters */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="mb-2 block">Customer Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          <SelectItem value="active">Active Only</SelectItem>
                          <SelectItem value="inactive">Inactive Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="mb-2 block">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Selection */}
                  <div className="flex-1 flex flex-col overflow-hidden border rounded-lg">
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            filteredCustomers.length > 0 &&
                            selectedCustomers.size === filteredCustomers.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </div>
                      <Badge variant="secondary">
                        {selectedCustomers.size} / {filteredCustomers.length} selected
                      </Badge>
                    </div>

                    <ScrollArea className="flex-1 max-h-[180px]">
                      {filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            No customers with phone numbers found
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedCustomers.has(customer.id)
                                  ? "bg-primary/10"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => handleToggleCustomer(customer.id)}
                            >
                              <Checkbox
                                checked={selectedCustomers.has(customer.id)}
                                onCheckedChange={() => handleToggleCustomer(customer.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{customer.name}</span>
                                  <Badge
                                    variant={
                                      customer.status?.toLowerCase() === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {customer.status || "Unknown"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {customer.phone || customer.phone2}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </>
              ) : (
                <>
                  {/* Team Search */}
                  <div>
                    <Label className="mb-2 block">Search Team Members</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search team members..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Team Selection */}
                  <div className="flex-1 flex flex-col overflow-hidden border rounded-lg">
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            filteredStaff.length > 0 &&
                            selectedTeamMembers.size === filteredStaff.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </div>
                      <Badge variant="secondary">
                        {selectedTeamMembers.size} / {filteredStaff.length} selected
                      </Badge>
                    </div>

                    <ScrollArea className="flex-1 max-h-[180px]">
                      {filteredStaff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <UserCircle className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            No team members with phone numbers found
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {filteredStaff.map((member) => (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedTeamMembers.has(member.id)
                                  ? "bg-primary/10"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => handleToggleTeamMember(member.id)}
                            >
                              <Checkbox
                                checked={selectedTeamMembers.has(member.id)}
                                onCheckedChange={() => handleToggleTeamMember(member.id)}
                              />
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserCircle className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{member.name}</span>
                                  {member.team && (
                                    <Badge variant="outline" className="text-xs">
                                      Team {member.team}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {member.phone}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                {t("common.cancel") || "Cancel"}
              </Button>
              <Button
                onClick={handleSendBroadcast}
                disabled={isSending || totalSelected === 0 || (!message.trim() && attachments.length === 0)}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Broadcast ({totalSelected})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
