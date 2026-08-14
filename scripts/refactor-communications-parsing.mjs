import fs from "node:fs";

const file = "apps/web/src/modules/communications/CommunicationsPage.tsx";
let source = fs.readFileSync(file, "utf8");

const importAnchor = 'import { uploadMessageAttachment } from "./services/messageAttachmentService";';
if (!source.includes(importAnchor)) throw new Error("Message attachment service import missing");
source = source.replace(
  importAnchor,
  `${importAnchor}\nimport { getConversationPreviewText, getFileNameFromAttachmentUrl, parseMessageContentForAttachments } from "./utils/messageContent";`,
);

const start = source.indexOf("type AttachmentRef =");
const end = source.indexOf("export function Communications()", start);
if (start < 0 || end < 0) throw new Error("Communication parsing block not found");
source = source.slice(0, start) + source.slice(end);

if (source.includes("STORAGE_ATTACHMENT_URL_RE")) throw new Error("Attachment parser implementation remains in page");
if (!source.includes("getConversationPreviewText")) throw new Error("Conversation preview helper not imported");

fs.writeFileSync(file, source);
