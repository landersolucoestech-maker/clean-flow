import fs from "node:fs";

const file = "apps/web/src/modules/communications/CommunicationsPage.tsx";
let src = fs.readFileSync(file, "utf8");

const supabaseImport = 'import { supabase } from "@/integrations/supabase/client";\n';
if (!src.includes(supabaseImport)) throw new Error("Communications Supabase import missing");
src = src.replace(supabaseImport, "");

const anchor = 'import { useNotificationSound } from "@/hooks/useNotificationSound";';
if (!src.includes(anchor)) throw new Error("Communications import anchor missing");
src = src.replace(anchor, `${anchor}\nimport { uploadMessageAttachment } from "./services/messageAttachmentService";`);

const uploadStart = src.indexOf("        // Sanitize filename: remove special chars but keep extension");
const uploadEnd = src.indexOf("        attachmentUrl = publicUrl.publicUrl;", uploadStart);
if (uploadStart < 0 || uploadEnd < 0) throw new Error("Communications attachment upload block missing");
const uploadEndLine = src.indexOf("\n", uploadEnd);
const replacement = `        attachmentUrl = await uploadMessageAttachment(selectedConversation, attachmentFile);`;
src = src.slice(0, uploadStart) + replacement + src.slice(uploadEndLine);

src = src.replace("    } catch (error) {\n      console.error('Upload error:', error);\n      toast.error(\"Failed to upload attachment\");", "    } catch {\n      toast.error(\"Failed to upload attachment\");");

if (/\bsupabase\./.test(src)) throw new Error("Direct Supabase access remains in CommunicationsPage");
if (/console\.(log|debug|trace)\s*\(/.test(src)) throw new Error("Debug log remains in CommunicationsPage");

fs.writeFileSync(file, src);
