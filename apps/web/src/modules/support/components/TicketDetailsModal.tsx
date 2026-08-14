import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupportTickets, SupportTicket, TicketStatus } from "@/hooks/useSupportTickets";
import { useLanguage } from "@/contexts/useLanguage";
import { Send, User, Headphones } from "lucide-react";

interface TicketDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: SupportTicket | null;
}

export function TicketDetailsModal({ open, onOpenChange, ticket }: TicketDetailsModalProps) {
  const { t } = useLanguage();
  const { useTicketMessages, addMessage, isAddingMessage, updateStatus } = useSupportTickets();
  const [newMessage, setNewMessage] = useState("");
  
  const { data: messages = [], isLoading: messagesLoading } = useTicketMessages(ticket?.id || null);

  if (!ticket) return null;

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    addMessage(
      { ticket_id: ticket.id, message: newMessage },
      {
        onSuccess: () => setNewMessage(""),
      }
    );
  };

  const handleStatusChange = (status: TicketStatus) => {
    updateStatus({ ticketId: ticket.id, status });
  };

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
      case "low": return "bg-muted text-foreground";
      case "medium": return "bg-primary-light text-primary-dark";
      case "high": return "bg-warning/10 text-warning-foreground";
      case "urgent": return "bg-destructive/10 text-destructive";
      default: return "";
    }
  };

  const statusOptions: { value: TicketStatus; label: string }[] = [
    { value: "open", label: t("support.status.open") },
    { value: "in_progress", label: t("support.status.in_progress") },
    { value: "waiting_customer", label: t("support.status.waiting_customer") },
    { value: "resolved", label: t("support.status.resolved") },
    { value: "closed", label: t("support.status.closed") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">
              {ticket.ticket_number}
            </span>
            <span>{ticket.subject}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getStatusColor(ticket.status)}>
            {t(`support.status.${ticket.status}`)}
          </Badge>
          <Badge className={getPriorityColor(ticket.priority)}>
            {t(`support.priority.${ticket.priority}`)}
          </Badge>
          <Badge variant="outline">
            {t(`support.category.${ticket.category}`)}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {t("support.created_at")}: {format(new Date(ticket.created_at), "MM/dd/yyyy HH:mm")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("support.change_status")}:</span>
          <Select value={ticket.status} onValueChange={handleStatusChange}>
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

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messagesLoading ? (
              <div className="text-center text-muted-foreground py-4">
                {t("common.loading")}...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                {t("support.no_messages")}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.is_staff_reply ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.is_staff_reply 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}>
                    {msg.is_staff_reply ? (
                      <Headphones className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${msg.is_staff_reply ? "text-right" : ""}`}>
                    <div className={`inline-block p-3 rounded-lg ${
                      msg.is_staff_reply 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(msg.created_at), "MM/dd/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("support.type_message")}
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isAddingMessage || !newMessage.trim()}
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
