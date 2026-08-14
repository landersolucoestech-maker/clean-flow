import type { Conversation } from "../hooks/useConversations";

export type ConversationFilter = "all" | "unread" | "favorites";
export type CustomerStatusFilter = "all" | "active" | "inactive";
export type TeamStatusFilter = "all" | "active" | "inactive";

interface CustomerStatusRecord {
  id: string;
  status?: string | null;
}

interface StaffStatusRecord {
  id: string;
  is_active?: boolean | null;
}

export function buildCustomerStatusById(customers: CustomerStatusRecord[]): Map<string, string> {
  return new Map(
    customers.map((customer) => [customer.id, customer.status?.toLowerCase() || "unknown"]),
  );
}

export function filterCustomerConversations(
  conversations: Conversation[],
  customers: CustomerStatusRecord[],
  search: string,
  statusFilter: CustomerStatusFilter,
  activeFilter: ConversationFilter,
): Conversation[] {
  const statusByCustomer = buildCustomerStatusById(customers);
  const normalizedSearch = search.toLowerCase();

  return conversations.filter((conversation) => {
    const matchesSearch = (conversation.customer?.name || "").toLowerCase().includes(normalizedSearch);
    const status = conversation.customer_id
      ? statusByCustomer.get(conversation.customer_id) || "unknown"
      : "unknown";
    const matchesStatus = statusFilter === "all" || statusFilter === status;

    if (activeFilter === "unread") return matchesSearch && matchesStatus && conversation.unread;
    if (activeFilter === "favorites") return matchesSearch && matchesStatus && conversation.favorite;
    return matchesSearch && matchesStatus;
  });
}

export function filterTeamConversations(
  conversations: Conversation[],
  staff: StaffStatusRecord[],
  search: string,
  teamFilter: TeamStatusFilter,
  activeFilter: ConversationFilter,
): Conversation[] {
  const statusByStaff = new Map(staff.map((member) => [member.id, Boolean(member.is_active)]));
  const normalizedSearch = search.toLowerCase();

  return conversations.filter((conversation) => {
    const matchesSearch = (conversation.staff?.name || "").toLowerCase().includes(normalizedSearch);
    const isActive = conversation.staff_id ? statusByStaff.get(conversation.staff_id) : undefined;
    const matchesStatus =
      teamFilter === "all" ||
      (teamFilter === "active" && isActive) ||
      (teamFilter === "inactive" && !isActive);

    if (activeFilter === "unread") return matchesSearch && matchesStatus && conversation.unread;
    if (activeFilter === "favorites") return matchesSearch && matchesStatus && conversation.favorite;
    return matchesSearch && matchesStatus;
  });
}
