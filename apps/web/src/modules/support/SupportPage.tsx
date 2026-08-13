import { useState } from "react";
import { format } from "date-fns";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/shared/PageHeader";
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
      case "open": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "waiting_customer": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low": return "bg-gray-100 text-gray-800";
      case "medium": return "bg-blue-100 text-blue-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "urgent": return "bg-red-100 text-red-800";
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
    <PageLayout>
      <div className="space-y-6">
        <PageHeader
          title={t("support.title")}
          description={t("support.page_description")}
          actions={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("support.new_ticket")}
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets.length}</p>
                <p className="text-sm text-muted-foreground">{t("support.stats.total")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTickets.length}</p>
                <p className="text-sm text-muted-foreground">{t("support.stats.open")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{waitingTickets.length}</p>
                <p className="text-sm text-muted-foreground">{t("support.stats.waiting")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedTickets.length}</p>
                <p className="text-sm text-muted-foreground">{t("support.stats.resolved")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
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

          <TabsContent value="tickets" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectTrigger className="w-48">
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
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("common.loading")}...
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t("support.no_tickets")}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
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
                          className="cursor-pointer hover:bg-muted/50"
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
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ticket.created_at), "MM/dd/yyyy")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
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
              <CardContent className="space-y-6">
                {[
                  { q: t("support.faq.q1"), a: t("support.faq.a1") },
                  { q: t("support.faq.q2"), a: t("support.faq.a2") },
                  { q: t("support.faq.q3"), a: t("support.faq.a3") },
                  { q: t("support.faq.q4"), a: t("support.faq.a4") },
                ].map((faq, index) => (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <h4 className="font-medium mb-2">{faq.q}</h4>
                    <p className="text-muted-foreground text-sm">{faq.a}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h3 className="font-medium mb-2">{t("support.docs.getting_started")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("support.docs.getting_started_desc")}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h3 className="font-medium mb-2">{t("support.docs.integrations")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("support.docs.integrations_desc")}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <HelpCircle className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h3 className="font-medium mb-2">{t("support.docs.troubleshooting")}</h3>
                  <p className="text-sm text-muted-foreground">
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
