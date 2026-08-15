import { useState } from "react";
import { format } from "date-fns";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSupportTickets, SupportTicket, TicketStatus } from "@/hooks/useSupportTickets";
import { CreateTicketModal } from "@/components/support/CreateTicketModal";
import { TicketDetailsModal } from "@/components/support/TicketDetailsModal";
import { useLanguage } from "@/contexts/useLanguage";
import {
  Plus,
  Search,
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  BookOpen,
  MessageSquare,
  FileQuestion,
} from "lucide-react";

type StatusFilter = "all" | TicketStatus;

export function Support() {
  const { t } = useLanguage();
  const { tickets, isLoading } = useSupportTickets();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState("tickets");

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const waitingTickets = tickets.filter((t) => t.status === "waiting_customer");

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "open": return "bg-primary-light text-primary-dark";
      case "in_progress": return "bg-warning/10 text-warning-foreground";
      case "waiting_customer": return "bg-warning/15 text-warning-foreground";
      case "resolved": return "bg-success/10 text-success";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-muted text-muted-foreground";
      case "medium": return "bg-primary-light text-primary-dark";
      case "high": return "bg-warning/10 text-warning-foreground";
      case "urgent": return "bg-destructive/10 text-destructive";
      default: return "";
    }
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t("support.filter.all") },
    { value: "open", label: t("support.status.open") },
    { value: "in_progress", label: t("support.status.in_progress") },
    { value: "waiting_customer", label: t("support.status.waiting_customer") },
    { value: "resolved", label: t("support.status.resolved") },
    { value: "closed", label: t("support.status.closed") },
  ];

  return (
    <PageLayout
      headerActions={
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("support.new_ticket")}
        </Button>
      }
    >
      <div className="space-y-3">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light">
                <Ticket className="h-4 w-4 text-primary-dark" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-6">{tickets.length}</p>
                <p className="text-xs text-muted-foreground">{t("support.stats.total")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10">
                <Clock className="h-4 w-4 text-warning-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-6">{openTickets.length}</p>
                <p className="text-xs text-muted-foreground">{t("support.stats.open")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/15">
                <AlertCircle className="h-4 w-4 text-warning-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-6">{waitingTickets.length}</p>
                <p className="text-xs text-muted-foreground">{t("support.stats.waiting")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-6">{resolvedTickets.length}</p>
                <p className="text-xs text-muted-foreground">{t("support.stats.resolved")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="w-4 h-4" />
              {t("support.tabs.my_tickets")}
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              {t("support.tabs.faq")}
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <BookOpen className="w-4 h-4" />
              {t("support.tabs.documentation")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-3">
            {/* Filters */}
            <div className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t("support.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tickets Table */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {t("common.loading")}...
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileQuestion className="mx-auto mb-2.5 h-7 w-7 text-muted-foreground" />
                    <p className="text-muted-foreground">{t("support.no_tickets")}</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("support.create_first_ticket")}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("support.table.ticket")}</TableHead>
                        <TableHead>{t("support.table.subject")}</TableHead>
                        <TableHead>{t("support.table.category")}</TableHead>
                        <TableHead>{t("support.table.priority")}</TableHead>
                        <TableHead>{t("support.table.status")}</TableHead>
                        <TableHead>{t("support.table.created")}</TableHead>
                        <TableHead>{t("support.table.updated")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <TableCell className="font-mono text-sm">
                            {ticket.ticket_number}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`support.category.${ticket.category}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {t(`support.priority.${ticket.priority}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)}>
                              {t(`support.status.${ticket.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "MM/dd/yyyy")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(ticket.updated_at), "MM/dd/yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  {t("support.faq.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { q: t("support.faq.q1"), a: t("support.faq.a1") },
                  { q: t("support.faq.q2"), a: t("support.faq.a2") },
                  { q: t("support.faq.q3"), a: t("support.faq.a3") },
                  { q: t("support.faq.q4"), a: t("support.faq.a4") },
                ].map((faq, index) => (
                  <div key={index} className="border-b pb-3 last:border-0">
                    <h4 className="mb-1.5 text-sm font-medium">{faq.q}</h4>
                    <p className="text-muted-foreground text-sm">{faq.a}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="cursor-pointer border-border/90 shadow-none transition-colors hover:border-primary/30">
                <CardContent className="p-4 text-center">
                  <BookOpen className="mx-auto mb-2.5 h-7 w-7 text-primary" />
                  <h3 className="mb-1.5 text-sm font-medium">{t("support.docs.getting_started")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("support.docs.getting_started_desc")}
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer border-border/90 shadow-none transition-colors hover:border-primary/30">
                <CardContent className="p-4 text-center">
                  <MessageSquare className="mx-auto mb-2.5 h-7 w-7 text-primary" />
                  <h3 className="mb-1.5 text-sm font-medium">{t("support.docs.integrations")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("support.docs.integrations_desc")}
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer border-border/90 shadow-none transition-colors hover:border-primary/30">
                <CardContent className="p-4 text-center">
                  <HelpCircle className="mx-auto mb-2.5 h-7 w-7 text-primary" />
                  <h3 className="mb-1.5 text-sm font-medium">{t("support.docs.troubleshooting")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t("support.docs.troubleshooting_desc")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateTicketModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      <TicketDetailsModal
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        ticket={selectedTicket}
      />
    </PageLayout>
  );
}
