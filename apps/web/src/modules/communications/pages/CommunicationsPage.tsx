import { T } from "@/shared/components/i18n/T";
import { useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import {
  Facebook,
  Filter,
  Inbox,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Star,
  Trash2,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/PageLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/useLanguage";
import { useCustomers } from "@/hooks/useCustomers";
import {
  type Conversation,
  useConversations,
  useDeleteConversation,
  useMarkAsRead,
  useMessages,
  useSendMessage,
  useTeamConversations,
} from "../hooks/useConversations";
import { useNotificationSound } from "../hooks/useNotificationSound";
import { useRingCentralSync } from "../hooks/useRingCentralSync";
import { BroadcastModal } from "../components/BroadcastModal";
import { NewMessageModal } from "../components/NewMessageModal";
import { uploadMessageAttachment } from "../services/messageAttachmentService";

 type InboxAudience = "customers" | "team";
 type InboxFilter = "all" | "unread" | "favorites";
 type InboxChannel = "all" | "sms" | "facebook" | "instagram" | "nextdoor";

const CHANNELS: Array<{ id: InboxChannel; label: string; icon: typeof Inbox; available: boolean }> = [
  { id: "all", label: "All channels", icon: Inbox, available: true },
  { id: "sms", label: "SMS", icon: Smartphone, available: true },
  { id: "facebook", label: "Facebook", icon: Facebook, available: false },
  { id: "instagram", label: "Instagram", icon: Instagram, available: false },
  { id: "nextdoor", label: "Nextdoor", icon: MessageCircle, available: false },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function conversationName(conversation: Conversation | undefined) {
  return conversation?.customer?.name || conversation?.staff?.name || "Unknown contact";
}

function conversationContact(conversation: Conversation | undefined) {
  return conversation?.customer?.phone || conversation?.customer?.email || conversation?.staff?.phone || conversation?.staff?.email || "No contact details";
}

export function Communications() {
  const { language } = useLanguage();
  const dateLocale = language === "pt" ? ptBR : language === "es" ? es : enUS;
  const [audience, setAudience] = useState<InboxAudience>("customers");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [channel, setChannel] = useState<InboxChannel>("all");
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { playNotificationSound } = useNotificationSound();
  const { data: customerConversations = [], isLoading: customerLoading } = useConversations(playNotificationSound);
  const { data: teamConversations = [], isLoading: teamLoading } = useTeamConversations(playNotificationSound);
  const { data: customers = [] } = useCustomers();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedConversation);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteConversation = useDeleteConversation();
  const { syncMessages, isSyncing } = useRingCentralSync();

  const source = audience === "customers" ? customerConversations : teamConversations;
  const isLoading = audience === "customers" ? customerLoading : teamLoading;

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (channel !== "all" && channel !== "sms") return [];
    return source.filter((conversation) => {
      if (filter === "unread" && !conversation.unread) return false;
      if (filter === "favorites" && !conversation.favorite) return false;
      if (!term) return true;
      const haystack = [conversationName(conversation), conversationContact(conversation), conversation.last_message || ""].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [channel, filter, search, source]);

  const selected = customerConversations.find((item) => item.id === selectedConversation)
    || teamConversations.find((item) => item.id === selectedConversation);

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation.id);
    if (conversation.unread) markAsRead.mutate(conversation.id);
  };

  const handleSend = async () => {
    if (!selectedConversation || (!messageText.trim() && !attachmentFile)) return;
    setIsUploading(true);
    try {
      const attachmentUrl = attachmentFile
        ? await uploadMessageAttachment(selectedConversation, attachmentFile)
        : null;
      await sendMessage.mutateAsync({
        conversation_id: selectedConversation,
        content: messageText.trim() || (attachmentFile ? "Attachment" : ""),
        attachment_url: attachmentUrl,
      });
      setMessageText("");
      setAttachmentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const removeSelectedConversation = async () => {
    if (!selectedConversation) return;
    try {
      await deleteConversation.mutateAsync(selectedConversation);
      setSelectedConversation(null);
      toast.success("Conversation archived");
    } catch {
      toast.error("Unable to archive conversation");
    }
  };

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => syncMessages(30)} disabled={isSyncing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        Sync
      </Button>
      <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
        <Users className="mr-2 h-4 w-4" />
        Broadcast
      </Button>
      <Button size="sm" onClick={() => setNewMessageOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New message
      </Button>
    </>
  );

  return (
    <PageLayout fullHeight headerActions={headerActions} contentClassName="gap-0 pb-4">
      <section className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[190px_330px_minmax(0,1fr)] 2xl:grid-cols-[190px_350px_minmax(0,1fr)_280px]">
        <aside className="hidden min-h-0 border-r border-border/80 bg-muted/20 lg:flex lg:flex-col">
          <div className="border-b border-border/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Channels</p>
          </div>
          <div className="space-y-1 p-2">
            {CHANNELS.map((item) => {
              const Icon = item.icon;
              const active = channel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChannel(item.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
                >
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{item.label}</span>
                  {!item.available && <span className={`text-[9px] font-semibold uppercase ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Ready</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-auto border-t border-border/80 p-3 text-xs text-muted-foreground">
            SMS is connected today. Social channels are represented by the same inbox contract and can be activated without rebuilding this screen.
          </div>
        </aside>

        <aside className="flex min-h-0 flex-col border-r border-border/80">
          <div className="space-y-3 border-b border-border/80 p-3.5">
            <div className="flex rounded-md bg-muted p-1">
              <button type="button" onClick={() => setAudience("customers")} className={`flex-1 rounded-sm px-3 py-2 text-xs font-medium ${audience === "customers" ? "bg-card text-foreground" : "text-muted-foreground"}`}><Users className="mr-1.5 inline h-3.5 w-3.5" /><T k="crm.tabs.customers" /></button>
              <button type="button" onClick={() => setAudience("team")} className={`flex-1 rounded-sm px-3 py-2 text-xs font-medium ${audience === "team" ? "bg-card text-foreground" : "text-muted-foreground"}`}><UserCircle className="mr-1.5 inline h-3.5 w-3.5" /><T k="settings.team" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations..." className="pl-9" />
            </div>
            <div className="flex gap-2 lg:hidden">
              <Select value={channel} onValueChange={(value) => setChannel(value as InboxChannel)}>
                <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(["all", "unread", "favorites"] as const).map((value) => (
                <Button key={value} type="button" variant={filter === value ? "default" : "outline"} size="sm" className="h-8 px-2.5 text-xs" onClick={() => setFilter(value)}>
                  {value === "favorites" && <Star className="mr-1 h-3 w-3" />}{value[0].toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : visibleConversations.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center px-5 text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">No conversations here</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{channel !== "all" && channel !== "sms" ? "This channel is ready for a future integration." : "Change the filters or start a new conversation."}</p>
              </div>
            ) : (
              <div className="p-2">
                {visibleConversations.map((conversation) => {
                  const active = selectedConversation === conversation.id;
                  return (
                    <button key={conversation.id} type="button" onClick={() => selectConversation(conversation)} className={`mb-1 w-full rounded-md p-3 text-left transition-colors ${active ? "bg-primary-light ring-1 ring-primary/20" : "hover:bg-muted/70"}`}>
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-muted text-xs">{initials(conversationName(conversation))}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-foreground">{conversationName(conversation)}</p>{conversation.last_message_at && <span className="shrink-0 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: dateLocale })}</span>}</div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message || "No messages yet"}</p>
                          <div className="mt-2 flex items-center gap-1.5"><Badge variant="outline" className="gap-1 text-[10px]"><Smartphone className="h-2.5 w-2.5" />SMS</Badge>{conversation.unread && <Badge className="text-[10px]"><T k="communications.new" /></Badge>}{conversation.favorite && <Star className="h-3 w-3 fill-warning text-warning" />}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          {selected ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{initials(conversationName(selected))}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{conversationName(selected)}</p><div className="mt-0.5 flex items-center gap-2"><Badge variant="outline" className="gap-1 text-[10px]"><Smartphone className="h-2.5 w-2.5" />SMS</Badge><span className="truncate text-xs text-muted-foreground">{conversationContact(selected)}</span></div></div></div>
                <Button variant="ghost" size="icon" onClick={() => void removeSelectedConversation()} aria-label="Archive conversation"><Trash2 className="h-4 w-4" /></Button>
              </div>

              <ScrollArea className="min-h-0 flex-1 bg-muted/10">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:p-6">
                  {messagesLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : messages.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-center"><MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/50" /><p className="text-sm font-medium"><T k="support.no_messages" /></p><p className="mt-1 text-xs text-muted-foreground">Send the first message to start this conversation.</p></div> : messages.map((message) => {
                    const outgoing = message.sender_type !== "customer" && message.sender_type !== "external";
                    return <div key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-lg px-4 py-2.5 text-sm ${outgoing ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"}`}><p className="whitespace-pre-wrap leading-5">{message.content}</p>{message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">Open attachment</a>}<p className={`mt-1 text-[10px] ${outgoing ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div></div>;
                  })}
                </div>
              </ScrollArea>

              <div className="border-t border-border/80 bg-card p-3 sm:p-4">
                {attachmentFile && <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs"><span className="truncate">{attachmentFile.name}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachmentFile(null)}><X className="h-3 w-3" /></Button></div>}
                <div className="flex items-end gap-2"><input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} /><Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Attach file"><Paperclip className="h-4 w-4" /></Button><Textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message..." className="min-h-10 max-h-32 resize-none" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} /><Button type="button" size="icon" disabled={isUploading || sendMessage.isPending || (!messageText.trim() && !attachmentFile)} onClick={() => void handleSend()} aria-label="Send message">{isUploading || sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"><div className="mb-4 rounded-lg bg-primary/10 p-4 text-primary"><Inbox className="h-8 w-8" /></div><h2 className="text-lg font-semibold text-foreground"><T k="communications.selectConversation" /></h2><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Choose a customer or team conversation from the unified inbox, or start a new message.</p><Button className="mt-5" onClick={() => setNewMessageOpen(true)}><Plus className="mr-2 h-4 w-4" />New message</Button></div>
          )}
        </main>

        <aside className="hidden min-h-0 border-l border-border/80 bg-muted/10 2xl:flex 2xl:flex-col">
          <div className="border-b border-border/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contact context</p></div>
          {selected ? <div className="space-y-5 p-4"><div className="flex items-center gap-3"><Avatar className="h-11 w-11"><AvatarFallback>{initials(conversationName(selected))}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold">{conversationName(selected)}</p><p className="truncate text-xs text-muted-foreground">{audience === "customers" ? "Customer" : "Team member"}</p></div></div><div className="space-y-3 rounded-md border border-border bg-card p-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Channel</p><p className="mt-1 flex items-center gap-2 text-sm"><Smartphone className="h-3.5 w-3.5" />SMS</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><T k="common.contact" /></p><p className="mt-1 break-words text-sm">{conversationContact(selected)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><T k="common.status" /></p><p className="mt-1 text-sm">{selected.unread ? "Unread" : "Read"}</p></div></div><p className="text-xs leading-5 text-muted-foreground">This contextual column is ready to receive CRM details, assignment, tags and future channel metadata as integrations are enabled.</p></div> : <div className="flex flex-1 items-center justify-center p-5 text-center text-xs text-muted-foreground">Contact details appear here when a conversation is selected.</div>}
        </aside>
      </section>

      <NewMessageModal open={newMessageOpen} onOpenChange={setNewMessageOpen} customers={customers} onConversationCreated={setSelectedConversation} />
      <BroadcastModal open={broadcastOpen} onOpenChange={setBroadcastOpen} customers={customers} />
    </PageLayout>
  );
}
