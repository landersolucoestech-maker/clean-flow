export interface AttachmentRef {
  url: string;
  fileName: string;
  isImage: boolean;
}

const STORAGE_ATTACHMENT_URL_RE =
  /https?:\/\/[^\s]+\/storage\/v1\/object\/public\/(?:message-attachments|broadcast-attachments)\/[^\s]+/gi;

function normalizeAttachmentUrl(raw: string): string {
  return raw.replace(/[),.]+$/, "");
}

export function getFileNameFromAttachmentUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const rawName = parts[parts.length - 1] || "documento";
    const decoded = decodeURIComponent(rawName);
    const withoutTimestampPrefix = decoded.replace(/^\d{13,}_/, "");

    if (/^\d{13,}\./.test(withoutTimestampPrefix)) {
      const extension = withoutTimestampPrefix.split(".").pop() || "";
      return extension ? `documento.${extension}` : "documento";
    }

    return withoutTimestampPrefix || decoded || "documento";
  } catch {
    return "documento";
  }
}

export function parseMessageContentForAttachments(content?: string | null): {
  cleanText: string;
  attachments: AttachmentRef[];
} {
  const text = (content || "").trim();
  if (!text) return { cleanText: "", attachments: [] };

  const rawMatches = text.match(STORAGE_ATTACHMENT_URL_RE) || [];
  const attachments = rawMatches
    .map(normalizeAttachmentUrl)
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

export function getConversationPreviewText(text?: string | null): string | null {
  if (!text) return null;
  const parsed = parseMessageContentForAttachments(text);
  return parsed.attachments.length > 0 ? parsed.cleanText || parsed.attachments[0].fileName : text;
}
