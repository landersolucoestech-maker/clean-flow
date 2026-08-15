import { T } from "@/shared/components/i18n/T";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Send } from "lucide-react";

interface ChatMessage {
  id: number;
  sender: "customer" | "business";
  message: string;
  timestamp: string;
}

export function CustomerChatTab() {
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    setChatMessages((messages) => [
      ...messages,
      {
        id: messages.length + 1,
        sender: "business",
        message: newMessage,
        timestamp: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      },
    ]);
    setNewMessage("");
  };

  return (
    <TabsContent value="chat" className="mt-4">
      <div className="flex flex-col h-[350px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2">
          {chatMessages.length > 0 ? (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "business" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    message.sender === "business" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "business" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground"><T k="support.no_messages" /></p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon" aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </TabsContent>
  );
}
