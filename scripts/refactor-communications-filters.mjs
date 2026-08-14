import fs from "node:fs";

const file = "apps/web/src/modules/communications/CommunicationsPage.tsx";
let source = fs.readFileSync(file, "utf8");

const anchor = 'import type { AttachmentRef } from "./utils/messageContent";';
if (!source.includes(anchor)) throw new Error('Communications attachment type import missing');
source = source.replace(
  anchor,
  `${anchor}\nimport { buildCustomerStatusById, filterCustomerConversations, filterTeamConversations } from "./utils/conversationFilters";\nimport type { ConversationFilter, CustomerStatusFilter, TeamStatusFilter } from "./utils/conversationFilters";`,
);

source = source.replace('type FilterType = "all" | "unread" | "favorites";\ntype CustomerStatusFilter = "all" | "active" | "inactive";\ntype TeamFilter = "all" | "active" | "inactive";\n', '');
source = source.replaceAll('useState<FilterType>', 'useState<ConversationFilter>');
source = source.replaceAll('useState<TeamFilter>', 'useState<TeamStatusFilter>');
source = source.replaceAll('value as TeamFilter', 'value as TeamStatusFilter');

const filterStart = source.indexOf('  // Create staff status map for filtering');
const selectedStart = source.indexOf('  // Find selected conversation in either customer or team conversations', filterStart);
if (filterStart < 0 || selectedStart < 0) throw new Error('Communications filter block missing');

const replacement = `  const filteredTeamConversations = filterTeamConversations(\n    teamConversations,\n    staff,\n    teamSearch,\n    teamFilter,\n    teamActiveFilter,\n  );\n  const customerStatusById = buildCustomerStatusById(customers);\n  const filteredConversations = filterCustomerConversations(\n    conversations,\n    customers,\n    conversationSearch,\n    customerStatusFilter,\n    activeFilter,\n  );\n\n`;
source = source.slice(0, filterStart) + replacement + source.slice(selectedStart);
source = source.replaceAll('customerStatusMap.get(', 'customerStatusById.get(');

if (/const\s+staffStatusMap\s*=/.test(source)) throw new Error('Inline staff filter map remains');
if (/const\s+customerStatusMap\s*=/.test(source)) throw new Error('Inline customer filter map remains');
if (source.includes('as TeamFilter')) throw new Error('Old TeamFilter cast remains');
if (!source.includes('filterCustomerConversations(')) throw new Error('Customer filter helper not wired');
if (!source.includes('filterTeamConversations(')) throw new Error('Team filter helper not wired');
if (!source.includes('customerStatusById.get(')) throw new Error('Customer status display map not wired');

fs.writeFileSync(file, source);
