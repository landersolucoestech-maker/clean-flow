import { T } from "@/shared/components/i18n/T";
import { Building2, Globe, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Contact } from "../types/contact";

interface ContactDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
  canEdit?: boolean;
}

export function ContactDetailsDialog({ open, onOpenChange, contact, onEdit, canEdit = false }: ContactDetailsDialogProps) {
  if (!contact) return null;

  const rows = [
    { icon: Building2, label: "Company", value: contact.company },
    { icon: UserRound, label: "Job Title / Role", value: contact.jobTitle },
    { icon: Mail, label: "Email", value: contact.email },
    { icon: Phone, label: "Phone", value: contact.phone },
    { icon: Globe, label: "Website", value: contact.website },
    { icon: MapPin, label: "Address", value: contact.address },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{contact.name}</DialogTitle>
            <Badge variant="secondary">{contact.contactType}</Badge>
            <Badge variant={contact.status === "Active" ? "default" : "outline"}>{contact.status}</Badge>
          </div>
          <DialogDescription><T k="literal.crm.corporate_contact_details.796120f0" /></DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.filter((row) => row.value).map((row) => (
            <div key={row.label} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
              <row.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
                <p className="break-words text-sm text-foreground">{row.value}</p>
              </div>
            </div>
          ))}

          {contact.notes && (
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground"><T k="modal.notes" /></p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{contact.notes}</p>
            </div>
          )}

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Created: {new Date(contact.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(contact.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><T k="common.close" /></Button>
          {canEdit && <Button onClick={() => onEdit(contact)}><T k="literal.crm.edit_contact.454e7ded" /></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
