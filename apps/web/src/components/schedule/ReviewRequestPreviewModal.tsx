import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Star, MessageSquare } from "lucide-react";

interface ReviewRequestPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  customerName: string;
  companyName: string;
  googleReviewUrl?: string;
  nextdoorReviewUrl?: string;
  isSending?: boolean;
}

export function ReviewRequestPreviewModal({
  open,
  onClose,
  onSend,
  customerName,
  companyName,
  googleReviewUrl,
  nextdoorReviewUrl,
  isSending = false,
}: ReviewRequestPreviewModalProps) {
  const [message, setMessage] = useState("");
  const [includeGoogle, setIncludeGoogle] = useState(true);
  const [includeNextdoor, setIncludeNextdoor] = useState(true);

  // Generate message based on selected review links
  const generateMessage = useCallback((google: boolean, nextdoor: boolean) => {
    const reviewLinks: string[] = [];
    if (google && googleReviewUrl) {
      reviewLinks.push(`🌟Google Review: ${googleReviewUrl}`);
    }
    if (nextdoor && nextdoorReviewUrl) {
      reviewLinks.push(`🌟Nextdoor Review: ${nextdoorReviewUrl}`);
    }
    const reviewLinksText = reviewLinks.length > 0 
      ? reviewLinks.join("\n\n") 
      : "It really helps our small business. Thank you!";

    return `Hi ${customerName}! Thank you for choosing ${companyName}. We'd love to hear your feedback! Could you take a moment to leave us a review?\n\n${reviewLinksText}\n\n- ${companyName}`;
  }, [companyName, customerName, googleReviewUrl, nextdoorReviewUrl]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      const hasGoogle = !!googleReviewUrl;
      const hasNextdoor = !!nextdoorReviewUrl;
      setIncludeGoogle(hasGoogle);
      setIncludeNextdoor(hasNextdoor);
      setMessage(generateMessage(hasGoogle, hasNextdoor));
    }
  }, [open, googleReviewUrl, nextdoorReviewUrl, generateMessage]);

  // Update message when checkboxes change
  useEffect(() => {
    if (open) {
      setMessage(generateMessage(includeGoogle, includeNextdoor));
    }
  }, [includeGoogle, includeNextdoor, open, generateMessage]);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
    }
  };

  const hasAnyLink = googleReviewUrl || nextdoorReviewUrl;
  const hasSelectedLink = (includeGoogle && googleReviewUrl) || (includeNextdoor && nextdoorReviewUrl);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Preview Review Request
          </DialogTitle>
          <DialogDescription>
            Select which review links to include and customize the message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Review Link Selection */}
          {hasAnyLink && (
            <div className="space-y-3">
              <Label>Include Review Links</Label>
              <div className="space-y-2">
                {googleReviewUrl && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="google-review" 
                      checked={includeGoogle}
                      onCheckedChange={(checked) => setIncludeGoogle(checked === true)}
                    />
                    <label 
                      htmlFor="google-review" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <span className="text-lg">🌐</span>
                      Google Review
                    </label>
                  </div>
                )}
                {nextdoorReviewUrl && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="nextdoor-review" 
                      checked={includeNextdoor}
                      onCheckedChange={(checked) => setIncludeNextdoor(checked === true)}
                    />
                    <label 
                      htmlFor="nextdoor-review" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <span className="text-lg">🏡</span>
                      Nextdoor Review
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
              placeholder="Enter your review request message..."
            />
          </div>

          <div className="rounded-lg bg-muted p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Message Preview
            </p>
            <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap border">
              {message || <span className="text-muted-foreground italic">No message</span>}
            </div>
          </div>

          {!hasAnyLink && (
            <p className="text-xs text-warning flex items-center gap-1">
              ⚠️ No review links configured. Add them in Settings → Company → Review Links.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || isSending || (hasAnyLink && !hasSelectedLink)}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Review Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
