import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  MessageSquare,
  Star,
  Paperclip,
  Send,
  Smile,
  Menu,
  Trash2,
  Loader2,
  Users,
  Filter,
  RefreshCw,
  Image,
  X,
  UserCircle,
} from "lucide-react";
import { useConversations, useTeamConversations, useMessages, useSendMessage, useDeleteConversation, useMarkAsRead, useCreateConversation } from "@/hooks/useConversations";
import { useCustomers } from "@/hooks/useCustomers";
import { useStaff } from "@/hooks/useStaff";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/useLanguage";
import { BroadcastModal } from "@/components/communications/BroadcastModal";
import { NewMessageModal } from "@/components/communications/NewMessageModal";
import { useRingCentralSync } from "@/hooks/useRingCentralSync";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { uploadMessageAttachment } from "./services/messageAttachmentService";
type RecipientTab = "customers" | "team";

type FilterType = "all" | "unread" | "favorites";
type CustomerStatusFilter = "all" | "active" | "inactive";
type TeamFilter = "all" | "active" | "inactive";

type AttachmentRef = { url: string; fileName: string; isImage: boolean };

const STORAGE_ATTACHMENT_URL_RE =
  /https?:\/\/[^\s]+\/storage\/v1\/object\/public\/(?:message-attachments|broadcast-attachments)\/[^\s]+/gi;

function normalizeAttachmentUrl(raw: string): string {
  return raw.replace(/[),.]+$/, "");
}

function getFileNameFromAttachmentUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const rawName = parts[parts.length - 1] || "documento";
    const decoded = decodeURIComponent(rawName);

    // Remove prefix like: 1768375402470_meu-arquivo.pdf -> meu-arquivo.pdf
    const withoutTimestampPrefix = decoded.replace(/^\d{13,}_/, "");

    // Old format: 1768375402470.pdf (we can't recover original name)
    if (/^\d{13,}\./.test(withoutTimestampPrefix)) {
      const ext = withoutTimestampPrefix.split(".").pop() || "";
      return ext ? `documento.${ext}` : "documento";
    }

    return withoutTimestampPrefix || decoded || "documento";
  } catch {
    return "documento";
  }
}

function parseMessageContentForAttachments(content?: string | null): {
  cleanText: string;
  attachments: AttachmentRef[];
} {
  const text = (content || "").trim();
  if (!text) return { cleanText: "", attachments: [] };

  const rawMatches = text.match(STORAGE_ATTACHMENT_URL_RE) || [];
  const attachments = rawMatches
    .map((m) => normalizeAttachmentUrl(m))
    .filter(Boolean)
    .map((url) => ({
      url,
      fileName: getFileNameFromAttachmentUrl(url),
      isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(url),
    }));

  let cleanText = text;
  for (const { url } of attachments) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanText = cleanText
      .replace(new RegExp(`\\n?\\s*📎[^\\n]*?:\\s*${escapedUrl}\\s*\\n?`, "g"), "\n")
      .replace(new RegExp(`\\n?\\s*Attachment:\\s*${escapedUrl}\\s*\\n?`, "gi"), "\n")
      .replace(new RegExp(escapedUrl, "g"), "");
  }

  cleanText = cleanText
    .replace(/📎\s*[^:\n]*:\s*/g, "")
    .replace(/Attachment:\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, attachments };
}

function getConversationPreviewText(text?: string | null): string | null {
  if (!text) return null;
  const parsed = parseMessageContentForAttachments(text);

  if (parsed.attachments.length > 0) {
    // Never show the URL in previews
    return parsed.cleanText || parsed.attachments[0].fileName;
  }

  return text;
}

export function Communications() {
  const { t, language } = useLanguage();
  const dateLocale = language === "pt" ? ptBR : language === "es" ? es : enUS;
  const [conversationSearch, setConversationSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<CustomerStatusFilter>("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [newMessageModalOpen, setNewMessageModalOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recipientTab, setRecipientTab] = useState<RecipientTab>("customers");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [teamActiveFilter, setTeamActiveFilter] = useState<FilterType>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { playNotificationSound } = useNotificationSound();

  const { data: conversations = [], isLoading } = useConversations(playNotificationSound);
  const { data: teamConversations = [], isLoading: isLoadingTeam } = useTeamConversations(playNotificationSound);
  const { data: customers = [] } = useCustomers();
  const { data: staff = [] } = useStaff();
  const { data: messages = [] } = useMessages(selectedConversation);
  const sendMessageMutation = useSendMessage();
  const deleteConversationMutation = useDeleteConversation();
  const markAsReadMutation = useMarkAsRead();
  const createConversationMutation = useCreateConversation();
  const { syncMessages, isSyncing } = useRingCentralSync();

  // Create staff status map for filtering
  const staffStatusMap = new Map(
    staff.map((s) => [s.id, { is_active: s.is_active, is_driver: s.is_driver }])
  );

  // Filter team conversations
  const filteredTeamConversations = teamConversations.filter((conv) => {
    const staffName = conv.staff?.name || '';
    const matchesSearch = staffName.toLowerCase().includes(teamSearch.toLowerCase());
    
    // Filter by staff status
    const staffStatus = staffStatusMap.get(conv.staff_id || '');
    const matchesTeamFilter =
      teamFilter === "all" ||
      (teamFilter === "active" && staffStatus?.is_active) ||
      (teamFilter === "inactive" && !staffStatus?.is_active);

    if (teamActiveFilter === "unread") return matchesSearch && matchesTeamFilter && conv.unread;
    if (teamActiveFilter === "favorites") return matchesSearch && matchesTeamFilter && conv.favorite;
    return matchesSearch && matchesTeamFilter;
  });

  // Create a map of customer status by customer_id
  const customerStatusMap = new Map(
    customers.map((c) => [c.id, c.status?.toLowerCase() || "unknown"])
  );

  const filteredConversations = conversations.filter((conv) => {
    const customerName = conv.customer?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(conversationSearch.toLowerCase());
    
    // Filter by customer status
    const customerStatus = customerStatusMap.get(conv.customer_id) || "unknown";
    const matchesCustomerStatus =
      customerStatusFilter === "all" ||
      (customerStatusFilter === "active" && customerStatus === "active") ||
      (customerStatusFilter === "inactive" && customerStatus === "inactive");

    if (activeFilter === "unread") return matchesSearch && matchesCustomerStatus && conv.unread;
    if (activeFilter === "favorites") return matchesSearch && matchesCustomerStatus && conv.favorite;
    return matchesSearch && matchesCustomerStatus;
  });

  // Find selected conversation in either customer or team conversations
  const selectedConversationData = 
    conversations.find((conv) => conv.id === selectedConversation) ||
    teamConversations.find((conv) => conv.id === selectedConversation);

  // Get display name for selected conversation
  const selectedConversationName = selectedConversationData?.customer?.name || 
    selectedConversationData?.staff?.name || 
    t("communications.selectConversation");

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    const conv = conversations.find(c => c.id === id) || teamConversations.find(c => c.id === id);
    if (conv?.unread) {
      markAsReadMutation.mutate(id);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !attachmentFile) || !selectedConversation) return;
    
    setIsUploading(true);
    let attachmentUrl: string | null = null;
    
    try {
      // Upload attachment if present
      if (attachmentFile) {
        attachmentUrl = await uploadMessageAttachment(selectedConversation, attachmentFile);
      }
      
      // Send message
      sendMessageMutation.mutate({
        conversation_id: selectedConversation,
        content: messageText || (attachmentFile ? '📎 Attachment' : ''),
        sender_type: "user",
        attachment_url: attachmentUrl,
      }, {
        onSuccess: () => {
          setMessageText("");
          setAttachmentFile(null);
          setAttachmentPreview(null);
        },
        onError: () => {
          toast.error(t("communications.errorSendingMessage"));
        }
      });
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setAttachmentFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachmentPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConversation = () => {
    if (selectedConversation) {
      deleteConversationMutation.mutate(selectedConversation, {
        onSuccess: () => {
          setSelectedConversation(null);
          toast.success(t("communications.conversationDeleted"));
        },
        onError: () => {
          toast.error(t("communications.errorDeletingConversation"));
        }
      });
    }
  };

  return (
    <PageLayout fullHeight contentClassName="gap-4">
      {/* Chat Layout */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            {/* Conversations Sidebar */}
            <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm lg:w-80 lg:shrink-0">
              {/* Header */}
              <div className="border-b border-border/80 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{t("communications.title")}</h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncMessages(30)}
                      disabled={isSyncing}
                      className="text-xs"
                      title="Sync messages from RingCentral"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBroadcastModalOpen(true)}
                      className="text-xs"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Broadcast
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("communications.subtitle")}</p>
              </div>

              {/* Recipient Type Tabs */}
              <div className="p-3 pb-0">
                <Tabs value={recipientTab} onValueChange={(v) => setRecipientTab(v as RecipientTab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="customers" className="flex-1 text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Customers
                    </TabsTrigger>
                    <TabsTrigger value="team" className="flex-1 text-xs">
                      <UserCircle className="w-3 h-3 mr-1" />
                      Team
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {recipientTab === "customers" ? (
                <>
                  {/* Customer Search */}
                  <div className="p-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t("communications.searchConversations")}
                        value={conversationSearch}
                        onChange={(e) => setConversationSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Customer Status Filter */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={customerStatusFilter}
                        onValueChange={(value) => setCustomerStatusFilter(value as CustomerStatusFilter)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Customer Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          <SelectItem value="active">Active Customers</SelectItem>
                          <SelectItem value="inactive">Inactive Customers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="px-3 pb-3 flex gap-2">
                    <Button
                      variant={activeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("all")}
                      className="text-xs"
                    >
                      {t("communications.all")}
                    </Button>
                    <Button
                      variant={activeFilter === "unread" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("unread")}
                      className="text-xs"
                    >
                      {t("communications.unread")}
                    </Button>
                    <Button
                      variant={activeFilter === "favorites" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter("favorites")}
                      className="text-xs"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {t("communications.favorites")}
                    </Button>
                  </div>

                  {/* Conversations List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">{t("communications.noConversations")}</p>
                        <Button 
                          variant="link" 
                          className="text-primary mt-2"
                          onClick={() => setNewMessageModalOpen(true)}
                        >
                          {t("communications.startNewConversation")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation === conv.id
                                ? "bg-primary-light"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => handleSelectConversation(conv.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">
                                {conv.customer?.name || t("common.customer")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {conv.last_message_at 
                                  ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: dateLocale })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {getConversationPreviewText(conv.last_message) || t("communications.noMessages")}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {conv.unread && (
                                <Badge variant="default" className="text-xs">
                                  {t("communications.new")}
                                </Badge>
                              )}
                              {conv.favorite && (
                                <Star className="w-3 h-3 fill-warning text-warning" />
                              )}
                              {/* Customer Status Badge */}
                              {(() => {
                                const status = customerStatusMap.get(conv.customer_id);
                                return status ? (
                                  <Badge
                                    variant={status === "active" ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {status === "active" ? "Active" : "Inactive"}
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Team Search */}
                  <div className="p-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t("communications.searchConversations")}
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Team Filter (same style as customers) */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={teamFilter}
                        onValueChange={(value) => setTeamFilter(value as TeamFilter)}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Team Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Team Members</SelectItem>
                          <SelectItem value="active">Active Team Members</SelectItem>
                          <SelectItem value="inactive">Inactive Team Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filter Tabs (same as customers) */}
                  <div className="px-3 pb-3 flex gap-2">
                    <Button
                      variant={teamActiveFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTeamActiveFilter("all")}
                      className="text-xs"
                    >
                      {t("communications.all")}
                    </Button>
                    <Button
                      variant={teamActiveFilter === "unread" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTeamActiveFilter("unread")}
                      className="text-xs"
                    >
                      {t("communications.unread")}
                    </Button>
                    <Button
                      variant={teamActiveFilter === "favorites" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTeamActiveFilter("favorites")}
                      className="text-xs"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {t("communications.favorites")}
                    </Button>
                  </div>

                  {/* Team Conversations List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoadingTeam ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredTeamConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">{t("communications.noConversations")}</p>
                        <Button 
                          variant="link" 
                          className="text-primary mt-2"
                          onClick={() => setNewMessageModalOpen(true)}
                        >
                          {t("communications.startNewConversation")}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredTeamConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation === conv.id
                                ? "bg-primary-light"
                                : "hover:bg-accent/50"
                            }`}
                            onClick={() => handleSelectConversation(conv.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">
                                {conv.staff?.name || "Team Member"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {conv.last_message_at 
                                  ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: dateLocale })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {getConversationPreviewText(conv.last_message) || t("communications.noMessages")}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {conv.unread && (
                                <Badge variant="default" className="text-xs">
                                  {t("communications.new")}
                                </Badge>
                              )}
                              {conv.favorite && (
                                <Star className="w-3 h-3 fill-warning text-warning" />
                              )}
                              {conv.staff?.team && (
                                <Badge variant="outline" className="text-xs">
                                  Team {conv.staff.team}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-border/80 p-4">
                <h3 className="font-semibold text-foreground">
                  {selectedConversationName}
                </h3>
                
                {selectedConversationData && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Conversation actions">
                        <Menu className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border border-border">
                      <DropdownMenuItem 
                        onClick={handleDeleteConversation} 
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("communications.deleteConversation")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Chat Content */}
              {selectedConversation ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      {t("communications.noMessagesYet")}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const parsed = parseMessageContentForAttachments(msg.content);

                      const directAttachments: AttachmentRef[] = msg.attachment_url
                        ? [
                            {
                              url: msg.attachment_url,
                              fileName: getFileNameFromAttachmentUrl(msg.attachment_url),
                              isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_url),
                            },
                          ]
                        : [];

                      const allAttachments = [...directAttachments, ...parsed.attachments].reduce<AttachmentRef[]>(
                        (acc, att) => {
                          if (!att.url) return acc;
                          if (acc.some((a) => a.url === att.url)) return acc;
                          acc.push(att);
                          return acc;
                        },
                        []
                      );

                      const displayText = msg.content === "📎 Attachment" ? "" : parsed.cleanText;
                      const shouldShowText = !!displayText && displayText.trim().length > 0;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3 sm:max-w-[70%] ${
                              msg.sender_type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {allAttachments.length > 0 && (
                              <div className="mb-2 space-y-2">
                                {allAttachments.map((att, idx) =>
                                  att.isImage ? (
                                    <img
                                      key={`${att.url}-${idx}`}
                                      src={att.url}
                                      alt={att.fileName}
                                      className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                                      onClick={() => window.open(att.url, "_blank")}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <a
                                      key={`${att.url}-${idx}`}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm underline hover:opacity-80"
                                      title={att.fileName}
                                    >
                                      <Paperclip className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate max-w-[200px]">{att.fileName}</span>
                                    </a>
                                  )
                                )}
                              </div>
                            )}

                            {shouldShowText && (
                              <p className="text-sm whitespace-pre-wrap">{displayText}</p>
                            )}
 
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: dateLocale })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t("communications.selectConversation")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("communications.chooseOrStart")}
                  </p>
                  <Button 
                    variant="hero" 
                    className="flex items-center gap-2"
                    onClick={() => setNewMessageModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t("communications.newMessage")}</span>
                  </Button>
                </div>
              )}

              {/* Message Input Area */}
              <div className="border-t border-border/80 bg-card p-3 sm:p-4">
                {/* Attachment Preview */}
                {attachmentFile && (
                  <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-3">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
                        <Paperclip className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachmentFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachmentFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearAttachment}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-card border border-border" side="top" align="start">
                      <div className="grid grid-cols-8 gap-1">
                        {["😀", "😊", "😍", "🥰", "😎", "🤗", "😂", "🤣", "👍", "👏", "🙏", "💪", "❤️", "🔥", "⭐", "✨", "🎉", "🎊", "💯", "✅", "👋", "🤝", "💼", "🏠"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="p-1 text-xl hover:bg-muted rounded cursor-pointer"
                            onClick={() => setMessageText((prev) => prev + emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <div className="flex-1 relative">
                    <Input
                      placeholder={t("communications.typeMessage")}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="pr-16"
                      disabled={!selectedConversation}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {messageText.length}/160
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAttachFile}
                    className={`text-muted-foreground hover:text-foreground ${attachmentFile ? 'text-primary' : ''}`}
                    disabled={!selectedConversation}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="hero"
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !attachmentFile) || !selectedConversation || sendMessageMutation.isPending || isUploading}
                    className="rounded-xl"
                  >
                    {sendMessageMutation.isPending || isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
      </div>
      {/* Broadcast Modal */}
      <BroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        customers={customers}
      />
      {/* New Message Modal */}
      <NewMessageModal
        open={newMessageModalOpen}
        onOpenChange={setNewMessageModalOpen}
        customers={customers}
        onConversationCreated={(id) => setSelectedConversation(id)}
      />
    </PageLayout>
  );
}
