import { T } from "@/shared/components/i18n/T";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CONTACT_STATUSES,
  CONTACT_TYPES,
  EMPTY_CONTACT_DRAFT,
  type Contact,
  type ContactDraft,
  type ContactStatus,
  type ContactType,
} from "../types/contact";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSubmit: (draft: ContactDraft) => void;
}

function toDraft(contact?: Contact | null): ContactDraft {
  if (!contact) return { ...EMPTY_CONTACT_DRAFT };
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = contact;
  return draft;
}

export function ContactFormDialog({ open, onOpenChange, contact, onSubmit }: ContactFormDialogProps) {
  const [form, setForm] = useState<ContactDraft>(() => toDraft(contact));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(toDraft(contact));
  }, [contact, open]);

  const setField = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      onSubmit({
        ...form,
        name,
        company: form.company.trim(),
        email,
        phone: form.phone.trim(),
        website: form.website.trim(),
        jobTitle: form.jobTitle.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Create Contact"}</DialogTitle>
          <DialogDescription>
            <T k="literal.crm.manage_a_supplier_partner_service_provider_o.4fedc713" />
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input id="contact-name" value={form.name} onChange={(event) => setField("name", event.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-company"><T k="settings.company" /></Label>
              <Input id="contact-company" value={form.company} onChange={(event) => setField("company", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label><T k="literal.crm.contact_type.fcbedcab" /></Label>
              <Select value={form.contactType} onValueChange={(value) => setField("contactType", value as ContactType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label><T k="common.status" /></Label>
              <Select value={form.status} onValueChange={(value) => setField("status", value as ContactStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email"><T k="common.email" /></Label>
              <Input id="contact-email" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone"><T k="common.phone" /></Label>
              <Input id="contact-phone" value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-website"><T k="source.website" /></Label>
              <Input id="contact-website" value={form.website} onChange={(event) => setField("website", event.target.value)} placeholder="https://" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role"><T k="literal.crm.job_title_role.94997e4c" /></Label>
              <Input id="contact-role" value={form.jobTitle} onChange={(event) => setField("jobTitle", event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-address"><T k="common.address" /></Label>
            <Input id="contact-address" value={form.address} onChange={(event) => setField("address", event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-notes"><T k="modal.notes" /></Label>
            <Textarea id="contact-notes" rows={4} value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><T k="common.cancel" /></Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contact ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
