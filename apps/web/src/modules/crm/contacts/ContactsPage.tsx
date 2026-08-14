import { useMemo, useState } from "react";
import { ContactRound, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";
import { CrmTabs } from "../components/CrmTabs";
import { ContactDetailsDialog } from "./components/ContactDetailsDialog";
import { ContactFormDialog } from "./components/ContactFormDialog";
import { useContacts } from "./hooks/useContacts";
import { CONTACT_STATUSES, CONTACT_TYPES, type Contact, type ContactDraft } from "./types/contact";

const PAGE_SIZE = 10;

export function Contacts() {
  const { contacts, isLoading, error, createContact, updateContact, deleteContact } = useContacts();
  const { canCreate, canEdit, canDelete } = usePermission();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const filteredContacts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesSearch = !normalized || [contact.name, contact.company, contact.email, contact.phone, contact.jobTitle]
        .some((value) => value.toLowerCase().includes(normalized));
      const matchesType = typeFilter === "all" || contact.contactType === typeFilter;
      const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contacts, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageContacts = filteredContacts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setDetailsOpen(false);
    setEditingContact(contact);
    setFormOpen(true);
  };

  const openDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const handleSubmit = (draft: ContactDraft) => {
    if (editingContact) updateContact(editingContact.id, draft);
    else createContact(draft);
    setEditingContact(null);
  };

  const applySearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <CrmTabs />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contacts</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage suppliers, partners, service providers and other corporate contacts.</p>
          </div>
          {canCreate("customers") && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Contact
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => applySearch(event.target.value)} placeholder="Search contacts..." className="pl-9" />
              </div>
              <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Contact Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contact Types</SelectItem>
                  {CONTACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {CONTACT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4">
              <p className="font-medium text-destructive">Unable to load contacts</p>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
              </div>
            ) : pageContacts.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="rounded-full bg-muted p-4"><ContactRound className="h-7 w-7 text-muted-foreground" /></div>
                <h2 className="mt-4 text-lg font-semibold">No contacts found</h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {contacts.length === 0 ? "Create the first corporate contact for this CRM." : "Adjust the search or filters to find a contact."}
                </p>
                {contacts.length === 0 && canCreate("customers") && <Button className="mt-5" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Contact</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-14"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <button type="button" className="text-left font-medium text-foreground hover:underline" onClick={() => openDetails(contact)}>{contact.name}</button>
                          {contact.jobTitle && <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>}
                        </TableCell>
                        <TableCell>{contact.company || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell><Badge variant="secondary">{contact.contactType}</Badge></TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-sm">
                            {contact.email && <p>{contact.email}</p>}
                            {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
                            {!contact.email && !contact.phone && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={contact.status === "Active" ? "default" : "outline"}>{contact.status}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetails(contact)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                              {canEdit("customers") && <DropdownMenuItem onClick={() => openEdit(contact)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
                              {canDelete("customers") && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(contact)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {!isLoading && filteredContacts.length > 0 && (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredContacts.length)} of {filteredContacts.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <span>Page {safePage} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} contact={editingContact} onSubmit={handleSubmit} />
      <ContactDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} contact={selectedContact} onEdit={openEdit} />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>This will remove {deleteTarget?.name} from Contacts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteContact(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
