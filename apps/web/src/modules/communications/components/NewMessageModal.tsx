import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Send, Loader2, MessageSquare, Users, UserCircle } from "lucide-react";
import { Customer } from "@/hooks/useCustomers";
import { Staff, useStaff } from "@/hooks/useStaff";
import { useCreateConversation, useSendMessage } from "@/hooks/useConversations";
import { toast } from "sonner";

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onConversationCreated?: (conversationId: string) => void;
}

type RecipientType = "customer" | "team";
type SelectedRecipient = 
  | { type: "customer"; data: Customer }
  | { type: "team"; data: Staff };

export function NewMessageModal({ 
  open, 
  onOpenChange, 
  customers,
  onConversationCreated 
}: NewMessageModalProps) {
  const [recipientTab, setRecipientTab] = useState<RecipientType>("customer");
  const [customerSearch, setCustomerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<SelectedRecipient | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: staffMembers = [] } = useStaff();
  const createConversationMutation = useCreateConversation();
  const sendMessageMutation = useSendMessage();

  // Filter customers with phone numbers
  const filteredCustomers = customers.filter((customer) => {
    const hasPhone = customer.phone || customer.phone2;
    const matchesSearch =
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email?.toLowerCase().includes(customerSearch.toLowerCase());

    return hasPhone && matchesSearch;
  });

  // Filter team members with phone numbers
  const filteredTeamMembers = staffMembers.filter((staff) => {
    const hasPhone = !!staff.phone;
    const matchesSearch =
      staff.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      staff.phone?.toLowerCase().includes(teamSearch.toLowerCase()) ||
      staff.email?.toLowerCase().includes(teamSearch.toLowerCase());

    return hasPhone && matchesSearch;
  });

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedRecipient({ type: "customer", data: customer });
  };

  const handleSelectTeamMember = (staff: Staff) => {
    setSelectedRecipient({ type: "team", data: staff });
  };

  const handleSendMessage = async () => {
    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);

    try {
      if (selectedRecipient.type === "customer") {
        // Create conversation for customer
        const conversation = await createConversationMutation.mutateAsync({
          customer_id: selectedRecipient.data.id,
        });

        // Send message
        await sendMessageMutation.mutateAsync({
          conversation_id: conversation.id,
          content: message.trim(),
          sender_type: "user",
        });

        toast.success("Message sent successfully");
        
        // Callback to select the new conversation
        if (onConversationCreated) {
          onConversationCreated(conversation.id);
        }
      } else {
        // Create conversation for team member
        const conversation = await createConversationMutation.mutateAsync({
          staff_id: selectedRecipient.data.id,
        });

        // Send message
        await sendMessageMutation.mutateAsync({
          conversation_id: conversation.id,
          content: message.trim(),
          sender_type: "user",
        });

        toast.success(`Message sent to ${selectedRecipient.data.name}`);
        
        // Callback to select the new conversation
        if (onConversationCreated) {
          onConversationCreated(conversation.id);
        }
      }

      handleClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setCustomerSearch("");
      setTeamSearch("");
      setSelectedRecipient(null);
      setMessage("");
      setRecipientTab("customer");
      onOpenChange(false);
    }
  };

  const getRecipientName = () => {
    if (!selectedRecipient) return "";
    return selectedRecipient.data.name;
  };

  const getRecipientPhone = () => {
    if (!selectedRecipient) return "";
    if (selectedRecipient.type === "customer") {
      return selectedRecipient.data.phone || selectedRecipient.data.phone2 || "";
    }
    return selectedRecipient.data.phone || "";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <T k="communications.newMessage" />
          </DialogTitle>
          <DialogDescription>
            Start a new conversation with a customer or team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Recipient Selection */}
          {!selectedRecipient ? (
            <>
              <Tabs value={recipientTab} onValueChange={(v) => setRecipientTab(v as RecipientType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customer" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <T k="crm.tabs.customers" />
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    <T k="reports.teamMembers" />
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="customer" className="mt-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-[250px] border rounded-lg">
                    {filteredCustomers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground">
                          No customers with phone numbers found
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                            onClick={() => handleSelectCustomer(customer)}
                          >
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
                </TabsContent>

                <TabsContent value="team" className="mt-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search team members..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-[250px] border rounded-lg">
                    {filteredTeamMembers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground">
                          No team members with phone numbers found
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredTeamMembers.map((staff) => (
                          <div
                            key={staff.id}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                            onClick={() => handleSelectTeamMember(staff)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{staff.name}</span>
                                {staff.team && (
                                  <Badge variant="outline" className="text-xs">
                                    Team {staff.team}
                                  </Badge>
                                )}
                                {!staff.is_active && (
                                  <Badge variant="secondary" className="text-xs">
                                    <T k="common.inactive" />
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {staff.phone}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <>
              {/* Selected Recipient */}
              <div className="space-y-2">
                <Label>To</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    {selectedRecipient.type === "customer" ? (
                      <Users className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <UserCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{getRecipientName()}</p>
                      <p className="text-sm text-muted-foreground">
                        {getRecipientPhone()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRecipient(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-2 flex-1">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            <T k="common.cancel" />
          </Button>
          {selectedRecipient && (
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !message.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
