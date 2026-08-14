import fs from "node:fs";

const file = "apps/web/src/modules/crm/customers/components/CustomerDetailsModal.tsx";
let source = fs.readFileSync(file, "utf8");

const anchor = 'import { CustomerDetailsHeader, CustomerDetailsTabsList } from "./CustomerDetailsChrome";';
if (!source.includes(anchor)) throw new Error('Customer details chrome import missing');
source = source.replace(anchor, `${anchor}\nimport { CustomerChatTab } from "./CustomerChatTab";`);

const typeStart = source.indexOf('interface ChatMessage {');
const nextType = source.indexOf('interface AdditionalNote {', typeStart);
if (typeStart < 0 || nextType < 0) throw new Error('ChatMessage type block missing');
source = source.slice(0, typeStart) + source.slice(nextType);

const stateStart = source.indexOf('  const [newMessage, setNewMessage] = useState("");');
const nextState = source.indexOf('  const [additionalNotesExpanded', stateStart);
if (stateStart < 0 || nextState < 0) throw new Error('Customer chat state block missing');
source = source.slice(0, stateStart) + source.slice(nextState);

const handlerStart = source.indexOf('  const handleSendMessage = () => {');
const nullGuard = source.indexOf('  if (!customer) return null;', handlerStart);
if (handlerStart < 0 || nullGuard < 0) throw new Error('Customer chat handler block missing');
source = source.slice(0, handlerStart) + source.slice(nullGuard);

const chatStart = source.indexOf('          {/* Chat History Tab */}');
const contractStart = source.indexOf('          {/* Contract Tab */}', chatStart);
if (chatStart < 0 || contractStart < 0) throw new Error('Customer chat tab markup missing');
source = source.slice(0, chatStart) + '          <CustomerChatTab />\n\n' + source.slice(contractStart);

if (source.includes('handleSendMessage')) throw new Error('Customer chat handler remains in parent');
if (source.includes('chatMessages')) throw new Error('Customer chat state remains in parent');
if (!source.includes('<CustomerChatTab />')) throw new Error('Customer chat component not wired');

fs.writeFileSync(file, source);
