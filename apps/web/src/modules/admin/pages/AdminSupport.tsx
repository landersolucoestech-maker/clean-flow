import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useSupportTickets, TicketStatus, TicketUpdate } from "@/hooks/useSupportTickets";
import type { AdminTicket } from "@/hooks/usePlatformAdmin";
import { useLanguage } from "@/contexts/useLanguage";
import {
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  LayoutGrid,
  MoreHorizontal,
  Send,
  User,
  Headphones,
} from "lucide-react";

type StatusFilter = "all" | TicketStatus;

export function AdminSupport() {
  const { t } = useLanguage();
  const { allTickets, isLoadingTickets, updateTicket, addStaffReply } = usePlatformAdmin();
  const { useTicketMessages } = useSupportTickets();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data: messages = [] } = useTicketMessages(selectedTicket?.id || null);

  const filteredTickets = allTickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.company_settings?.trade_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    addStaffReply({ ticketId: selectedTicket.id, message: replyMessage });
    setReplyMessage("");
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    const updates: TicketUpdate = { status };
    if (status === "resolved") updates.resolved_at = new Date().toISOString();
    if (status === "closed") updates.closed_at = new Date().toISOString();
    
    updateTicket({ ticketId, updates });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10"><T k="support.status.open" /></Badge>;
      case "in_progress":
        return <Badge className="bg-warning/10 text-warning-foreground hover:bg-warning/10"><T k="jobs.inProgress" /></Badge>;
      case "resolved":
        return <Badge className="bg-success/10 text-success hover:bg-success/10"><T k="support.status.resolved" /></Badge>;
      case "waiting_customer":
        return <Badge className="bg-primary-light text-primary-dark hover:bg-primary-light"><T k="support.stats.waiting" /></Badge>;
      case "closed":
        return <Badge className="bg-muted text-foreground hover:bg-muted"><T k="settings.closed" /></Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
      case "urgent":
        return <Badge className="bg-destructive text-white hover:bg-destructive"><T k="support.priority.high" /></Badge>;
      case "medium":
        return <Badge className="bg-primary text-white hover:bg-primary"><T k="support.priority.medium" /></Badge>;
      case "low":
        return <Badge variant="outline" className="text-muted-foreground border-border"><T k="support.priority.low" /></Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Stats
  const openTickets = allTickets.filter((ticket) => ticket.status === "open").length;
  const inProgressTickets = allTickets.filter((ticket) => ticket.status === "in_progress").length;
  const resolvedTickets = allTickets.filter((ticket) => ticket.status === "resolved").length;
  const totalTickets = allTickets.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground"><T k="literal.admin.tickets_de_suporte.613d664a" /></h1>
          <p className="text-muted-foreground mt-1"><T k="literal.admin.gerencie_todas_as_solicitacoes_de_suporte_do.d2cb63c2" /></p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border border-border/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-destructive/10">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{openTickets}</p>
                <p className="text-sm text-muted-foreground mt-1"><T k="literal.admin.tickets_abertos.47fe9163" /></p>
                <p className="text-xs text-muted-foreground/70"><T k="literal.admin.aguardando_atendimento.4b74e19d" /></p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-warning/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{inProgressTickets}</p>
                <p className="text-sm text-muted-foreground mt-1"><T k="jobs.inProgress" /></p>
                <p className="text-xs text-muted-foreground/70"><T k="literal.admin.sendo_atendidos.31acbe65" /></p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{resolvedTickets}</p>
                <p className="text-sm text-muted-foreground mt-1"><T k="support.stats.resolved" /></p>
                <p className="text-xs text-muted-foreground/70"><T k="literal.admin.finalizados.7399a37e" /></p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border/80 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-muted">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-sm text-muted-foreground mt-1"><T k="invoice.total" /></p>
                <p className="text-xs text-muted-foreground/70"><T k="literal.admin.todos_os_tickets.2de97562" /></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <Card className="bg-card border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  <T k="literal.admin.lista_de_tickets.b5e155a2" />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1"><T k="literal.admin.visualize_e_gerencie_todos_os_tickets_de_sup.586c9680" /></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/70 w-4 h-4" />
                  <Input
                    placeholder="Buscar por ID, título ou usuário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border/80"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-40 bg-card border-border/80">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all"><T k="admin.support.all_status" /></SelectItem>
                    <SelectItem value="open"><T k="support.status.open" /></SelectItem>
                    <SelectItem value="in_progress"><T k="jobs.inProgress" /></SelectItem>
                    <SelectItem value="resolved"><T k="support.status.resolved" /></SelectItem>
                    <SelectItem value="closed"><T k="settings.closed" /></SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-44 bg-card border-border/80">
                    <SelectValue placeholder="Todas Prioridades" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all"><T k="literal.admin.todas_prioridades.57c5c06a" /></SelectItem>
                    <SelectItem value="high"><T k="support.priority.high" /></SelectItem>
                    <SelectItem value="medium"><T k="support.priority.medium" /></SelectItem>
                    <SelectItem value="low"><T k="support.priority.low" /></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-muted-foreground">
                <T k="common.loading" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <T k="support.no_tickets" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background">
                    <TableHead className="text-muted-foreground font-medium"><T k="transactions.id" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="literal.admin.titulo.98a5efa6" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="literal.admin.usuario.f32c1345" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="literal.admin.organizacao.1ddb1fd2" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="admin.clients.status" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="admin.support.priority" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="support.category" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium"><T k="admin.clients.created" /></TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right"><T k="common.actions" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="hover:bg-background cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="text-primary font-mono text-sm">
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell className="text-foreground font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {ticket.company_settings?.trade_name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.company_settings?.legal_name || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(ticket.priority)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.category || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ticket.created_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="text-muted-foreground/70 hover:text-muted-foreground" aria-label="Ticket actions">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}>
                              <T k="estimate.viewDetails" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "in_progress"); }}>
                              <T k="literal.admin.marcar_em_andamento.1f42ee8e" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "resolved"); }}>
                              <T k="literal.admin.marcar_resolvido.2323bbf5" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Details Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col bg-card">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <span className="text-muted-foreground font-mono text-sm">
                    {selectedTicket.ticket_number}
                  </span>
                  <span>{selectedTicket.subject}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.is_staff_reply ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.is_staff_reply 
                          ? "bg-destructive" 
                          : "bg-muted"
                      }`}>
                        {msg.is_staff_reply ? (
                          <Headphones className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[80%] ${msg.is_staff_reply ? "text-right" : ""}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          msg.is_staff_reply 
                            ? "bg-destructive text-white" 
                            : "bg-muted text-foreground"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(new Date(msg.created_at), "MM/dd/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4 border-t border-border/80">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={2}
                  className="flex-1 border-border/80"
                />
                <Button 
                  onClick={handleSendReply} 
                  disabled={!replyMessage.trim()}
                  className="self-end bg-destructive hover:bg-destructive/90 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
