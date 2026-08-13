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
import { useLanguage } from "@/contexts/LanguageContext";
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
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Aberto</Badge>;
      case "in_progress":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Em Andamento</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Resolvido</Badge>;
      case "waiting_customer":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Aguardando</Badge>;
      case "closed":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
      case "urgent":
        return <Badge className="bg-red-500 text-white hover:bg-red-500">Alta</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white hover:bg-orange-500">Média</Badge>;
      case "low":
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Baixa</Badge>;
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
          <h1 className="text-2xl font-bold text-gray-900">Tickets de Suporte</h1>
          <p className="text-gray-500 mt-1">Gerencie todas as solicitações de suporte dos usuários</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{openTickets}</p>
                <p className="text-sm text-gray-500 mt-1">Tickets Abertos</p>
                <p className="text-xs text-gray-400">Aguardando atendimento</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-orange-100">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{inProgressTickets}</p>
                <p className="text-sm text-gray-500 mt-1">Em Andamento</p>
                <p className="text-xs text-gray-400">Sendo atendidos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{resolvedTickets}</p>
                <p className="text-sm text-gray-500 mt-1">Resolvidos</p>
                <p className="text-xs text-gray-400">Finalizados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-full bg-gray-100">
                  <LayoutGrid className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
                <p className="text-sm text-gray-500 mt-1">Total</p>
                <p className="text-xs text-gray-400">Todos os tickets</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Lista de Tickets
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Visualize e gerencie todos os tickets de suporte</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por ID, título ou usuário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-200"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-40 bg-white border-gray-200">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-44 bg-white border-gray-200">
                    <SelectValue placeholder="Todas Prioridades" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todas Prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTickets ? (
              <div className="p-8 text-center text-gray-500">
                Carregando...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum ticket encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600 font-medium">ID</TableHead>
                    <TableHead className="text-gray-600 font-medium">Título</TableHead>
                    <TableHead className="text-gray-600 font-medium">Usuário</TableHead>
                    <TableHead className="text-gray-600 font-medium">Organização</TableHead>
                    <TableHead className="text-gray-600 font-medium">Status</TableHead>
                    <TableHead className="text-gray-600 font-medium">Prioridade</TableHead>
                    <TableHead className="text-gray-600 font-medium">Categoria</TableHead>
                    <TableHead className="text-gray-600 font-medium">Criado em</TableHead>
                    <TableHead className="text-gray-600 font-medium text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="text-blue-600 font-mono text-sm">
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {ticket.company_settings?.trade_name || "-"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {ticket.company_settings?.legal_name || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(ticket.priority)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {ticket.category || "-"}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {format(new Date(ticket.created_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}>
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "in_progress"); }}>
                              Marcar em andamento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "resolved"); }}>
                              Marcar resolvido
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
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col bg-white">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900">
                  <span className="text-gray-500 font-mono text-sm">
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
                          ? "bg-red-500" 
                          : "bg-gray-200"
                      }`}>
                        {msg.is_staff_reply ? (
                          <Headphones className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className={`flex-1 max-w-[80%] ${msg.is_staff_reply ? "text-right" : ""}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          msg.is_staff_reply 
                            ? "bg-red-500 text-white" 
                            : "bg-gray-100 text-gray-900"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(msg.created_at), "MM/dd/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={2}
                  className="flex-1 border-gray-200"
                />
                <Button 
                  onClick={handleSendReply} 
                  disabled={!replyMessage.trim()}
                  className="self-end bg-red-500 hover:bg-red-600 text-white"
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
