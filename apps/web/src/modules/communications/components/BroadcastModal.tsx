import { T } from "@/shared/components/i18n/T";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Search, Send, Users, UserCircle, X, Loader2 } from "lucide-react";
import { useStaff } from "@/hooks/useStaff";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import type { Customer } from "@/hooks/useCustomers";
import { toast } from "sonner";
import {
  removeBroadcastAttachments,
  sendCustomerBroadcast,
  sendTeamBroadcastMessage,
  uploadBroadcastAttachment,
} from "../services/broadcastService";

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
}

type RecipientTab = "customers" | "team";
type UploadedAttachment = {
  file: File;
  path: string;
  url: string;
  preview?: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-180);
}

export function BroadcastModal({ open, onOpenChange, customers }: BroadcastModalProps) {
  const [tab, setTab] = useState<RecipientTab>("customers");
  const [message, setMessage] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: staff = [] } = useStaff();
  const { data: company } = useCompanySettings();

  const availableCustomers = customers.filter((customer) => {
    const search = customerSearch.toLowerCase();
    return !!(customer.phone || customer.phone2)
      && (customer.name.toLowerCase().includes(search)
        || customer.email?.toLowerCase().includes(search)
        || customer.phone?.includes(customerSearch));
  });
  const availableStaff = staff.filter((member) => {
    const search = teamSearch.toLowerCase();
    return member.is_active && !!member.phone
      && (member.name.toLowerCase().includes(search) || member.email?.toLowerCase().includes(search));
  });

  const cleanupAttachments = async (items: UploadedAttachment[]) => {
    if (!items.length) return;
    try {
      await removeBroadcastAttachments(items.map((item) => item.path));
    } catch {
      // Cleanup is best-effort; previews still need to be released locally.
    }
    items.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview); });
  };

  const reset = () => {
    setMessage("");
    setCustomerSearch("");
    setTeamSearch("");
    setSelectedCustomers(new Set());
    setSelectedStaff(new Set());
    setAttachments([]);
    setTab("customers");
  };

  const close = async () => {
    if (sending || uploading) return;
    await cleanupAttachments(attachments);
    reset();
    onOpenChange(false);
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (!company?.id) {
      toast.error("Company context is unavailable");
      return;
    }

    setUploading(true);
    const uploaded: UploadedAttachment[] = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds the 10 MB limit`);
          continue;
        }
        const result = await uploadBroadcastAttachment(company.id, file, sanitizeFileName(file.name));
        uploaded.push({
          file,
          path: result.path,
          url: result.url,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        });
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch {
      await cleanupAttachments(uploaded);
      toast.error("Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (path: string) => {
    const target = attachments.find((item) => item.path === path);
    if (!target) return;
    try {
      await removeBroadcastAttachments([path]);
    } catch {
      toast.error("Failed to remove attachment");
      return;
    }
    if (target.preview) URL.revokeObjectURL(target.preview);
    setAttachments((current) => current.filter((item) => item.path !== path));
  };

  const toggle = (set: Set<string>, id: string, setter: (value: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const send = async () => {
    const total = selectedCustomers.size + selectedStaff.size;
    if (!total) return toast.error("Select at least one recipient");
    if (!message.trim() && !attachments.length) return toast.error("Enter a message or attach a file");
    if (!company?.id) return toast.error("Company context is unavailable");

    setSending(true);
    try {
      let sent = 0;
      let failed = 0;
      const attachmentUrls = attachments.map((item) => item.url);

      if (selectedCustomers.size) {
        const selected = customers.filter((customer) => selectedCustomers.has(customer.id));
        const result = await sendCustomerBroadcast(company.id, message.trim(), attachmentUrls, selected);
        sent += result.sent;
        failed += result.failed;
      }

      for (const member of availableStaff.filter((item) => selectedStaff.has(item.id))) {
        const success = await sendTeamBroadcastMessage(
          company.id,
          member.phone!,
          message.trim(),
          attachmentUrls[0] || undefined,
        );
        if (success) sent++; else failed++;
      }

      attachments.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview); });
      reset();
      onOpenChange(false);
      if (failed) toast.warning(`Broadcast completed: ${sent} sent, ${failed} failed`);
      else toast.success(`Broadcast sent to ${sent} recipients`);
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void close(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> <T k="literal.communications.broadcast_communication.9ce4f035" /></DialogTitle>
          <DialogDescription><T k="literal.communications.send_one_message_to_selected_customers_or_te.8673987a" /></DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as RecipientTab)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="customers"><Users className="mr-2 h-4 w-4" /><T k="crm.tabs.customers" /></TabsTrigger>
            <TabsTrigger value="team"><UserCircle className="mr-2 h-4 w-4" /><T k="settings.team" /></TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={tab === "customers" ? "Search customers..." : "Search team members..."}
              value={tab === "customers" ? customerSearch : teamSearch}
              onChange={(event) => tab === "customers" ? setCustomerSearch(event.target.value) : setTeamSearch(event.target.value)}
            />
          </div>

          <ScrollArea className="h-52 rounded-md border">
            <div className="p-2 space-y-1">
              {tab === "customers" ? availableCustomers.map((customer) => (
                <label key={customer.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted cursor-pointer">
                  <Checkbox checked={selectedCustomers.has(customer.id)} onCheckedChange={() => toggle(selectedCustomers, customer.id, setSelectedCustomers)} />
                  <span className="flex-1"><span className="font-medium">{customer.name}</span><span className="block text-xs text-muted-foreground">{customer.phone || customer.phone2}</span></span>
                  <Badge variant="outline">{customer.status || "Unknown"}</Badge>
                </label>
              )) : availableStaff.map((member) => (
                <label key={member.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted cursor-pointer">
                  <Checkbox checked={selectedStaff.has(member.id)} onCheckedChange={() => toggle(selectedStaff, member.id, setSelectedStaff)} />
                  <span className="flex-1"><span className="font-medium">{member.name}</span><span className="block text-xs text-muted-foreground">{member.phone}</span></span>
                  {member.team && <Badge variant="outline">Team {member.team}</Badge>}
                </label>
              ))}
            </div>
          </ScrollArea>

          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message..." className="min-h-28" />

          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => void handleFiles(event)} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
              Attach
            </Button>
            <span className="text-xs text-muted-foreground"><T k="literal.communications.maximum_10_mb_per_file.66a9808f" /></span>
          </div>

          {!!attachments.length && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((item) => (
                <div key={item.path} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                  <span className="max-w-48 truncate">{item.file.name}</span>
                  <button type="button" onClick={() => void removeAttachment(item.path)} aria-label={`Remove ${item.file.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => void close()} disabled={sending || uploading}><T k="common.cancel" /></Button>
          <Button onClick={() => void send()} disabled={sending || uploading}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send ({selectedCustomers.size + selectedStaff.size})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
